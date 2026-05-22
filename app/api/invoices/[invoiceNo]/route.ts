import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

<<<<<<< HEAD
// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

=======
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
export async function GET(
  request: Request,
  // 🌟 1. เปลี่ยน Type ของ params ให้เป็น Promise
  { params }: { params: Promise<{ invoiceNo: string }> } 
) {
  try {
    // 🌟 2. ต้องใส่ await ก่อนดึงค่า invoiceNo ออกมาใช้
    const { invoiceNo } = await params; 

<<<<<<< HEAD
    // 💡 หมายเหตุ: หากใน Prisma Schema ของพี่กำหนด Primary Key เป็นคำว่า id 
    // อาจจะต้องเปลี่ยนจาก invoiceNo: invoiceNo เป็น id: invoiceNo แทนนะครับ
=======
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
    const invoice = await prisma.invoice.findUnique({
      where: { 
        invoiceNo: invoiceNo 
      },
      include: {
        house: {
          include: {
            owner: true, // ดึงข้อมูลเจ้าของบ้าน
<<<<<<< HEAD
            residents: true // ดึงข้อมูลผู้อยู่อาศัย
=======
            residents: true // ดึงข้อมูลผู้อยู่อาศัย (อิงตาม Schema ล่าสุดของคุณ)
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลบิลที่คุณระบุ' },
        { status: 404 }
      );
    }

<<<<<<< HEAD
    // 🌟 ดึง Config เพื่อเอาเรทค่าปรับรายวัน
    const config = await prisma.systemConfig.findFirst();
    const penaltyRatePerDay = config?.penaltyRatePerDay || 100;

    let base = truncateDecimals(Number(invoice.baseAmount || 0));
    let penalty = truncateDecimals(Number(invoice.penaltyAmount || 0));
    let currentStatus = invoice.status;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🌟 คำนวณค่าปรับแบบ "รายวัน" และ "ตัดทศนิยม" สดๆ ก่อนส่งให้หน้าเว็บลูกบ้าน
    if (['PENDING', 'OVERDUE', 'REJECTED'].includes(currentStatus)) {
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // นับเป็นวันเต็มๆ
        
        penalty = truncateDecimals(overdueDays * penaltyRatePerDay);
        currentStatus = 'OVERDUE';
      } else {
        if (currentStatus !== 'REJECTED') {
          penalty = 0;
        }
      }
    }

=======
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
<<<<<<< HEAD
        penaltyAmount: penalty, // ส่งยอดค่าปรับที่คำนวณใหม่
        totalAmount: truncateDecimals(base + penalty), // ส่งยอดรวมที่บวกค่าปรับแล้ว
        status: currentStatus, // ส่งสถานะที่อัปเดตเป็น OVERDUE (ถ้าเกินกำหนด)
=======
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
        displayMonthYear: `${invoice.billingMonth}/${invoice.billingYear + 543}`
      }
    });

  } catch (error) {
    console.error("❌ Fetch Single Invoice Error:", error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}