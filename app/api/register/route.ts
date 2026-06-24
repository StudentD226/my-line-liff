import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineId, name, houseNo, phone } = body;

    if (!lineId || !name || !houseNo) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 1. ค้นหาบ้านเลขที่นี้ในระบบก่อน
    const house = await prisma.house.findUnique({
      where: { houseNo: houseNo }
    });

    if (!house) {
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่พบบ้านเลขที่นี้ในระบบนิติบุคคล กรุณาตรวจสอบอีกครั้ง' 
      }, { status: 400 });
    }

    // 2. บันทึกข้อมูลลูกบ้านลง Database ของเรา
    const user = await prisma.user.upsert({
      where: { lineId: lineId },
      update: {
        name: name,
        phone: phone,
        residentHouseId: house.id 
      },
      create: {
        lineId: lineId,
        name: name,
        phone: phone,
        residentHouseId: house.id 
      }
    });

    // =======================================================
    // 🌟 3. ระบบเลื่อนขั้น: ใครลงทะเบียนคนแรก ได้เป็นเจ้าบ้านทันที!
    // =======================================================
    if (!house.ownerId) {
      await prisma.house.update({
        where: { id: house.id },
        data: { ownerId: user.id } // เอา id ของคนที่เพิ่งสมัคร ยัดใส่เป็นเจ้าของบ้าน
      });
      console.log(`👑 แต่งตั้ง ${user.name} เป็นเจ้าของบ้านเลขที่ ${house.houseNo} อัตโนมัติ!`);
    }
    // =======================================================

    // 4. ตอบกลับหน้าเว็บว่า "สมัครสำเร็จ!"
    return NextResponse.json({ success: true, user });
    
  } catch (error: any) { 
    // อันนี้คือ Error ของระบบเราเอง (เช่น ฐานข้อมูลพัง)
    console.error("Register Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'ระบบขัดข้อง' 
    }, { status: 500 });
  }
}