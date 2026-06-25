import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const config = await prisma.systemConfig.findFirst();
    const penaltyRatePerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;

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
        if (inv.billingYear === 9999) return false;
        if (inv.invoiceNo && inv.invoiceNo.startsWith("TR-")) return false;
        if (["OVERDUE", "PARTIAL"].includes(inv.status)) return true;
        if (inv.status === "PENDING" && inv.dueDate < today) return true;
        return false;
      });

      const paidInvoices = house.invoices.filter((inv) => inv.status === "PAID");

      const overdueMonths = unpaidInvoices.map(
        (inv) => `${thaiMonths[inv.billingMonth - 1]} ${inv.billingYear + 543}`
      );

      // 🌟 คำนวณค่าปรับแบบเดียวกับ invoice detail API
      const totalOwed = unpaidInvoices.reduce((sum, inv) => {
        const base = truncateDecimals(Number(inv.baseAmount ?? 0));
        const paid = truncateDecimals(Number(inv.paidAmount ?? 0));

        let penalty = truncateDecimals(Number(inv.penaltyAmount ?? 0));

        // คำนวณค่าปรับสดๆ ถ้าเลย dueDate แล้ว
        if (["PENDING", "OVERDUE", "PARTIAL"].includes(inv.status)) {
          const dueDate = new Date(inv.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          if (today > dueDate) {
            const diffTime = today.getTime() - dueDate.getTime();
            const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const overdueMonths = Math.floor(overdueDays / 30);
            penalty = truncateDecimals(overdueMonths * penaltyRatePerMonth);
          }
        }

        const totalDue = truncateDecimals(base + penalty);
        const outstanding = truncateDecimals(totalDue - paid);
        return sum + (outstanding > 0 ? outstanding : 0);
      }, 0);

      const lastPaidMonth =
        paidInvoices.length > 0
          ? `${thaiMonths[paidInvoices[0].billingMonth - 1]} ${paidInvoices[0].billingYear + 543}`
          : "ยังไม่เคยชำระ";

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