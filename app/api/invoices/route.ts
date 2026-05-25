export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const houseId = searchParams.get('houseId');

    const whereClause: any = {
      // ซ่อนบิลแจ้งโอน (สลิป TR-) ไม่ให้มาปนในหน้านี้
      invoiceNo: { not: { startsWith: 'TR-' } } 
    };
    
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (houseId) {
      whereClause.residentHouseId = houseId; 
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: { house: true },
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
      let paid = truncateDecimals(Number(inv.paidAmount || 0));
      let currentStatus = inv.status;

      // 1. คำนวณค่าปรับ (Logic เดิม)
      if (['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'].includes(currentStatus)) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
          const overdueMonths = Math.floor(overdueDays / 30); 
          penalty = truncateDecimals(overdueMonths * penaltyRatePerMonth); 
          currentStatus = currentStatus === 'PARTIAL' ? 'PARTIAL' : 'OVERDUE';
        } else {
          if (currentStatus !== 'REJECTED' && currentStatus !== 'PARTIAL') penalty = 0;
        }
      }

      // 2. คำนวณแบบแยกฟิลด์ชัดเจน
      const fullTotal = truncateDecimals(base + penalty);      // ยอดรวมทั้งหมดของบิลนี้
      const outstanding = truncateDecimals(fullTotal - paid);  // ยอดที่เหลือต้องจ่าย

      return {
        ...inv,
        penaltyAmount: penalty,
        totalAmount: fullTotal,          // 🌟 ส่ง "ยอดเต็ม" เสมอ (ตารางจะโชว์เลขนี้เป็นหลัก)
        outstanding: outstanding > 0 ? outstanding : 0, // 🌟 ส่ง "ยอดค้าง" ไปให้หน้าบ้านเช็ค
        status: currentStatus
      };
    });

    return NextResponse.json({ success: true, data: updatedInvoices });

  } catch (error) {
    console.error("❌ Admin Invoices GET API Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบิล' }, { status: 500 });
  }
}