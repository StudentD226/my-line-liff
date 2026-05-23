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
    const pendingInvoices = house.invoices;

    const config = await prisma.systemConfig.findFirst();
    const flatPenaltyPerMonth = config?.penaltyRatePerDay || 100; 

    let baseTotal = 0;
    let totalFine = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    pendingInvoices.forEach(inv => {
      const baseAmt = truncateDecimals(Number(inv.baseAmount));
      baseTotal += baseAmt;

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0); 

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        
        // 🌟 คำนวณค่าปรับแบบเหมาเดือน ปัดเศษทิ้ง (ไม่ถึง 30 วันไม่คิด)
        const overdueMonths = Math.floor(overdueDays / 30);

        if (overdueMonths > 0) {
          const fine = truncateDecimals(overdueMonths * flatPenaltyPerMonth); 
          totalFine += fine;
        }
      }
    });

    baseTotal = truncateDecimals(baseTotal);
    totalFine = truncateDecimals(totalFine);

    return NextResponse.json({
      success: true,
      houseData: {
        houseNo: house.houseNo,
        monthlyRate: house.feeRate ? truncateDecimals(Number(house.feeRate)) : 1000,
        outstandingBalance: baseTotal,
        fineAmount: totalFine,
        totalToPay: truncateDecimals(baseTotal + totalFine) 
      }
    });
  } catch (error) {
    console.error("Smart Info Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}