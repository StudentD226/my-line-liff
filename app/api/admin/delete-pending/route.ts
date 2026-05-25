import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 🌟 1. รับค่า ID ของบิลที่หน้าบ้านส่งมาให้ลบ
    const body = await request.json();
    const { ids } = body;

    // 🌟 2. ดักไว้ก่อน! ถ้าไม่มี ID ส่งมา หรือส่งมาเป็นค่าว่าง ให้เตะกลับทันที ห้ามลบมั่วเด็ดขาด!
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการที่ต้องการลบ' }, { status: 400 });
    }

    // 🌟 3. สั่งลบ "เฉพาะ" บิลที่มี ID ตรงกับในลิสต์ที่ส่งมาเท่านั้น
    const deleted = await prisma.invoice.deleteMany({
      where: { 
        id: { in: ids } // นี่คือเวทมนตร์ครับ in: ids คือหาเฉพาะคนที่โดนเลือก
      }
    });

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบ' }, { status: 500 });
  }
}