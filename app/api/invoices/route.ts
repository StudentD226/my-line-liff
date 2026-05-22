import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

<<<<<<< HEAD
// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น (ป้องกันเลขรวน)
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

=======
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const houseId = searchParams.get('houseId');

    // สร้างเงื่อนไขในการ Query
    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (houseId) {
      whereClause.residentHouseId = parseInt(houseId);
    }

    // ดึงข้อมูลบิลพร้อมความสัมพันธ์ของบ้าน
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        house: true,
      },
      orderBy: [
        { billingYear: 'desc' },
        { billingMonth: 'desc' },
      ],
    });

    const config = await prisma.systemConfig.findFirst();
<<<<<<< HEAD
    let penaltyRatePerDay = config?.penaltyRatePerDay || 100; // 🌟 เปลี่ยนเป็นเรทรายวัน
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🌟 วนลูปคำนวณค่าปรับและยอดรวมใหม่แบบ "รายวัน" + "ตัดทศนิยม" ให้ตรงกับบิล LINE
    const updatedInvoices = invoices.map((inv) => {
      let base = truncateDecimals(Number(inv.baseAmount || 0));
      let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
=======
    let flatPenaltyPerMonth = config?.penaltyRatePerDay || 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🌟 วนลูปคำนวณค่าปรับและยอดรวมใหม่แบบเหมาจ่ายรายเดือน ให้ตัวเลขหน้าแอดมินตรงกับหน้าลูกบ้าน
    const updatedInvoices = invoices.map((inv) => {
      let base = Number(inv.baseAmount || 0);
      let penalty = Number(inv.penaltyAmount || 0);
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
      let currentStatus = inv.status;

      // ถ้าบิลยังไม่จ่าย หรือค้างชำระ ให้คำนวณค่าปรับใหม่ตามเวลาจริง
      if (['PENDING', 'OVERDUE', 'REJECTED'].includes(currentStatus)) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
<<<<<<< HEAD
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // 🌟 นับเป็นวันเต็มๆ
          
          penalty = truncateDecimals(overdueDays * penaltyRatePerDay); // 🌟 คูณรายวัน
=======
          const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const overdueMonths = Math.ceil(overdueDays / 30);
          
          penalty = overdueMonths * flatPenaltyPerMonth;
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
          currentStatus = 'OVERDUE';
        } else {
          // ถ้ายังไม่เกินกำหนด และเป็นเศษเก่า ให้ล้างเป็น 0
          if (currentStatus !== 'REJECTED') {
            penalty = 0;
          }
        }
      }

      return {
        ...inv,
        penaltyAmount: penalty,
<<<<<<< HEAD
        totalAmount: truncateDecimals(base + penalty), // 🌟 ยอดรวมตัดทศนิยม
=======
        totalAmount: base + penalty,
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
        status: currentStatus
      };
    });

    return NextResponse.json({
      success: true,
      data: updatedInvoices,
    });

  } catch (error) {
    console.error("❌ Admin Invoices GET API Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบิล' }, { status: 500 });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> beebffa78c74a820bb614030891dc51dfd84ad7d
