import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
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

    // 🌟 หากมีผู้ใช้ และมีบ้านที่สังกัดอยู่จริง ให้ส่งข้อมูลผู้ใช้กลับไป
    // หากผู้ใช้ไม่มีบ้านสังกัดอยู่ (เช่น ถูกลบออกจากระบบ) ให้ส่งกลับว่า Not registered
    // เพื่อให้ระบบเปิดให้ลงทะเบียนใหม่ได้ทันที
    if (user && user.residentHouse) {
      return NextResponse.json({ success: true, user });
    } else {
      return NextResponse.json({ success: false, message: 'Not registered' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
