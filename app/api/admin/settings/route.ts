export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================================
// 🟢 GET: เรียกค้นฐานข้อมูลการตั้งค่าโครงสร้างระบบอ้างอิงส่งไปยังอินเทอร์เฟซ
// ========================================================
export async function GET() {
  try {
    const config = await prisma.systemConfig.findFirst();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching settings database:', error);
    return NextResponse.json({ success: false, error: 'ระบบไม่สามารถดึงข้อมูลเกณฑ์การตั้งค่าอ้างอิงได้' }, { status: 500 });
  }
}

// ========================================================
// 🔵 POST: ตรวจสอบความถูกต้องและบันทึกปรับปรุงข้อมูลเกณฑ์ระบบส่วนกลางหลัก
// ========================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 🌟 ส่วนตรวจสอบความถูกต้องทางบัญชีอย่างเป็นทางการฝั่งหลังบ้าน (TC-SET-006 / 007 / 009 / 010 Validation)
    if (body.flatRateAmount === undefined || body.flatRateAmount === null || body.flatRateAmount === '') {
      return NextResponse.json({ success: false, error: 'กรุณาระบุข้อมูลอัตราเรียกเก็บมาตรฐานส่วนกลางประจำเดือนให้ครบถ้วน' }, { status: 400 });
    }
    if (body.penaltyRatePerDay === undefined || body.penaltyRatePerDay === null || body.penaltyRatePerDay === '') {
      return NextResponse.json({ success: false, error: 'กรุณาระบุข้อมูลอัตราเรียกเก็บค่าปรับล่าช้าในระบบให้ครบถ้วน' }, { status: 400 });
    }
    
    const flatAmount = Number(body.flatRateAmount);
    const penaltyAmount = Number(body.penaltyRatePerDay);

    if (flatAmount <= 0) {
      return NextResponse.json({ success: false, error: 'อัตราเรียกเก็บมาตรฐานส่วนกลางประจำเดือนต้องมีมูลค่ามากกว่า 0 บาท' }, { status: 400 });
    }
    if (penaltyAmount < 0) {
      return NextResponse.json({ success: false, error: 'อัตราเรียกเก็บค่าปรับล่าช้าต้องไม่มีค่าต่ำกว่าศูนย์หรือติดลบในระบบ' }, { status: 400 });
    }

    const dataToSave = {
      projectType: body.projectType,
      flatRateAmount: flatAmount,
      penaltyRatePerDay: penaltyAmount,
      invoiceGenerateDay: Number(body.invoiceGenerateDay),
      invoiceGenerateTime: body.invoiceGenerateTime,
      dueDateDay: Number(body.dueDateDay),
      secondReminderDay: Number(body.secondReminderDay),
      bankName: body.bankName,
      bankAccountNo: body.bankAccountNo,
      bankAccountName: body.bankAccountName,
      bankLogoUrl: body.bankLogoUrl,
    };

    const existingConfig = await prisma.systemConfig.findFirst();

    if (existingConfig) {
      await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: dataToSave,
      });
    } else {
      await prisma.systemConfig.create({
        data: dataToSave,
      });
    }

    // 🌟 การผูกเงื่อนไขเฉพาะการจัดตั้งฐานข้อมูลประจำยูนิตล่วงหน้า (ไม่ส่งผลกระทบต่อรายการประวัติบิลสถานะชำระเงินแล้วเสร็จ)
    if (body.applyToAllHouses) {
      await prisma.house.updateMany({
        data: {
          feeType: 'FIXED',
          feeRate: flatAmount,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'บันทึกการปรับปรุงเกณฑ์ระบบเสร็จสิ้นสมบูรณ์' });
  } catch (error: any) {
    console.error('Error executing settings update transaction:', error);
    return NextResponse.json({ success: false, error: 'เซิร์ฟเวอร์ฐานข้อมูลส่วนกลางขัดข้อง ไม่สามารถดำเนินรายการได้' }, { status: 500 });
  }
}