import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

<<<<<<< HEAD
// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

=======
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');

    if (!lineId) return NextResponse.json({ success: false, error: 'ไม่พบ lineId' }, { status: 400 });

<<<<<<< HEAD
    // 🌟 [แก้ไขจุดสำคัญที่ 1] สั่ง include invoices ซ้อนเข้าไปในตารางบ้าน
=======
    // 🌟 [แก้ไขจุดสำคัญที่ 1] สั่ง include invoices ซ้อนเข้าไปในตารางบ้าน เพื่อดึงรายการบิลมาคำนวณและแก้ไขปัญหา Compile Error
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
    const user = await prisma.user.findUnique({
      where: { lineId },
      include: { 
        residentHouse: {
          include: {
            invoices: {
              where: { status: { in: ['PENDING', 'OVERDUE', 'REJECTED'] } },
              orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
            }
          }
        } 
      }
    });

    if (!user?.residentHouse) return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้าน' }, { status: 404 });

    const house = user.residentHouse;
    
    // 🌟 [แก้ไขจุดสำคัญที่ 2] เรียกใช้งานข้อมูลบิลที่รวมกลุ่ม REJECTED เข้ามาตรวจเช็คเรียบร้อยแล้ว
    const pendingInvoices = house.invoices;

<<<<<<< HEAD
    const config = await prisma.systemConfig.findFirst();
    const penaltyRatePerDay = config?.penaltyRatePerDay || 100; // 🌟 เปลี่ยนเป็นเรทค่าปรับรายวัน
=======
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    const flatPenaltyPerMonth = config?.penaltyRatePerDay || 100;
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d

    let baseTotal = 0;
    let totalFine = 0;
    
<<<<<<< HEAD
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 🌟 เทียบเวลาที่เที่ยงคืนตรง

    pendingInvoices.forEach(inv => {
      const baseAmt = truncateDecimals(Number(inv.baseAmount));
      baseTotal += baseAmt;

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0); // 🌟 เทียบเวลาที่เที่ยงคืนตรง

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // 🌟 นับเป็นวันเต็มๆ

        if (overdueDays > 0) {
          const fine = truncateDecimals(overdueDays * penaltyRatePerDay); // 🌟 คำนวณรายวัน
=======
    const now = new Date();

    pendingInvoices.forEach(inv => {
      const baseAmt = Number(inv.baseAmount);
      baseTotal += baseAmt;

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(23, 59, 59, 999);

      if (now > dueDate) {
        const diffTime = now.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          const overdueMonths = Math.ceil(diffDays / 30);
          const fine = overdueMonths * flatPenaltyPerMonth;
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
          totalFine += fine;
        }
      }
    });

<<<<<<< HEAD
    // 🌟 หุ้มตัวแปรสุดท้ายด้วย truncateDecimals อีกชั้นเพื่อความชัวร์
    baseTotal = truncateDecimals(baseTotal);
    totalFine = truncateDecimals(totalFine);

=======
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
    return NextResponse.json({
      success: true,
      houseData: {
        houseNo: house.houseNo,
<<<<<<< HEAD
        monthlyRate: house.feeRate ? truncateDecimals(Number(house.feeRate)) : 1000,
        outstandingBalance: baseTotal,
        fineAmount: totalFine,
        totalToPay: truncateDecimals(baseTotal + totalFine) // 🌟 ยอดรวมสุทธิเป๊ะๆ
=======
        monthlyRate: house.feeRate ? Number(house.feeRate) : 1000,
        outstandingBalance: baseTotal,
        fineAmount: totalFine,
        totalToPay: baseTotal + totalFine
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
      }
    });
  } catch (error) {
    console.error("Smart Info Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
