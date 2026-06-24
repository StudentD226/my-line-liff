import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { houseNo, passcode } = await request.json();

    if (!houseNo || !passcode) {
      return NextResponse.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    // 🌟 ค้นหาข้อมูลบ้านจากบ้านเลขที่
    const house = await prisma.house.findUnique({
      where: { houseNo: houseNo },
      select: { passcode: true, houseNo: true }
    });

    if (!house) {
      return NextResponse.json({ success: false, message: 'ไม่พบข้อมูลบ้านเลขที่นี้ในระบบ' }, { status: 404 });
    }

    if (!house.passcode) {
      return NextResponse.json({ success: false, message: 'บ้านหลังนี้ยังไม่ได้ตั้งรหัสลับ กรุณาติดต่อนิติบุคคล' }, { status: 400 });
    }

    // 🌟 แปลงเป็นตัวพิมพ์ใหญ่ทั้งหมดก่อนเทียบกัน เพื่อป้องกันปัญหาพิมพ์ผิดเคส
    if (house.passcode.toUpperCase() === passcode.trim().toUpperCase()) {
      return NextResponse.json({ success: true, message: 'รหัสลับถูกต้อง' });
    } else {
      return NextResponse.json({ success: false, message: 'รหัสลับประจำบ้านไม่ถูกต้อง' }, { status: 401 });
    }

  } catch (error) {
    console.error('Verify Passcode Error:', error);
    return NextResponse.json({ success: false, message: 'ระบบขัดข้อง โปรดลองใหม่' }, { status: 500 });
  }
}