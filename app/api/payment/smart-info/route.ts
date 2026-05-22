import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');

    if (!lineId) return NextResponse.json({ success: false, error: 'ไม่พบ lineId' }, { status: 400 });

    // 🌟 [แก้ไขจุดสำคัญที่ 1] สั่ง include invoices ซ้อนเข้าไปในตารางบ้าน
    const user = await prisma.user.findUnique({
      where: { lineId },
      include: { 
        residentHouse: {
          include: {
            invoices: {
              where: { status: { in: ['PENDING', 'OVERDUE', 'REJECTED'] } },
              orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
            }
          }
        } 
      }
    });

    if (!user?.residentHouse) return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้าน' }, { status: 404 });

    const house = user.residentHouse;
    
    // 🌟 [แก้ไขจุดสำคัญที่ 2] เรียกใช้งานข้อมูลบิลที่รวมกลุ่ม REJECTED เข้ามาตรวจเช็คเรียบร้อยแล้ว
    const pendingInvoices = house.invoices;

    const config = await prisma.systemConfig.findFirst();
    const penaltyRatePerDay = config?.penaltyRatePerDay || 100; // 🌟 เปลี่ยนเป็นเรทค่าปรับรายวัน

    let baseTotal = 0;
    let totalFine = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 🌟 เทียบเวลาที่เที่ยงคืนตรง

    pendingInvoices.forEach(inv => {
      const baseAmt = truncateDecimals(Number(inv.baseAmount));
      baseTotal += baseAmt;

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0); // 🌟 เทียบเวลาที่เที่ยงคืนตรง

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // 🌟 นับเป็นวันเต็มๆ

        if (overdueDays > 0) {
          const fine = truncateDecimals(overdueDays * penaltyRatePerDay); // 🌟 คำนวณรายวัน
          totalFine += fine;
        }
      }
    });

    // 🌟 หุ้มตัวแปรสุดท้ายด้วย truncateDecimals อีกชั้นเพื่อความชัวร์
    baseTotal = truncateDecimals(baseTotal);
    totalFine = truncateDecimals(totalFine);

    return NextResponse.json({
      success: true,
      houseData: {
        houseNo: house.houseNo,
        monthlyRate: house.feeRate ? truncateDecimals(Number(house.feeRate)) : 1000,
        outstandingBalance: baseTotal,
        fineAmount: totalFine,
        totalToPay: truncateDecimals(baseTotal + totalFine) // 🌟 ยอดรวมสุทธิเป๊ะๆ
      }
    });
  } catch (error) {
    console.error("Smart Info Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
