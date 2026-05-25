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
                status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] }, // ดึงหนี้ทุกประเภทที่ค้างอยู่
                invoiceNo: { not: { startsWith: 'TR-' } }, // ซ่อนสลิปรอเช็ก
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
    const flatPenaltyPerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);

    const house = user.residentHouse;
    let totalBase = 0;
    let totalFine = 0;
    
    // 🌟 ประมวลผลบิลแต่ละใบแบบสมาร์ท สอดคล้องกับ Logic ของฝั่งแอดมิน อัปเดตล่าสุด
    house.invoices.forEach(inv => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
      dueDate.setHours(0, 0, 0, 0);

      const base = truncateDecimals(Number(inv.baseAmount || 0));
      let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
      const currentPaid = truncateDecimals(Number(inv.paidAmount || 0));

      // 1. คำนวณค่าปรับล่าสุดแบบไดนามิกตามเวลาปัจจุบัน
      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const overdueMonths = Math.floor(overdueDays / 30); 
        penalty = truncateDecimals(overdueMonths * flatPenaltyPerMonth);
      } else {
        if (inv.status !== 'REJECTED' && inv.status !== 'PARTIAL') penalty = 0;
      }

      // 2. คำนวณยอดหนี้รวมสุทธิของบิลใบนี้ (Base + ค่าปรับล่าสุด)
      const currentTotal = truncateDecimals(base + penalty);
      const actualDebt = truncateDecimals(currentTotal - currentPaid);

      // 3. 🎯 จัดสรรยอดหนี้แยกประเภทส่งให้ LINE:
      //    ตัดจ่ายฝั่งค่าส่วนกลาง (Base) ก่อน ยอดเงินส่วนกลางหมดเกลี้ยงเมื่อไหร่ เศษหนี้ที่เหลืออยู่ถึงจะนับเป็นค่าปรับ (Fine)
      if (actualDebt > 0) {
        const remainingBase = Math.max(0, truncateDecimals(base - currentPaid));
        const remainingPenalty = truncateDecimals(actualDebt - remainingBase);

        totalBase += remainingBase;
        totalFine += remainingPenalty;
      }
    });

    return NextResponse.json({
      success: true,
      houseData: {
        houseNo: house.houseNo,
        monthlyRate: house.feeRate ? truncateDecimals(Number(house.feeRate)) : 1000,
        outstandingBalance: truncateDecimals(totalBase), // ยอดค้างค่าส่วนกลางแท้ๆ
        fineAmount: truncateDecimals(totalFine),         // ยอดค้างค่าปรับแท้ๆ
        totalToPay: truncateDecimals(totalBase + totalFine) 
      }
    });
  } catch (error) {
    console.error("Smart Info Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}