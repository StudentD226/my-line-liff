import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const houses = await prisma.house.findMany({
      select: {
        id: true,
        houseNo: true,
      },
      orderBy: { houseNo: 'asc' },
    });

    // เรียงลำดับเลขที่บ้านแบบเป็นธรรมชาติ (Natural alphanumeric sort) เช่น 1, 2, 10 แทนที่จะเป็น 1, 10, 2
    houses.sort((a, b) =>
      a.houseNo.localeCompare(b.houseNo, undefined, { numeric: true, sensitivity: 'base' })
    );

    return NextResponse.json({ success: true, houses });
  } catch (error) {
    console.error('Error fetching houses list:', error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลบ้านไม่สำเร็จ' }, { status: 500 });
  }
}
