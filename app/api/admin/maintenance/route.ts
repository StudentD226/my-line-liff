import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { messagingApi } from '@line/bot-sdk';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function GET() {
  try {
    const requests = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: { house: true } // ดึงบ้านเลขที่มาแสดง
    });
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status, adminNote, lineId } = await req.json();

    const updated = await prisma.report.update({
      where: { id },
      data: { status, adminNote }
    });

    // 🌟 ระบบส่งข้อความแจ้งเตือนกลับไปยังลูกบ้านแบบพรีเมียม Flex Message
    let statusText = "รอตรวจสอบ";
    let statusColor = "#6B7280"; 
    let iconUrl = "https://img.icons8.com/fluency-systems-filled/48/6B7280/clock.png";

    if (status === "IN_PROGRESS") { 
      statusText = "กำลังดำเนินการ"; 
      statusColor = "#D97706"; 
      iconUrl = "https://img.icons8.com/fluency-systems-filled/48/D97706/settings.png";
    } 
    if (status === "COMPLETED") { 
      statusText = "แก้ไขเรียบร้อยแล้ว"; 
      statusColor = "#059669"; 
      iconUrl = "https://img.icons8.com/fluency-systems-filled/48/059669/check-circle.png";
    } 
    if (status === "CANCELED") { 
      statusText = "รับทราบ / ยกเลิก"; 
      statusColor = "#DC2626"; 
      iconUrl = "https://img.icons8.com/fluency-systems-filled/48/DC2626/cancel.png";
    }

    await client.pushMessage({
      to: lineId,
      messages: [
        {
          type: "flex",
          altText: `อัปเดตสถานะ: ${updated.title}`,
          contents: {
            type: "bubble",
            size: "mega",
            body: {
              type: "box", layout: "vertical", paddingAll: "xl",
              contents: [
                { type: "text", text: "อัปเดตสถานะรับเรื่อง", weight: "bold", size: "xl", color: "#111827" },
                { type: "text", text: `Ticket: ${updated.ticketNo}`, size: "xs", color: "#6B7280", margin: "sm" },
                { type: "separator", margin: "lg", color: "#E5E7EB" },
                { type: "text", text: updated.title, weight: "bold", size: "md", color: "#111827", margin: "lg", wrap: true },
                {
                  type: "box", layout: "horizontal", margin: "md", alignItems: "center",
                  contents: [
                    { type: "text", text: "สถานะปัจจุบัน", size: "sm", color: "#4B5563", flex: 1 },
                    {
                      type: "box", layout: "horizontal", flex: 0, alignItems: "center", spacing: "sm",
                      contents: [
                        { type: "image", url: iconUrl, size: "16px" },
                        { type: "text", text: statusText, weight: "bold", size: "sm", color: statusColor, align: "end" }
                      ]
                    }
                  ]
                },
                ...(adminNote ? [{
                  type: "box", layout: "vertical", margin: "xl", backgroundColor: "#F9FAFB", cornerRadius: "lg", paddingAll: "lg",
                  contents: [
                    { type: "text", text: "ข้อความจากนิติบุคคล", size: "xs", weight: "bold", color: "#374151" },
                    { type: "text", text: adminNote, size: "sm", color: "#4B5563", wrap: true, margin: "md" }
                  ]
                }] : [])
              ]
            }
          } as any
        }
      ]
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Admin Update Maintenance Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}