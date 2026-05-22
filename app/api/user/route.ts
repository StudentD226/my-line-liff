import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');

    if (!lineId) {
      return NextResponse.json({ success: false, error: 'Missing lineId' }, { status: 400 });
    }

    // ดึงข้อมูลลูกบ้าน พร้อมข้อมูลบ้านที่อาศัยอยู่ (ใช้ residentHouse)
    const user = await prisma.user.findUnique({
      where: { lineId: lineId },
      include: { residentHouse: true } 
    });

    if (user) {
      return NextResponse.json({ success: true, user });
    } else {
      return NextResponse.json({ success: false, message: 'Not registered' });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}