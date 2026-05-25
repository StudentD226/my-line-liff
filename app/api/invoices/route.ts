import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🌟 Helper ตัดทศนิยมทิ้ง
const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const houseId = searchParams.get('houseId');

    const whereClause: any = {
      // 🌟 ซ่อนบิลพักยอด (บิลใบเสร็จตอนโอนเงิน) ออกจากตารางจัดการบิลหลัก
      billingYear: { not: 9999 } 
    };
    
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (houseId) {
      // 🌟 แก้จาก parseInt(houseId) เป็น houseId ตรงๆ เพราะ id บ้านใน schema เป็น String (cuid)
      whereClause.residentHouseId = houseId; 
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        house: true,
      },
      orderBy: [
        { billingYear: 'desc' },
        { billingMonth: 'desc' },
      ],
    });

    const config = await prisma.systemConfig.findFirst();
    let penaltyRatePerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedInvoices = invoices.map((inv) => {
      let base = truncateDecimals(Number(inv.baseAmount || 0));
      let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
      let paid = truncateDecimals(Number(inv.paidAmount || 0)); // 🌟 ดึงยอดที่ทยอยจ่ายมาแล้ว
      let currentStatus = inv.status;

      // 🌟 รวมสถานะ PARTIAL เข้ามาให้คิดค่าปรับด้วย
      if (['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'].includes(currentStatus)) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
          const overdueMonths = Math.floor(overdueDays / 30); // 🌟 ใช้หลักการคิดค่าปรับแบบรายเดือนให้ตรงกัน
          
          penalty = truncateDecimals(overdueMonths * penaltyRatePerMonth); 
          currentStatus = currentStatus === 'PARTIAL' ? 'PARTIAL' : 'OVERDUE';
        } else {
          if (currentStatus !== 'REJECTED' && currentStatus !== 'PARTIAL') {
            penalty = 0;
          }
        }
      }

      // 🌟 คำนวณยอดสุทธิ (หักลบเงินที่จ่ายไปแล้ว)
      const remainingTotal = truncateDecimals((base + penalty) - paid);

      return {
        ...inv,
        penaltyAmount: penalty,
        totalAmount: remainingTotal > 0 ? remainingTotal : 0, // 👈 ส่งยอดคงเหลือสุทธิไปแสดงผล
        status: currentStatus
      };
    });

    return NextResponse.json({
      success: true,
      data: updatedInvoices,
    });

  } catch (error) {
    console.error("❌ Admin Invoices GET API Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบิล' }, { status: 500 });
  }
}