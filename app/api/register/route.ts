import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineId, fullName, phone, houseNumber } = body;

    // 🔍 1. เช็คก่อนว่าคนนี้เคยสมัครหรือยัง
    const existingUser = await prisma.user.findUnique({
      where: { lineId: lineId }
    });

    if (existingUser) {
      // ถ้าเจอข้อมูลเก่า ส่งกลับไปบอกหน้าบ้านว่า "สมัครแล้วนะ" พร้อมข้อมูลเดิม
      return NextResponse.json({ 
        success: true, 
        isExisting: true, 
        user: existingUser 
      });
    }

    // ✨ 2. ถ้ายังไม่เคยสมัคร ค่อยบันทึกใหม่
    const newUser = await prisma.user.create({
      data: { lineId, fullName, phone, houseNumber },
    });

    return NextResponse.json({ success: true, isExisting: false, user: newUser });

  } catch (error: any) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}