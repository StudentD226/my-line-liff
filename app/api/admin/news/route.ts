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
    const { id, title, category, content, status, imageUrl } = body;

    let savedNews;
    
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

    // บังคับส่ง LINE ทันทีเมื่อสถานะเป็น PUBLISHED
    if (status === 'PUBLISHED') {
      const users = await prisma.user.findMany({ where: { lineId: { not: null } } });
      const uniqueLineIds = [...new Set(users.map(u => u.lineId))].filter(Boolean) as string[];

      if (uniqueLineIds.length > 0) {
        // 🎨 โครงสร้าง Flex Message ขนาด Kilo (กะทัดรัด สวยงาม)
        const flexMessage: messagingApi.FlexMessage = {
          type: "flex",
          altText: `📢 ประกาศใหม่: ${title}`,
          contents: {
            type: "bubble",
            size: "kilo", // 🌟 เปลี่ยนเป็นขนาด Kilo ตามคำขอครับลูกพี่
            hero: imageUrl ? {
              type: "image",
              url: imageUrl,
              size: "full",
              aspectRatio: "20:13",
              aspectMode: "cover"
            } : undefined,
            body: {
              type: "box",
              layout: "vertical",
              paddingAll: "lg",
              backgroundColor: "#FFFFFF",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  alignItems: "center",
                  contents: [
                    {
                      type: "text",
                      text: "📢 ข่าวหมู่บ้าน",
                      weight: "bold",
                      color: "#111827",
                      size: "xs",
                      flex: 1
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#059669",
                      cornerRadius: "md",
                      flex: 0,
                      paddingStart: "sm",
                      paddingEnd: "sm",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                      contents: [
                        {
                          type: "text",
                          text: category,
                          color: "#FFFFFF",
                          size: "xxs",
                          weight: "bold",
                          align: "center"
                        }
                      ]
                    }
                  ]
                },
                {
                  type: "text",
                  text: title,
                  weight: "bold",
                  size: "md", // ปรับขนาดฟอนต์ให้เข้ากับขนาด Kilo
                  color: "#111827",
                  wrap: true,
                  margin: "md"
                },
                {
                  type: "text",
                  text: content,
                  size: "xs",
                  color: "#4B5563",
                  wrap: true,
                  maxLines: 4, // ลดจำนวนบรรทัดลงให้พอดีขนาด Kilo
                  margin: "sm"
                },
                {
                  type: "separator",
                  margin: "lg",
                  color: "#F3F4F6"
                },
                {
                  type: "text",
                  text: `ประกาศเมื่อ: ${formatThaiDate(new Date())}`,
                  size: "xxs",
                  color: "#9CA3AF",
                  margin: "md"
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              paddingAll: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#111827",
                  height: "sm", // ปุ่มขนาดเล็กลงให้ดูแพง
                  action: { 
                    type: "uri", 
                    label: "อ่านรายละเอียด", 
                    uri: process.env.NEXT_PUBLIC_LIFF_URL || `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/news` 
                  }
                }
              ]
            }
          } as any
        };

        try {
          await client.multicast({ to: uniqueLineIds, messages: [flexMessage] });
          lineSentCount = uniqueLineIds.length;
        } catch (err: any) {
          console.error("❌ LINE API Error:", err.originalError?.response?.data || err);
          return NextResponse.json({ 
            success: false, 
            error: `บันทึกแล้วแต่ยิง LINE ไม่ผ่าน`,
            details: err.originalError?.response?.data 
          });
        }

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