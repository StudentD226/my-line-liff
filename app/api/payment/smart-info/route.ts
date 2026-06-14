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
                status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] },
                invoiceNo: { not: { startsWith: 'TR-' } }, // ซ่อนสลิปรอเช็ก TR-
                billingYear: { not: 9999 } 
              },
              orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
            }
          }
        } 
      }
    });

    if (!user?.residentHouse) return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้าน' }, { status: 404 });

    const config = await prisma.systemConfig.findFirst();
    const penaltyRate = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);

    const house = user.residentHouse;
    let totalBase = 0;
    let totalFine = 0;
    
    // 🌟 ตัวแปรใหม่สำหรับนับจำนวนเดือนที่ค้าง และเก็บเลขบิล
    let overdueCount = 0;
    let oldestInvoiceNo = 'INV-000';

    house.invoices.forEach(inv => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
      dueDate.setHours(0, 0, 0, 0);

      const base = truncateDecimals(Number(inv.baseAmount || 0));
      let penalty = truncateDecimals(Number(inv.penaltyAmount || 0)); 
      const currentPaid = truncateDecimals(Number(inv.paidAmount || 0));

      if (today > dueDate) {
        if (penalty === 0) {
          let monthsLate = (today.getFullYear() - dueDate.getFullYear()) * 12 + (today.getMonth() - dueDate.getMonth());
          if (monthsLate <= 0) monthsLate = 1; 
          penalty = truncateDecimals(monthsLate * penaltyRate);
        }
      } else {
        if (inv.status !== 'REJECTED' && inv.status !== 'PARTIAL') penalty = 0;
      }

      const currentTotal = truncateDecimals(base + penalty);
      const actualDebt = truncateDecimals(currentTotal - currentPaid);

      if (actualDebt > 0) {
        let remainingBase = base;
        let remainingPenalty = penalty;

        if (currentPaid > 0) {
          if (currentPaid >= penalty) {
            remainingBase = truncateDecimals(base - (currentPaid - penalty));
            remainingPenalty = 0;
          } else {
            remainingPenalty = truncateDecimals(penalty - currentPaid);
          }
        }

        totalBase += remainingBase;
        totalFine += remainingPenalty;
        
        // 🌟 ถ้ายอดหนี้เหลือ และเลยกำหนด ให้บวกจำนวนเดือนที่ค้าง
        if (today > dueDate) {
          overdueCount++;
        }
        
        // 🌟 เก็บเลขบิลของอันที่เก่าที่สุดไว้ให้หน้าบ้านใช้งาน
        if (oldestInvoiceNo === 'INV-000') {
          oldestInvoiceNo = inv.invoiceNo;
        }
      }
    });

    return NextResponse.json({
      success: true,
      houseData: {
        houseNo: house.houseNo,
        monthlyRate: house.feeRate ? truncateDecimals(Number(house.feeRate)) : 1000,
        outstandingBalance: truncateDecimals(totalBase),
        fineAmount: truncateDecimals(totalFine),
        totalToPay: truncateDecimals(totalBase + totalFine),
        // 🌟 ส่งค่าไปให้หน้าบ้านโชว์แถบสีแดง
        overdueMonthsText: overdueCount > 0 ? `ค้างชำระ ${overdueCount} รอบบิล` : '',
        refInvoiceNo: oldestInvoiceNo
      }
    });
  } catch (error) {
    console.error("Smart Info Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}