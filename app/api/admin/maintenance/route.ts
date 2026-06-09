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

    // แมปข้อมูลให้ตรงกับ Type ที่หน้าบ้านต้องการ
    const tickets = await Promise.all(rawReports.map(async (r) => {
      // หาชื่อผู้แจ้งจาก lineId
      const reporter = await prisma.user.findUnique({ 
        where: { lineId: r.lineId },
        select: { name: true }
      });
      
      // 🌟 ทริกพิเศษ: ดึง History และ ExpectedDate ที่ซ่อนไว้ใน adminNote ออกมาใช้
      let extraData = { expectedDate: '', history: [] as any[] };
      if (r.adminNote) {
        try {
          extraData = JSON.parse(r.adminNote);
        } catch (e) {
          // ถ้าเป็นข้อความธรรมดา (ของเก่า) ให้จับใส่ History ซะ
          extraData.history = [{ 
            status: r.status, 
            date: r.updatedAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), 
            note: r.adminNote 
          }];
        }
      }

      return {
        id: r.id,
        residentName: reporter?.name || 'ลูกบ้าน',
        houseNo: r.house?.houseNo || '-',
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        isUrgent: r.type === 'URGENT', // สมมติว่าใช้ type เช็คความด่วน
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
// 2. อัปเดตสถานะและแจ้งเตือน LINE (POST)
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, expectedDate, note, sendLine } = body;

    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลแจ้งซ่อมในระบบ' }, { status: 404 });
    }

    // 🌟 ดึงประวัติเก่าออกมาเตรียมบวกประวัติใหม่เข้าไป
    let extraData = { expectedDate: '', history: [] as any[] };
    if (existingReport.adminNote) {
        try { 
          extraData = JSON.parse(existingReport.adminNote); 
        } catch (e) {}
    }

    // อัปเดตวันที่และเพิ่มประวัติใหม่ลงไป
    extraData.expectedDate = expectedDate || extraData.expectedDate;
    extraData.history.push({
        status: status,
        date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }),
        note: note || 'อัปเดตสถานะโดยนิติบุคคล'
    });

    // บันทึกลงฐานข้อมูล
    const updatedReport = await prisma.report.update({
        where: { id },
        data: {
            status: status,
            adminNote: JSON.stringify(extraData), // แปลงกลับเป็น String เก็บลง DB
        }
    });

    // 🌟 ยิงข้อความ LINE หา "ลูกบ้านคนที่แจ้ง" โดยเฉพาะ (Push Message)
    if (sendLine && existingReport.lineId) {
        const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        if (LINE_TOKEN) {
            const statusText = status === 'IN_PROGRESS' ? 'กำลังดำเนินการ 🔧' : status === 'COMPLETED' ? 'เสร็จสิ้นเรียบร้อย ✅' : 'รอดำเนินการ ⏳';
            const expectedText = expectedDate ? `\n📅 คาดว่าจะเสร็จ: ${expectedDate}` : '';
            const noteText = note ? `\n📝 หมายเหตุ: ${note}` : '';

            await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  'Authorization': `Bearer ${LINE_TOKEN}` 
                },
                body: JSON.stringify({
                    to: existingReport.lineId, // ส่งเจาะจงหาคนแจ้ง ไม่รบกวนคนอื่น
                    messages: [{
                        type: "text",
                        text: `📢 อัปเดตงานแจ้งซ่อม\nเรื่อง: ${existingReport.title}\n\nสถานะตอนนี้: ${statusText}${expectedText}${noteText}`
                    }]
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