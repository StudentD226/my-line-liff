import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
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

    // ตรวจสอบสถานะลูกบ้านเดิมในระบบ
    const existingUser = await prisma.user.findUnique({
      where: { lineId: lineId },
      include: { residentHouse: true }
    });

    let user;

    // 🌟 กฎระบบ: ข้อมูลเบอร์โทรและชื่อแก้ได้ แต่ถ้ามีบ้านผูกอยู่แล้วจะไม่ให้เปลี่ยนบ้าน
    // แต่ถ้ายังไม่มีบ้านผูกอยู่ (ผู้ใช้ใหม่ หรือถูกแอดมินลบออกจากบ้านเดิม) ให้สามารถผูกบ้านใหม่ได้ทันที
    if (existingUser && existingUser.residentHouseId && existingUser.residentHouse) {
      // ลูกบ้านเดิมที่มีบ้านอยู่แล้ว -> อัปเดตเฉพาะชื่อและเบอร์โทร
      user = await prisma.user.update({
        where: { lineId: lineId },
        data: {
          name: name.trim(),
          phone: phone ? phone.trim() : null
        }
      });
    } else {
      // 2. บันทึกข้อมูลลูกบ้านใหม่ลง Database (หรืออัปเดตผู้ใช้ที่ไม่มีบ้าน ให้ผูกกับบ้านใหม่)
      user = await prisma.user.upsert({
        where: { lineId: lineId },
        update: {
          name: name.trim(),
          phone: phone ? phone.trim() : null,
          residentHouseId: house.id 
        },
        create: {
          lineId: lineId,
          name: name.trim(),
          phone: phone ? phone.trim() : null,
          residentHouseId: house.id 
        }
      });

      // =======================================================
      // 🌟 3. ระบบเลื่อนขั้น: ใครลงทะเบียนคนแรก ได้เป็นเจ้าบ้านทันที!
      // =======================================================
      if (!house.ownerId) {
        await prisma.house.update({
          where: { id: house.id },
          data: { ownerId: user.id }
        });
        console.log(`👑 แต่งตั้ง ${user.name} เป็นเจ้าของบ้านเลขที่ ${house.houseNo} อัตโนมัติ!`);
      }
    }

    // 4. ตอบกลับหน้าเว็บว่า "สมัครสำเร็จ!"
    return NextResponse.json({ success: true, user });
    
  } catch (error: any) { 
    console.error("Register Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'ระบบขัดข้อง' 
    }, { status: 500 });
  }
}
