export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { messagingApi } from '@line/bot-sdk';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

// Helper: แปลงวันที่เป็นรูปแบบภาษาไทย
const formatThaiDate = (date: Date) => {
  const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${date.getDate()} ${months[date.getMonth() + 1]} ${date.getFullYear() + 543}`;
};

// ==========================================
// 1. ดึงข้อมูลประกาศทั้งหมด (GET)
// ==========================================
export async function GET() {
  try {
    const newsData = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formattedNews = newsData.map(n => ({
      id: n.id,
      title: n.title,
      category: n.category,
      content: n.content,
      imageUrl: n.imageUrl,
      status: n.status,
      views: n.views,
      recipients: n.recipients,
      isPinned: n.isPinned,
      date: formatThaiDate(n.createdAt),
    }));

    return NextResponse.json({ success: true, data: formattedNews });
  } catch (error) {
    console.error("GET News Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลล้มเหลว' }, { status: 500 });
  }
}

// ==========================================
// 2. สร้าง หรือ แก้ไขประกาศ พร้อมยิง LINE (POST)
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 🌟 หั่น sendLine ออกไปเลย เพราะเราจะบังคับส่งเมื่อ status === 'PUBLISHED'
    const { id, title, category, content, status, imageUrl } = body;

    let savedNews;
    
    // ตรวจสอบว่ามี ID ไหม ถ้ามี=อัปเดต ถ้าไม่มี=สร้างใหม่
    if (id) {
      savedNews = await prisma.news.update({
        where: { id },
        data: { title, category, content, imageUrl, status, scheduledAt: null }
      });
    } else {
      savedNews = await prisma.news.create({
        data: { title, category, content, imageUrl, status }
      });
    }

    let lineSentCount = 0;

    // 🌟 เปลี่ยนเงื่อนไขใหม่: ถ้าแอดมินกดปุ่ม "เผยแพร่" (status === 'PUBLISHED') บังคับยิง LINE ทันที!
    if (status === 'PUBLISHED') {
      
      // ดึง Line ID ของลูกบ้านทั้งหมดจากฐานข้อมูล
      const users = await prisma.user.findMany({ where: { lineId: { not: null } } });
      const uniqueLineIds = [...new Set(users.map(u => u.lineId))].filter(Boolean) as string[];

      if (uniqueLineIds.length > 0) {
        // 🎨 โครงสร้าง Flex Message สวยเป๊ะตามหน้าพรีวิวแชท LINE
        const flexMessage: messagingApi.FlexMessage = {
          type: "flex",
          altText: `📢 ประกาศใหม่: ${title}`,
          contents: {
            type: "bubble",
            size: "giga",
            // ถ้ารูปจาก Cloudinary อัปโหลดมาสำเร็จ จะแสดงเป็น Hero Image ทันที
            hero: imageUrl ? {
              type: "image",
              url: imageUrl,
              size: "full",
              aspectRatio: "20:13",
              aspectMode: "cover"
            } : undefined,
            body: {
              type: "box", layout: "vertical", paddingAll: "xl", backgroundColor: "#F8FAFC",
              contents: [
                {
                  type: "box", layout: "horizontal", alignItems: "center", marginBottom: "lg",
                  contents: [
                    { type: "text", text: "📢 ข่าวประกาศหมู่บ้าน", weight: "bold", color: "#0F172A", size: "sm", flex: 1 },
                    { type: "text", text: category, color: "#FFFFFF", size: "xs", backgroundColor: "#059669", align: "center", weight: "bold", flex: 0, paddingStart: "sm", paddingEnd: "sm", paddingTop: "xs", paddingBottom: "xs", cornerRadius: "md" }
                  ]
                },
                { type: "text", text: title, weight: "bold", size: "xl", color: "#0F172A", wrap: true, marginBottom: "md" },
                { type: "text", text: content, size: "sm", color: "#475569", wrap: true, maxLines: 5 },
                { type: "separator", margin: "xl", color: "#E2E8F0" },
                { type: "text", text: `ประกาศเมื่อ: ${formatThaiDate(new Date())}`, size: "xs", color: "#94A3B8", margin: "md" }
              ]
            },
            footer: {
              type: "box", layout: "vertical", paddingAll: "md",
              contents: [
                {
                  type: "button", style: "primary", color: "#0F172A",
                  action: { 
                    type: "uri", 
                    label: "อ่านรายละเอียดเต็ม", 
                    // รองรับทั้ง URL สำเร็จรูป หรือจะประกอบร่างจาก LIFF_ID ก็ได้ครับ
                    uri: process.env.NEXT_PUBLIC_LIFF_URL || `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/news` 
                  }
                }
              ]
            }
          } as any
        };

        // สาดข้อความแบบมัลติแคสต์เข้าแชท LINE ของลูกบ้านทุกคนพร้อมกัน
        await client.multicast({ to: uniqueLineIds, messages: [flexMessage] }).catch(console.error);
        lineSentCount = uniqueLineIds.length;

        // บันทึกจำนวนลูกบ้านที่ได้รับข้อความลง Database
        await prisma.news.update({
          where: { id: savedNews.id },
          data: { recipients: lineSentCount }
        });
      }
    }

    return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ', lineSent: lineSentCount });
  } catch (error) {
    console.error("POST News Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึก' }, { status: 500 });
  }
}

// ==========================================
// 3. ลบประกาศ (DELETE)
// ==========================================
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ที่ต้องการลบ' }, { status: 400 });
    }

    await prisma.news.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error("DELETE News Error:", error);
    return NextResponse.json({ success: false, error: 'ลบข้อมูลล้มเหลว' }, { status: 500 });
  }
}