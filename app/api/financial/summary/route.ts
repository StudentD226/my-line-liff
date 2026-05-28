export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const shortThaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // ตั้งค่าเวลาดึงข้อมูล: 27 ธ.ค. ปีที่แล้ว ถึง 26 ธ.ค. ปีปัจจุบัน
    const startDate = new Date(year - 1, 11, 27, 0, 0, 0); 
    const endDate = new Date(year, 11, 26, 23, 59, 59, 999);

    // ดึงรายจ่าย-รายรับ (แอดมินคีย์)
    const manualTransactions = await prisma.financialTransaction.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });

    // ดึงบิลอัตโนมัติ (ระบบส่วนกลาง)
    const autoInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PAID', 'PARTIAL'] },
        invoiceNo: { not: { startsWith: 'TR-' } },
        OR: [
          { paidAt: { gte: startDate, lte: endDate } },
          { updatedAt: { gte: startDate, lte: endDate } }
        ]
      }
    });

    // สร้างข้อมูลตั้งต้น 12 เดือน
    const yearlyData = Array.from({ length: 12 }, (_, i) => ({
      name: shortThaiMonths[i],
      รายรับ: 0,
      รายจ่าย: 0
    }));

    // ฟังก์ชันช่วยหาว่าวันที่นี้ ตกอยู่รอบบิลเดือนไหน (0-11)
    const getBillingMonthIndex = (d: Date | string | null) => {
      if (!d) return -1;
      const dateObj = new Date(d);
      const m = dateObj.getMonth();
      const day = dateObj.getDate();
      
      let cycleMonth = day >= 27 ? m + 1 : m;
      if (cycleMonth > 11) cycleMonth = 0; // รอบ 27 ธ.ค. เป็นต้นไป จะปัดเป็น ม.ค.
      return cycleMonth;
    };

    // หยอดเงินรายได้-รายจ่าย ลงกล่องแต่ละเดือน
    manualTransactions.forEach(tx => {
      const idx = getBillingMonthIndex(tx.date);
      if (idx >= 0 && idx <= 11) {
        if (tx.type === 'INCOME') yearlyData[idx].รายรับ += tx.amount;
        if (tx.type === 'EXPENSE') yearlyData[idx].รายจ่าย += tx.amount;
      }
    });

    autoInvoices.forEach(inv => {
      const idx = getBillingMonthIndex(inv.paidAt || inv.updatedAt);
      if (idx >= 0 && idx <= 11) {
        const amt = inv.paidAmount > 0 ? inv.paidAmount : inv.baseAmount;
        yearlyData[idx].รายรับ += amt;
      }
    });

    return NextResponse.json({ success: true, data: yearlyData });
  } catch (error) {
    console.error('Summary API Error:', error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลสรุปรายปีล้มเหลว' }, { status: 500 });
  }
}