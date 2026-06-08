import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendLineBroadcast } from '@/lib/line';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const now = new Date();

    // 1. ค้นหาข่าวที่สถานะเป็น SCHEDULED และเวลาปัจจุบันเลยกำหนด scheduledAt มาแล้ว
    const dueNews = await prisma.news.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now } // lte = less than or equal (ถึงเวลาแล้ว)
      }
    });

    if (dueNews.length === 0) {
      return NextResponse.json({ success: true, message: 'ไม่มีประกาศที่ถึงเวลาเผยแพร่' });
    }

    // 2. ไล่อัปเดตสถานะเป็น PUBLISHED และยิง LINE
    for (const news of dueNews) {
      await prisma.news.update({
        where: { id: news.id },
        data: { status: 'PUBLISHED' }
      });

      // ยิง LINE อัตโนมัติเมื่อถึงเวลา
      await sendLineBroadcast(news.title, news.content, news.category);
    }

    return NextResponse.json({ 
      success: true, 
      message: `เผยแพร่ประกาศอัตโนมัติสำเร็จ ${dueNews.length} รายการ` 
    });

  } catch (error) {
    console.error("Cron Publish News Error:", error);
    return NextResponse.json({ success: false, error: 'ระบบทำงานผิดพลาด' }, { status: 500 });
  }
}