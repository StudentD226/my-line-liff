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

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (houseId) {
      whereClause.residentHouseId = parseInt(houseId);
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
    let penaltyRatePerDay = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedInvoices = invoices.map((inv) => {
      let base = truncateDecimals(Number(inv.baseAmount || 0));
      let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
      let currentStatus = inv.status;

      if (['PENDING', 'OVERDUE', 'REJECTED'].includes(currentStatus)) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
          
          penalty = truncateDecimals(overdueDays * penaltyRatePerDay); 
          currentStatus = 'OVERDUE';
        } else {
          if (currentStatus !== 'REJECTED') {
            penalty = 0;
          }
        }
      }

      return {
        ...inv,
        penaltyAmount: penalty,
        totalAmount: truncateDecimals(base + penalty),
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