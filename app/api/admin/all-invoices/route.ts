export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET(request: Request) {
  try {
    // 🌟 1. ดึงบิลทั้งหมด แต่ "ซ่อน" บิลแจ้งโอน (TR-) ไม่ให้มาโชว์ในตารางแอดมินเด็ดขาด
    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceNo: { not: { startsWith: 'TR-' } }
      },
      include: { house: true },
      orderBy: [
        { billingYear: 'desc' },
        { billingMonth: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const config = await prisma.systemConfig.findFirst();
    const penaltyRatePerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedInvoices = invoices.map(inv => {
      let base = truncateDecimals(Number(inv.baseAmount || 0));
      let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
      let paid = truncateDecimals(Number(inv.paidAmount || 0));
      let currentStatus = inv.status;

      // 🌟 2. คำนวณค่าปรับสดๆ เหมือนที่ LINE ทำ!
      if (['PENDING', 'OVERDUE', 'PARTIAL'].includes(currentStatus)) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const overdueMonths = Math.floor(overdueDays / 30);
          penalty = truncateDecimals(overdueMonths * penaltyRatePerMonth);
          
          if (currentStatus !== 'PARTIAL') {
            currentStatus = 'OVERDUE';
          }
        } else {
          penalty = 0;
        }
      }

      // 🌟 3. คิดยอดคงเหลือที่ต้องจ่ายจริง
      const total = truncateDecimals(base + penalty);
      const outstanding = truncateDecimals(total - paid);

      // ส่งค่าใหม่ที่รวมค่าปรับแล้วกลับไปที่หน้าเว็บ
      return {
        ...inv,
        status: currentStatus,
        penaltyAmount: penalty,
        totalAmount: total, // ยอดเต็มรวมค่าปรับ
        outstanding: outstanding > 0 ? outstanding : 0 // ยอดค้างที่แท้จริง
      };
    });

    return NextResponse.json({ success: true, invoices: updatedInvoices });
  } catch (error) {
    console.error("Fetch All Invoices Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}