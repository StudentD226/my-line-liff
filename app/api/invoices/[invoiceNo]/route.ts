import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceNo: string }> } 
) {
  try {
    const { invoiceNo } = await params; 

    const invoice = await prisma.invoice.findUnique({
      where: { 
        id: invoiceNo 
      },
      include: {
        house: {
          include: {
            owner: true,
            residents: true 
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลบิลที่คุณระบุ' },
        { status: 404 }
      );
    }

    const config = await prisma.systemConfig.findFirst();
    const penaltyRatePerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;

    let base = truncateDecimals(Number(invoice.baseAmount || 0));
    let penalty = truncateDecimals(Number(invoice.penaltyAmount || 0));
    let paid = truncateDecimals(Number(invoice.paidAmount || 0)); // 🌟 ดึงยอดที่จ่ายไปแล้วมาด้วย
    let currentStatus = invoice.status;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🌟 คำนวณค่าปรับแบบรายเดือน (รวมสถานะ PARTIAL เข้ามาคิดด้วย)
    if (['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'].includes(currentStatus)) {
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const overdueMonths = Math.floor(overdueDays / 30);
        
        penalty = truncateDecimals(overdueMonths * penaltyRatePerMonth);
        currentStatus = currentStatus === 'PARTIAL' ? 'PARTIAL' : 'OVERDUE'; // ถ้าจ่ายบางส่วนแล้ว ก็คงสถานะ PARTIAL ไว้
      } else {
        if (currentStatus !== 'REJECTED' && currentStatus !== 'PARTIAL') {
          penalty = 0;
        }
      }
    }

    // 🌟 คำนวณยอดคงเหลือสุทธิ (เอา base + ค่าปรับ - ยอดที่เคยทยอยจ่าย)
    const remainingTotal = truncateDecimals((base + penalty) - paid);

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        penaltyAmount: penalty, 
        totalAmount: remainingTotal > 0 ? remainingTotal : 0, // 👈 ส่งยอด "คงเหลือ" ไปโชว์ให้ลูกบ้าน/แอดมินดู
        status: currentStatus,
        displayMonthYear: `${invoice.billingMonth}/${invoice.billingYear + 543}`
      }
    });

  } catch (error) {
    console.error("❌ Fetch Single Invoice Error:", error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}