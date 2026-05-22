import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    // สั่งลบบิลทั้งหมดที่สถานะยังเป็น PENDING (ยังไม่จ่าย) ทีเดียวเกลี้ยง!
    const deleted = await prisma.invoice.deleteMany({
      where: { status: 'PENDING' }
    });

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}