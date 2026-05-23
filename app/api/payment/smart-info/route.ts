import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');

    if (!lineId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ lineId' }, { status: 400 });
    }

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

    if (!user?.residentHouse) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้าน' }, { status: 404 });
    }

    const house = user.residentHouse;
    const pendingInvoices = house.invoices;

    let baseTotal = 0;
    let totalFine = 0;
    
    // 🌟 ดึงค่าปรับที่ถูกคำนวณไว้ใน Database มาบวกตรงๆ ไม่ต้องคำนวณใหม่หน้าเว็บ
    pendingInvoices.forEach(inv => {
      const baseAmt = truncateDecimals(Number(inv.baseAmount || 0));
      const penaltyAmt = truncateDecimals(Number(inv.penaltyAmount || 0));

      baseTotal += baseAmt;
      totalFine += penaltyAmt;
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