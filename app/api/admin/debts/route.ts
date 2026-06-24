import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// อาร์เรย์สำหรับแปลงตัวเลขเดือน เป็นชื่อเดือนภาษาไทย
const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export async function GET() {
  try {
    // 🌟 ดึงข้อมูลบ้านทั้งหมด พร้อมข้อมูลเจ้าของบ้าน (owner) และบิล (invoices)
    const houses = await prisma.house.findMany({
      include: {
        owner: true, // ดึงข้อมูลจากโมเดล User มาด้วย
        invoices: {
          // เรียงจากปีและเดือนล่าสุดลงไป
          orderBy: [
            { billingYear: 'desc' },
            { billingMonth: 'desc' }
          ]
        }
      }
    });

    const formattedDebts = houses.map((house) => {
      // 🌟 คัดกรองบิลที่ค้างจ่าย (สถานะ PENDING หรือ OVERDUE)
      const unpaidInvoices = house.invoices.filter(
        (inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE'
      );
      
      // 🌟 คัดกรองบิลที่จ่ายแล้ว (PAID)
      const paidInvoices = house.invoices.filter((inv) => inv.status === 'PAID');

      // แปลง billingMonth, billingYear เป็นตัวหนังสือ (เช่น "มีนาคม 2569")
      const overdueMonths = unpaidInvoices.map((inv) => 
        `${thaiMonths[inv.billingMonth - 1]} ${inv.billingYear + 543}`
      );
      
      // รวมยอดหนี้ทั้งหมด (ใช้ totalAmount)
      const totalOwed = unpaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      // หาเดือนล่าสุดที่จ่ายแล้ว
      const lastPaidMonth = paidInvoices.length > 0 
        ? `${thaiMonths[paidInvoices[0].billingMonth - 1]} ${paidInvoices[0].billingYear + 543}` 
        : 'ยังไม่เคยชำระ';

      // 🌟 ปั้นข้อมูลส่งกลับไปให้หน้าเว็บ (Frontend)
      return {
        id: house.id,
        houseNumber: house.houseNo,          // ดึงจากฟิลด์ houseNo
        ownerName: house.owner?.name || "-", // ดึงจาก relation owner
        phone: house.owner?.phone || "-",    // ดึงจาก relation owner
        overdueCount: unpaidInvoices.length,
        overdueMonths: overdueMonths,
        totalOwed: totalOwed,
        lastPaidMonth: lastPaidMonth,
      };
    }).filter((house) => house.overdueCount > 0); // โชว์เฉพาะบ้านที่มียอดค้าง

    return NextResponse.json({ success: true, data: formattedDebts });
  } catch (error) {
    console.error("Fetch API error:", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถดึงข้อมูลได้" }, { status: 500 });
  }
}