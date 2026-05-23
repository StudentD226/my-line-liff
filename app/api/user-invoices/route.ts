import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');

    if (!lineId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ lineId' }, { status: 400 });
    }

    // 1. ค้นหาผู้ใช้งานและดึงข้อมูลบ้านพ่วงบิลค้างทั้งหมดรวม REJECTED เข้ามาด้วย
    const user = await prisma.user.findUnique({
      where: { lineId },
      include: {
        residentHouse: {
          include: {
            invoices: {
              orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
            }
          }
        }
      }
    });

    if (!user || !user.residentHouse) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้านของท่าน กรุณาลงทะเบียนก่อนครับ' }, { status: 404 });
    }

    const house = user.residentHouse;
    const config = await prisma.systemConfig.findFirst();
    
    // 🌟 ดึงเรทค่าปรับเหมาจ่ายรายเดือนจากระบบส่วนกลาง (ถ้าไม่มีใช้ 100 บาท)
    let flatPenaltyPerMonth = config?.penaltyRatePerDay || 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalUnpaid = 0;

    // 🌟 2. วนลูปคำนวณปรับโครงสร้างยอดเงินและค่าปรับใหม่แบบเหมาจ่ายรายเดือนให้ตรงกันทั้งระบบ
    const updatedInvoices = house.invoices.map((inv) => {
      let base = Number(inv.baseAmount || 0);
      let penalty = Number(inv.penaltyAmount || 0);

      // ถ้าเป็นบิลค้างชำระ ให้ทำการ Re-calculate ค่าปรับใหม่เรียลไทม์
      if (['PENDING', 'OVERDUE', 'REJECTED'].includes(inv.status)) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const overdueMonths = Math.floor(overdueDays / 30);
          
          penalty = overdueMonths * flatPenaltyPerMonth;
          inv.status = 'OVERDUE';
        }
        // สมทบยอดรวมก้อนใหญ่ชำระจริงบนหน้าแอป LIFF
        totalUnpaid += (base + penalty);
      }

      return {
        ...inv,
        penaltyAmount: penalty,
        totalAmount: base + penalty,
        status: inv.status
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: user.name,
          residentHouse: {
            houseNo: house.houseNo
          }
        },
        invoices: updatedInvoices,
        totalUnpaid, // ส่งยอดรวมเหมาจ่ายแบบกลมๆ ไปอัปเดตบนหน้า UI วงกลม
        penaltyRate: flatPenaltyPerMonth
      }
    });

  } catch (error) {
    console.error("❌ User Invoices API Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
