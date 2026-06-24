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
    // 1. ดึงข้อมูลบ้านทั้งหมด พร้อมข้อมูลเจ้าของบ้าน (owner) และบิล (invoices) ทั้งหมดที่มี
    const houses = await prisma.house.findMany({
      include: {
        owner: true, // ดึงข้อมูลชื่อและเบอร์โทรจากโมเดล User
        invoices: {
          // เรียงลำดับจากปีและเดือนล่าสุดลงไป เพื่อหาเดือนล่าสุดที่จ่ายเงินง่ายๆ
          orderBy: [
            { billingYear: 'desc' },
            { billingMonth: 'desc' }
          ]
        }
      }
    });

    // 2. นำข้อมูลมาวนลูปจัดการโครงสร้าง (Mapping) ให้ตรงกับหน้าเว็บหน้าบ้าน
    const formattedDebts = houses.map((house) => {
      // คัดกรองเฉพาะบิลที่ค้างจ่าย (สถานะ PENDING หรือ OVERDUE)
      const unpaidInvoices = house.invoices.filter(
        (inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE'
      );
      
      // คัดกรองเฉพาะบิลที่จ่ายเงินเรียบร้อยแล้ว (สถานะ PAID)
      const paidInvoices = house.invoices.filter((inv) => inv.status === 'PAID');

      // แปลงตัวเลข billingMonth และ billingYear ของบิลที่ค้างชำระเป็นข้อความภาษาไทย (เช่น "มกราคม 2569")
      const overdueMonths = unpaidInvoices.map((inv) => 
        `${thaiMonths[inv.billingMonth - 1]} ${inv.billingYear + 543}`
      );
      
      // รวมยอดเงินที่ค้างชำระทั้งหมดของบ้านหลังนี้จากบิลทุกใบที่ค้าง
      const totalOwed = unpaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      // ค้นหาเดือนล่าสุดที่บ้านหลังนี้จ่ายเงินสำเร็จ
      const lastPaidMonth = paidInvoices.length > 0 
        ? `${thaiMonths[paidInvoices[0].billingMonth - 1]} ${paidInvoices[0].billingYear + 543}` 
        : 'ยังไม่เคยชำระ';

      // ส่งกลับ Object ข้อมูลที่เรียบร้อยแล้ว
      return {
        id: house.id,
        houseNumber: house.houseNo,          // ดึงเลขที่บ้านจากฟิลด์ houseNo
        ownerName: house.owner?.name || "-", // ดึงชื่อเจ้าของบ้าน ถ้าไม่มีขึ้นเป็นเครื่องหมาย -
        phone: house.owner?.phone || "-",    // ดึงเบอร์โทรศัพท์ ถ้าไม่มีขึ้นเป็นเครื่องหมาย -
        overdueCount: unpaidInvoices.length, // จำนวนงวด/เดือนที่ค้าง
        overdueMonths: overdueMonths,        // อาร์เรย์รายชื่อเดือนที่ค้างชำระทั้งหมด
        totalOwed: totalOwed,                // ยอดเงินรวมที่ค้างชำระ
        lastPaidMonth: lastPaidMonth,        // สรุปเดือนล่าสุดที่จ่ายเงิน
      };
    }).filter((house) => house.overdueCount > 0); // 🌟 คัดกรองเอาเฉพาะบ้านที่มียอดค้างชำระจริงมาแสดงผล

    // ส่งข้อมูลกลับไปหา Frontend
    return NextResponse.json({ success: true, data: formattedDebts });
  } catch (error) {
    console.error("Fetch API error:", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถดึงข้อมูลได้" }, { status: 500 });
  }
}