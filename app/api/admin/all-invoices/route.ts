import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        house: true, // ดึงเลขที่บ้านมาโชว์
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}