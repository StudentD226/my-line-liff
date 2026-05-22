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

    // 2. บันทึกข้อมูลลูกบ้านลง Database ของเรา (ทำตรงนี้ให้เสร็จก่อน ปลอดภัยแน่นอน)
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
    // 📍 3. ส่งข้อมูลไปให้ n8n ของเพื่อน (โซนปลอดภัย หุ้มเกราะไว้แล้ว)
    // =======================================================
    const n8nUrl = "https://donation-humbling-wreckage.ngrok-free.dev/webhook/register"; 
    
    try {
      // ใส่ await เพื่อรอให้มันยิงออกไปจริงๆ ระบบจะได้ไม่ตัดจบก่อน
      await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: "new_registration",
          lineId: user.lineId,
          name: user.name,
          phone: user.phone,
          houseNo: house.houseNo
        })
      });
      console.log("ส่งข้อมูลไป n8n เรียบร้อย!");
    } catch (err) {
      // 🛡️ ถ้ายิงไป n8n ไม่ผ่าน (เช่น ลิงก์ตาย) มันจะมาตกตรงนี้แทน
      // ทำให้เว็บเราไม่ Error และทำงานคำสั่งข้างล่างต่อไปได้ตามปกติ
      console.error("ส่งไป n8n ไม่สำเร็จ (แต่ไม่กระทบระบบหลัก):", err);
    }
    // =======================================================

    // 4. ตอบกลับหน้าเว็บว่า "สมัครสำเร็จ!" เสมอ (ตราบใดที่ผ่านข้อ 2 มาได้)
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