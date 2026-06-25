import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export async function GET() {
  try {
    const houses = await prisma.house.findMany({
      include: {
        owner: true,
        invoices: {
          orderBy: [
            { billingYear: "desc" },
            { billingMonth: "desc" },
          ],
        },
      },
    });

    const formattedDebts = houses.map((house) => {
      const unpaidInvoices = house.invoices.filter((inv) => {
        // ตัดบิล dummy / ทดสอบออก
        if (inv.billingYear === 9999) return false;
        if (inv.invoiceNo && inv.invoiceNo.startsWith("TR-")) return false;
        // เอาเฉพาะ OVERDUE และ PARTIAL เท่านั้น
        return ["OVERDUE", "PARTIAL"].includes(inv.status);
      });

      const paidInvoices = house.invoices.filter((inv) => inv.status === "PAID");

      const overdueMonths = unpaidInvoices.map(
        (inv) => `${thaiMonths[inv.billingMonth - 1]} ${inv.billingYear + 543}`
      );

      const totalOwed = unpaidInvoices.reduce((sum, inv) => {
        const debt = Number(inv.totalAmount ?? 0) - Number(inv.paidAmount ?? 0);
        return sum + (debt > 0 ? debt : 0);
      }, 0);

      const lastPaidMonth =
        paidInvoices.length > 0
          ? `${thaiMonths[paidInvoices[0].billingMonth - 1]} ${paidInvoices[0].billingYear + 543}`
          : "ยังไม่เคยชำระ";

      // ------- Debug log (ลบออกได้หลังหาบัคเจอ) -------
      console.log(
        `[DEBUG] ${house.houseNo}`,
        `| total invoices: ${house.invoices.length}`,
        `| unpaid (OVERDUE/PARTIAL): ${unpaidInvoices.length}`,
        `| totalOwed: ${totalOwed}`,
        `| statuses: ${[...new Set(house.invoices.map((i) => i.status))].join(", ") || "ไม่มีบิล"}`
      );
      // ---------------------------------------------------

      return {
        id: house.id,
        latestInvoiceId: unpaidInvoices[0]?.id ?? null,
        houseNumber: house.houseNo,
        ownerName: house.owner?.name ?? "-",
        phone: house.owner?.phone ?? "-",
        overdueCount: unpaidInvoices.length,
        overdueMonths,
        totalOwed,
        lastPaidMonth,
      };
    });

    const result = formattedDebts.filter(
      (h) => h.overdueCount > 0 && h.totalOwed > 0
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Fetch API error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถดึงข้อมูลได้" },
      { status: 500 }
    );
  }
}