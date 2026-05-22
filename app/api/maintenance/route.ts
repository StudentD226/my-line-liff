import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // 3. บันทึกเข้าตาราง Report
    const newReport = await prisma.report.create({
      data: {
        ticketNo: ticketNo,
        lineId: lineId, // เก็บไลน์ไอดีไว้แจ้งกลับ
        type: type,
        category: category,
        location: location,
        title: title,
        description: description,
        imageUrl: imageUrl,
        residentHouseId: user.residentHouse.id // ผูกกับบ้านเลขที่
      }
    });

    return NextResponse.json({ success: true, ticket: newReport });
  } catch (error: any) {
    console.error("Maintenance Submit Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }, { status: 500 });
  }
}