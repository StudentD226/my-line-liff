import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    // ดักไว้ก่อน ถ้าไม่มี ID ส่งมา ให้เด้งกลับทันที
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการที่ต้องการลบ' }, { status: 400 });
    }

    // ลบเฉพาะบิลที่มี ID ตรงกับหน้าบ้านส่งมา
    const deleted = await prisma.invoice.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบ' }, { status: 500 });
  }
}