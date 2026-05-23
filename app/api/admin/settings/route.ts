import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================================
// 🟢 GET: ดึงข้อมูลการตั้งค่าส่งไปให้หน้าเว็บ
// ========================================================
export async function GET() {
  try {
    const config = await prisma.systemConfig.findFirst();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ========================================================
// 🔵 POST: รับข้อมูลจากหน้าเว็บมาบันทึกลง Database
// ========================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 🌟 จัดเตรียมข้อมูลที่จะบันทึก (เพิ่มฟิลด์ธนาคารเข้ามาตรงนี้)
    const dataToSave = {
      projectType: body.projectType,
      flatRateAmount: Number(body.flatRateAmount),
      penaltyRatePerDay: Number(body.penaltyRatePerDay),
      invoiceGenerateDay: Number(body.invoiceGenerateDay),
      invoiceGenerateTime: body.invoiceGenerateTime,
      dueDateDay: Number(body.dueDateDay),
      secondReminderDay: Number(body.secondReminderDay),
      // ข้อมูลธนาคาร
      bankName: body.bankName,
      bankAccountNo: body.bankAccountNo,
      bankAccountName: body.bankAccountName,
      bankLogoUrl: body.bankLogoUrl,
    };

    // เช็คว่าเคยมีการตั้งค่าในระบบหรือยัง
    const existingConfig = await prisma.systemConfig.findFirst();

    if (existingConfig) {
      // ถ้ามีแล้ว ให้อัปเดตของเดิม
      await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: dataToSave,
      });
    } else {
      // ถ้ายังไม่มี ให้สร้างใหม่
      await prisma.systemConfig.create({
        data: dataToSave,
      });
    }

    // 🌟 ถ้ายูสเซอร์ติ๊กถูก "อัปเดตทับราคาบ้านทุกหลังทันที"
    if (body.applyToAllHouses) {
      await prisma.house.updateMany({
        data: {
          feeType: 'FIXED',
          feeRate: Number(body.flatRateAmount),
        },
      });
    }

    return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ' });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}