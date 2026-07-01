import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. ดึงข้อมูลรายการแจ้งซ่อมทั้งหมด (GET)
// ==========================================
export async function GET() {
  try {
    const rawReports = await prisma.report.findMany({
      include: { house: true },
      orderBy: { createdAt: 'desc' },
    });

    const tickets = await Promise.all(rawReports.map(async (r) => {
      const reporter = await prisma.user.findUnique({ 
        where: { lineId: r.lineId },
        select: { name: true }
      });
      
      let extraData = { expectedDate: '', history: [] as any[] };
      if (r.adminNote) {
        try {
          extraData = JSON.parse(r.adminNote);
        } catch (e) {
          extraData.history = [{ 
            status: r.status, 
            date: r.updatedAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), 
            note: r.adminNote 
          }];
        }
      }

      return {
        id: r.id,
        residentName: reporter?.name || 'ผู้พักอาศัย',
        houseNo: r.house?.houseNo || '-',
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        isUrgent: r.type === 'URGENT',
        reportedDate: r.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        expectedDate: extraData.expectedDate,
        history: extraData.history,
        imageUrl: r.imageUrl,
      };
    }));

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error("GET Maintenance Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ==========================================
// 2. อัปเดตสถานะและแจ้งเตือน LINE แบบ Flex Message (POST)
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, expectedDate, note, sendLine, updateImageUrl } = body;

    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลแจ้งซ่อมในระบบ' }, { status: 404 });
    }

    let extraData = { expectedDate: '', history: [] as any[] };
    if (existingReport.adminNote) {
        try { 
          extraData = JSON.parse(existingReport.adminNote); 
        } catch (e) {}
    }

    // รับลิงก์รูปภาพจาก Frontend โดยตรง (หน้าเว็บอัปโหลดผ่าน Cloudinary มาให้เรียบร้อยแล้ว)
    const finalUpdateImageUrl = updateImageUrl || null;

    // บันทึกข้อมูลลงในประวัติ Timeline ข้อใหม่ล่าสุด
    extraData.expectedDate = expectedDate || extraData.expectedDate;
    extraData.history.push({
        status: status,
        date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }),
        note: note || 'อัปเดตสถานะโดยนิติบุคคล',
        imageUrl: finalUpdateImageUrl 
    });

    // บันทึกลงฐานข้อมูล
    const updatedReport = await prisma.report.update({
        where: { id },
        data: {
            status: status,
            adminNote: JSON.stringify(extraData), 
        }
    });

    // ยิง Flex Message เข้า LINE
    if (sendLine && existingReport.lineId) {
        const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        if (LINE_TOKEN) {
            let headerBgColor = "#376B64"; 
            let statusTextColor = "#376B64";
            let statusTextTh = "กำลังดำเนินการ";

            if (status === 'PENDING') {
              headerBgColor = "#f97316"; 
              statusTextColor = "#ea580c";
              statusTextTh = "รอดำเนินการ";
            } else if (status === 'COMPLETED') {
              headerBgColor = "#10b981"; 
              statusTextColor = "#059669";
              statusTextTh = "เสร็จสิ้นเรียบร้อย";
            }

            const flexBodyContents: any[] = [
              {
                type: "text",
                text: `${existingReport.title}`,
                weight: "bold",
                size: "md",
                wrap: true,
                color: "#1e293b" 
              },
              {
                type: "box",
                layout: "baseline",
                margin: "md",
                contents: [
                  { type: "text", text: "สถานะ", color: "#64748b", size: "sm", flex: 2 },
                  { type: "text", text: statusTextTh, weight: "bold", color: statusTextColor, size: "sm", flex: 5, wrap: true }
                ]
              }
            ];

            if (expectedDate) {
              flexBodyContents.push({
                type: "box",
                layout: "baseline",
                margin: "sm",
                contents: [
                  { type: "text", text: "คาดว่าเสร็จ", color: "#64748b", size: "sm", flex: 2 },
                  { type: "text", text: expectedDate, color: "#334155", size: "sm", flex: 5, wrap: true }
                ]
              });
            }

            if (note) {
              flexBodyContents.push({
                type: "box",
                layout: "baseline",
                margin: "sm",
                contents: [
                  { type: "text", text: "หมายเหตุ", color: "#64748b", size: "sm", flex: 2 },
                  { type: "text", text: note, color: "#334155", size: "sm", flex: 5, wrap: true }
                ]
              });
            }

            const flexMessage: any = {
              type: "flex",
              altText: `อัปเดตงานแจ้งซ่อม: ${existingReport.title}`,
              contents: {
                type: "bubble",
                size: "mega",
                header: {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: headerBgColor,
                  paddingAll: "12px",
                  contents: [
                    {
                      type: "text",
                      text: "อัปเดตสถานะงานแจ้งซ่อม",
                      color: "#ffffff",
                      weight: "bold",
                      size: "sm"
                    }
                  ]
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  spacing: "sm",
                  paddingAll: "20px",
                  contents: flexBodyContents
                },
                footer: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "ตรวจสอบประวัติเพิ่มเติมได้ในระบบ",
                      color: "#94a3b8",
                      size: "xs",
                      align: "center"
                    }
                  ]
                }
              }
            };

            // แสดงรูปภาพที่อัปเดตล่าสุดของแอดมินบนตัว Flex Message
            const displayImageUrl = finalUpdateImageUrl || existingReport.imageUrl;
            
            if (displayImageUrl) {
              flexMessage.contents.hero = {
                type: "image",
                url: displayImageUrl,
                size: "full",
                aspectRatio: "20:13",
                aspectMode: "cover"
              };
            }

            await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${LINE_TOKEN}` 
                },
                body: JSON.stringify({
                    to: existingReport.lineId,
                    messages: [flexMessage]
                })
            });
        }
    }

    return NextResponse.json({ success: true, data: updatedReport });
  } catch (error) {
    console.error("POST Maintenance Error:", error);
    return NextResponse.json({ success: false, error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}