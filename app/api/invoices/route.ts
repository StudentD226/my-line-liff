import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น (ป้องกันเลขรวน)
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

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
    let penaltyRatePerDay = config?.penaltyRatePerDay || 100; // 🌟 เปลี่ยนเป็นเรทรายวัน
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🌟 วนลูปคำนวณค่าปรับและยอดรวมใหม่แบบ "รายวัน" + "ตัดทศนิยม" ให้ตรงกับบิล LINE
    const updatedInvoices = invoices.map((inv) => {
      let base = truncateDecimals(Number(inv.baseAmount || 0));
      let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
      let currentStatus = inv.status;

      // ถ้าบิลยังไม่จ่าย หรือค้างชำระ ให้คำนวณค่าปรับใหม่ตามเวลาจริง
      if (['PENDING', 'OVERDUE', 'REJECTED'].includes(currentStatus)) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          const diffTime = today.getTime() - dueDate.getTime();
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // 🌟 นับเป็นวันเต็มๆ
          
          penalty = truncateDecimals(overdueDays * penaltyRatePerDay); // 🌟 คูณรายวัน
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
        totalAmount: truncateDecimals(base + penalty), // 🌟 ยอดรวมตัดทศนิยม
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
}
