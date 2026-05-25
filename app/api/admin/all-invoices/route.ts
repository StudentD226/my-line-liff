export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { house: true },
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }, { createdAt: 'desc' }]
    });

    // 🌟 ดึงข้อมูลมาโชว์เฉยๆ ห้ามไป .update() ในฐานข้อมูลเด็ดขาด!
    const mappedInvoices = invoices.map(inv => ({
      ...inv,
      // ถ้า PAID ให้โชว์ยอดเต็ม (base + penalty) ถ้ายังไม่ PAID ให้โชว์ยอดคงเหลือที่ต้องจ่ายจริง
      totalAmount: inv.status === 'PAID' 
        ? (Number(inv.baseAmount) + Number(inv.penaltyAmount)) 
        : (Number(inv.baseAmount) + Number(inv.penaltyAmount) - Number(inv.paidAmount || 0))
    }));

    return NextResponse.json({ success: true, invoices: mappedInvoices });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}