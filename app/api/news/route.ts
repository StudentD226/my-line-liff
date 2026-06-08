export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: แปลงวันที่เป็นรูปแบบภาษาไทย
const formatThaiDate = (date: Date) => {
  const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${date.getDate()} ${months[date.getMonth() + 1]} ${date.getFullYear() + 543}`;
};

export async function GET() {
  try {
    // 🌟 ดึงข้อมูลเฉพาะที่สถานะเป็น 'PUBLISHED' เท่านั้น
    const publishedNews = await prisma.news.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' }
    });

    const formattedNews = publishedNews.map(n => ({
      id: n.id,
      title: n.title,
      category: n.category,
      content: n.content,
      imageUrl: n.imageUrl,
      views: n.views,
      isPinned: n.isPinned,
      date: formatThaiDate(n.createdAt),
    }));

    return NextResponse.json({ success: true, data: formattedNews });
  } catch (error) {
    console.error("GET Public News Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลข่าวสารล้มเหลว' }, { status: 500 });
  }
}