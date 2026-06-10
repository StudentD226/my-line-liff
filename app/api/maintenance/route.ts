import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================================
// 🌟 1. [GET] ระบบดึงประวัติการแจ้งเรื่องของลูกบ้าน
// ========================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');

    // ถ้าไม่มี LineID ส่งมา จะไม่คืนค่าอะไรกลับไป (ความปลอดภัย)
    if (!lineId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ lineId' }, { status: 400 });
    }

    // ดึงเฉพาะรายการที่ตรงกับ LineID ของลูกบ้านคนนั้นๆ เรียงจากใหม่ไปเก่า
    const rawReports = await prisma.report.findMany({
      where: { lineId: lineId },
      orderBy: { createdAt: 'desc' },
    });

    const tickets = rawReports.map((r) => {
      let extraData = { expectedDate: '', history: [] as any[] };
      if (r.adminNote) {
        try {
          extraData = JSON.parse(r.adminNote);
        } catch (e) {}
      }

      return {
        id: r.id,
        ticketNo: r.ticketNo,
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        reportedDate: r.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        expectedDate: extraData.expectedDate,
        history: extraData.history,
        imageUrl: r.imageUrl,
      };
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error("GET Maintenance Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ========================================================
// 🌟 2. [POST] ระบบบันทึกการแจ้งเรื่องใหม่
// ========================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lineId, type, category, location, title, description, imageUrl } = body;

    // 1. หาข้อมูลบ้านที่ลูกบ้านคนนี้อยู่
    const user = await prisma.user.findUnique({
      where: { lineId: lineId },
      include: { residentHouse: true }
    });

    if (!user || !user.residentHouse) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้านในระบบ กรุณาลงทะเบียนข้อมูลบ้านก่อนครับ' }, { status: 400 });
    }

    // 2. สร้างเลขที่แจ้งซ่อม (Ticket No) แบบสุ่ม
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const ticketNo = `MT${dateStr}-${randomCode}`;

    // 3. สร้าง History เริ่มต้น เพื่อให้สอดคล้องกับระบบ Timeline ฝั่ง Admin
    const initialDate = new Date().toLocaleDateString('th-TH', { 
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
    });
    
    const initialAdminNote = JSON.stringify({
        expectedDate: "",
        history: [
            {
                status: "PENDING",
                date: initialDate,
                note: "ระบบรับคำร้องอัตโนมัติ"
            }
        ]
    });

    // 4. บันทึกเข้าตาราง Report (ฟิลด์ imageUrl จะเก็บข้อความ Base64 ของรูปภาพลง DB ทันที)
    const newReport = await prisma.report.create({
      data: {
        ticketNo: ticketNo,
        lineId: lineId, 
        type: type,
        category: category,
        location: location,
        title: title,
        description: description,
        imageUrl: imageUrl, 
        residentHouseId: user.residentHouse.id,
        status: "PENDING",
        adminNote: initialAdminNote 
      }
    });

    return NextResponse.json({ success: true, ticket: newReport });
  } catch (error: any) {
    console.error("Maintenance Submit Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }, { status: 500 });
  }
}