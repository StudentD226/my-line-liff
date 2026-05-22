import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { invoiceId, baseAmount, penaltyAmount } = await request.json();
    
    // แปลงเป็น Number ป้องกันเลขกลายเป็น String ต่อกัน
    const numBase = Number(baseAmount) || 0;
    const numPenalty = Number(penaltyAmount) || 0;
    const total = numBase + numPenalty;

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        baseAmount: numBase,
        penaltyAmount: numPenalty,
        totalAmount: total
      }
    });

    return NextResponse.json({ success: true, total: updated.totalAmount });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Update Failed' }, { status: 500 });
  }
}