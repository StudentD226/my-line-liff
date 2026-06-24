import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// 🌟 สั่งให้ Next.js ดึงข้อมูลใหม่สดๆ จาก Database ทุกครั้งที่มีการเรียกใช้งาน (ปิด Cache 100%)
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

// อาร์เรย์สำหรับแปลงตัวเลขเดือน เป็นชื่อเดือนภาษาไทย
const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export async function GET() {
  try {
    const houses = await prisma.house.findMany({
      include: {
        owner: true,
        invoices: {
          orderBy: [
            { billingYear: 'desc' },
            { billingMonth: 'desc' }
          ]
        }
      }
    });

    const formattedDebts = houses.map((house) => {
      // 🌟 คัดกรองเอาเฉพาะที่เป็น "หนี้" จริงๆ คือ OVERDUE และ PARTIAL เท่านั้น! (เตะ PENDING ทิ้ง)
      const unpaidInvoices = house.invoices.filter(
        (inv) => ['OVERDUE', 'PARTIAL'].includes(inv.status) &&
                 inv.billingYear !== 9999 &&
                 !(inv.invoiceNo && inv.invoiceNo.startsWith('TR-'))
      );
      
      const paidInvoices = house.invoices.filter((inv) => inv.status === 'PAID');

      // ดึงรายชื่อเดือนที่ค้างชำระมาเก็บไว้เป็น Array
      const overdueMonths = unpaidInvoices.map((inv) => 
        `${thaiMonths[inv.billingMonth - 1]} ${inv.billingYear + 543}`
      );
      
      // ยอดเงินรวม = ยอดเต็มที่ต้องจ่าย (รวมค่าปรับ) ลบด้วย ยอดที่ลูกบ้านจ่ายมาแล้วบางส่วน
      const totalOwed = unpaidInvoices.reduce((sum, inv) => {
        const debt = Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0);
        return sum + (debt > 0 ? debt : 0);
      }, 0);
      
      const lastPaidMonth = paidInvoices.length > 0 
        ? `${thaiMonths[paidInvoices[0].billingMonth - 1]} ${paidInvoices[0].billingYear + 543}` 
        : 'ยังไม่เคยชำระ';

      return {
        id: house.id,
        latestInvoiceId: unpaidInvoices[0]?.id,
        houseNumber: house.houseNo,
        ownerName: house.owner?.name || "-",
        phone: house.owner?.phone || "-",
        overdueCount: unpaidInvoices.length,
        overdueMonths: overdueMonths,
        totalOwed: totalOwed,
        lastPaidMonth: lastPaidMonth,
      };
    }).filter((house) => house.overdueCount > 0 && house.totalOwed > 0); // โชว์เฉพาะที่ค้างจริงและยอดหนี้มากกว่า 0

    return NextResponse.json({ success: true, data: formattedDebts });
  } catch (error) {
    console.error("Fetch API error:", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถดึงข้อมูลได้" }, { status: 500 });
  }
}