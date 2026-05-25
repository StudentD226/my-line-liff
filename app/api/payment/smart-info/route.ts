export const dynamic = 'force-dynamic'; // 🌟 ดึงข้อมูลเรียลไทม์ ห้ามจำ!
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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
              where: { 
                status: { in: ['PENDING', 'OVERDUE'] }, // 🌟 ดึงเฉพาะบิลหนี้
                invoiceNo: { not: { startsWith: 'TR-' } } // 🌟 ซ่อนบิลสลิป (TR-) ไม่ให้เอามาโชว์เป็นหนี้
              },
              orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
            }
          }
        } 
      }
    });

    if (!user?.residentHouse) return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้าน' }, { status: 404 });

    const house = user.residentHouse;
    let totalBase = 0;
    let totalFine = 0;
    
    // 🌟 แค่บวกเลขตรงๆ เลย เพราะเราลดยอดจากฝั่งแอดมินให้แล้ว ง่ายและชัวร์!
    house.invoices.forEach(inv => {
      totalBase += truncateDecimals(Number(inv.baseAmount || 0));
      totalFine += truncateDecimals(Number(inv.penaltyAmount || 0));
    });

    return NextResponse.json({
      success: true,
      houseData: {
        houseNo: house.houseNo,
        monthlyRate: house.feeRate ? truncateDecimals(Number(house.feeRate)) : 1000,
        outstandingBalance: truncateDecimals(totalBase),
        fineAmount: truncateDecimals(totalFine),
        totalToPay: truncateDecimals(totalBase + totalFine) 
      }
    });
  } catch (error) {
    console.error("Smart Info Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}