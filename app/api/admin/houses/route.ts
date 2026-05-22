import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const houses = await prisma.house.findMany({
      orderBy: { houseNo: 'asc' }, // เรียงตามบ้านเลขที่
    });
    
    return NextResponse.json({ success: true, houses });
  } catch (error) {
    console.error('Error fetching houses:', error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลบ้านไม่สำเร็จ' }, { status: 500 });
  }
}