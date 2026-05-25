import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, year, houseNo, scheduledDate, scheduledTime } = body;

    if (!month || !year) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุเดือนและปี' }, { status: 400 });
    }

    // 🌟 ดักไทป์ตัวแปรให้เป็นตัวเลข 100% ป้องกัน NaN
    const targetMonth = parseInt(String(month), 10);
    const targetYear = parseInt(String(year), 10);

    let scheduledSendAt: Date | null = null;
    if (scheduledDate && scheduledTime) {
      const dateTimeString = `${scheduledDate}T${scheduledTime}:00+07:00`;
      scheduledSendAt = new Date(dateTimeString);
    }

    const config = await prisma.systemConfig.findFirst();
    const dueDateDay = config?.dueDateDay || 7;

    // 🌟 ดักไทป์ houseNo ให้เป็น String ชัวร์ๆ
    const whereCondition = houseNo ? { houseNo: String(houseNo) } : {};

    const houses = await prisma.house.findMany({
      where: whereCondition
    });

    if (houses.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: houseNo ? `ไม่พบข้อมูลบ้านเลขที่ ${houseNo} ในระบบ` : 'ไม่พบข้อมูลบ้านในระบบ' 
      }, { status: 404 });
    }

    let createdCount = 0;
    let skippedCount = 0;

    const now = new Date();
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = String(now.getFullYear() + 543);

    for (const house of houses) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          residentHouseId: house.id,
          billingMonth: targetMonth,
          billingYear: targetYear,
          invoiceNo: { not: { startsWith: 'TR-' } } // 🌟 พระเอกตัวจริง: ให้มองข้าม TR- ตอนเช็คบิลซ้ำ!
        }
      });

      // 🌟 [ย้ายมาตรงนี้] สร้างรหัสบิลรอไว้เลย เพื่อใช้ทั้งตอนสร้างใหม่และอัปเดตของเก่า
      // ตัวอย่าง: 26-18052569-M05
      const monthSuffix = String(targetMonth).padStart(2, '0');
      const customInvoiceNo = `${house.houseNo}-${dayStr}${monthStr}${yearStr}-M${monthSuffix}`;

      if (existingInvoice) {
        if (existingInvoice.status === 'PENDING') {
          await prisma.invoice.update({
            where: { id: existingInvoice.id },
            data: {
              invoiceNo: customInvoiceNo, // 🌟 เพิ่มบรรทัดนี้: เผื่อบิลเก่ามันยังเป็นเลขมั่วๆ (cuid) ให้เขียนทับด้วยเลขสวยๆ ได้เลย
              penaltyAmount: 0,
              totalAmount: existingInvoice.baseAmount,
              scheduledSendAt: scheduledSendAt,
              isNotified: false 
            }
          });
          createdCount++;
        } else {
          skippedCount++;
        }
        continue;
      }

      // 🌟 ใช้ (house as any) เพื่อข้ามผ่านการตรวจสอบ Type ที่เข้มงวดเกินไปของ Prisma Schema
      const rawFeeType = String((house as any).feeType || 'CALCULATED').toUpperCase();
      const feeRate = Number((house as any).feeRate) || 0;
      const houseSize = Number((house as any).houseSize) || 0;
      
      const baseAmount = rawFeeType === 'FIXED' ? feeRate : (houseSize * feeRate);

      const calculatedDueDate = new Date(targetYear, targetMonth - 1, dueDateDay); 
      calculatedDueDate.setHours(23, 59, 59, 999);

      await prisma.invoice.create({
        data: {
          invoiceNo: customInvoiceNo, // 🌟 รหัสบิลสวยๆ
          billingMonth: targetMonth,
          billingYear: targetYear,
          baseAmount: baseAmount,
          penaltyAmount: 0, 
          totalAmount: baseAmount,
          status: 'PENDING',
          residentHouseId: house.id,
          dueDate: calculatedDueDate,
          scheduledSendAt: scheduledSendAt,
          isNotified: false,
        }
      });
      createdCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `ดำเนินการจัดเตรียมบิลสำเร็จ ${createdCount} รายการ (ข้ามบิลเก่าที่ชำระแล้ว ${skippedCount} รายการ)` 
    });

  } catch (error: any) {
    console.error('Generate Invoices Error:', error);
    // 🌟 ส่งข้อความ Error จริงของฐานข้อมูลเด้งโชว์ที่ป๊อปอัปหน้าบ้านไปเลย!
    return NextResponse.json({ success: false, error: `ระบบพัง: ${error.message}` }, { status: 500 });
  }
}