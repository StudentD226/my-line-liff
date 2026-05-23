import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      config = await prisma.systemConfig.create({ data: {} });
    }
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Fetch Config Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      projectType, 
      flatRateAmount, 
      penaltyRatePerDay, 
      applyToAllHouses,
      invoiceGenerateDay,
      invoiceGenerateTime, // 🌟 เพิ่มเวลาส่งบิล
      dueDateDay,
      secondReminderDay,
      bankName,            // 🌟 เพิ่มชื่อธนาคาร
      bankAccountNo,       // 🌟 เพิ่มเลขบัญชี
      bankAccountName,     // 🌟 เพิ่มชื่อบัญชี
      bankLogoUrl          // 🌟 เพิ่มโลโก้ธนาคาร
    } = body;

    // 1. อัปเดตการตั้งค่าส่วนกลาง
    await prisma.systemConfig.update({
      where: { id: 1 },
      data: {
        projectType,
        flatRateAmount: Number(flatRateAmount),
        penaltyRatePerDay: Number(penaltyRatePerDay),
        invoiceGenerateDay: Number(invoiceGenerateDay),
        invoiceGenerateTime: invoiceGenerateTime, // บันทึกเวลา
        dueDateDay: Number(dueDateDay),
        secondReminderDay: Number(secondReminderDay),
        bankName: bankName,               // บันทึกธนาคาร
        bankAccountNo: bankAccountNo,     // บันทึกเลขบัญชี
        bankAccountName: bankAccountName, // บันทึกชื่อบัญชี
        bankLogoUrl: bankLogoUrl          // บันทึกโลโก้
      }
    });

    // 2. ถ้าติ๊กช่อง "อัปเดตทับราคาบ้านทุกหลัง"
    if (applyToAllHouses) {
      await prisma.house.updateMany({
        data: {
          feeType: 'FIXED',
          feeRate: Number(flatRateAmount)
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update Config Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}