import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
              where: { 
                status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] },
                billingYear: { not: 9999 } // ซ่อนบิลพักยอด
              },
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

    let remainingBaseTotal = 0;
    let remainingFineTotal = 0;
    
    pendingInvoices.forEach(inv => {
      const paid = truncateDecimals(Number(inv.paidAmount || 0));
      let unpaidPenalty = truncateDecimals(Number(inv.penaltyAmount || 0));
      let unpaidBase = truncateDecimals(Number(inv.baseAmount || 0));

      if (paid > 0) {
        if (paid >= unpaidPenalty) {
          unpaidBase = truncateDecimals(unpaidBase - (paid - unpaidPenalty));
          unpaidPenalty = 0;
        } else {
          unpaidPenalty = truncateDecimals(unpaidPenalty - paid);
        }
      }

      if (unpaidBase > 0) remainingBaseTotal += unpaidBase;
      if (unpaidPenalty > 0) remainingFineTotal += unpaidPenalty;
    });

    remainingBaseTotal = truncateDecimals(remainingBaseTotal);
    remainingFineTotal = truncateDecimals(remainingFineTotal);

    return NextResponse.json({
      success: true,
      houseData: {
        houseNo: house.houseNo,
        monthlyRate: house.feeRate ? truncateDecimals(Number(house.feeRate)) : 1000,
        outstandingBalance: remainingBaseTotal,
        fineAmount: remainingFineTotal,
        totalToPay: truncateDecimals(remainingBaseTotal + remainingFineTotal) 
      }
    });
  } catch (error) {
    console.error("Smart Info Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}