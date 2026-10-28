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
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const config = await prisma.systemConfig.findFirst();
    const penaltyRatePerMonth = config?.penaltyRatePerDay !== undefined && config?.penaltyRatePerDay !== null
      ? Number(config.penaltyRatePerDay)
      : 100;
    const isPenaltyDisabled = penaltyRatePerMonth <= 0;

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

    const formattedDebts: any[] = [];
    const formattedAdvances: any[] = [];

    for (const house of houses) {
      // 1. คัดกรองบิลที่ค้างชำระ (Overdue / Pending past due)
      const unpaidInvoices = house.invoices.filter((inv) => {
        if (inv.billingYear === 9999) return false;
        if (inv.invoiceNo && inv.invoiceNo.startsWith("TR-")) return false;
        if (["OVERDUE", "PARTIAL"].includes(inv.status)) return true;
        if (inv.status === "PENDING" && inv.dueDate < today) return true;
        return false;
      });

      const paidInvoices = house.invoices.filter((inv) => inv.status === "PAID");

      const overdueMonths = unpaidInvoices.map(
        (inv) => `${thaiMonths[inv.billingMonth - 1] || `เดือน ${inv.billingMonth}`} ${inv.billingYear + 543}`
      );

      const overdueDetails = unpaidInvoices.map((inv) => {
        const base = truncateDecimals(Number(inv.baseAmount ?? 0));
        const paid = truncateDecimals(Number(inv.paidAmount ?? 0));

        const isInitialBalance = inv.invoiceNo && inv.invoiceNo.startsWith("INIT-");
        let penalty = isInitialBalance
          ? truncateDecimals(Number(inv.penaltyAmount ?? 0))
          : (isPenaltyDisabled ? 0 : truncateDecimals(Number(inv.penaltyAmount ?? 0)));

        if (!isPenaltyDisabled && !isInitialBalance && ["PENDING", "OVERDUE", "PARTIAL"].includes(inv.status)) {
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

        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          billingMonth: inv.billingMonth,
          billingYear: inv.billingYear,
          yearThai: inv.billingYear + 543,
          monthName: thaiMonths[inv.billingMonth - 1] || `เดือน ${inv.billingMonth}`,
          monthLabel: `${thaiMonths[inv.billingMonth - 1] || `เดือน ${inv.billingMonth}`} ${inv.billingYear + 543}`,
          baseAmount: base,
          penaltyAmount: penalty,
          totalAmount: totalDue,
          paidAmount: paid,
          outstandingAmount: outstanding > 0 ? outstanding : 0,
          status: inv.status,
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
        };
      });

      // คำนวณยอดค้างชำระสุทธิ
      const totalOwed = unpaidInvoices.reduce((sum, inv) => {
        const base = truncateDecimals(Number(inv.baseAmount ?? 0));
        const paid = truncateDecimals(Number(inv.paidAmount ?? 0));

        const isInitialBalance = inv.invoiceNo && inv.invoiceNo.startsWith("INIT-");
        let penalty = isInitialBalance
          ? truncateDecimals(Number(inv.penaltyAmount ?? 0))
          : (isPenaltyDisabled ? 0 : truncateDecimals(Number(inv.penaltyAmount ?? 0)));

        if (!isPenaltyDisabled && !isInitialBalance && ["PENDING", "OVERDUE", "PARTIAL"].includes(inv.status)) {
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
          ? `${thaiMonths[paidInvoices[0].billingMonth - 1] || `เดือน ${paidInvoices[0].billingMonth}`} ${paidInvoices[0].billingYear + 543}`
          : "ยังไม่เคยชำระ";

      if (unpaidInvoices.length > 0 && totalOwed > 0) {
        formattedDebts.push({
          id: house.id,
          latestInvoiceId: unpaidInvoices[0]?.id ?? null,
          houseNumber: house.houseNo,
          ownerName: house.owner?.name ?? "-",
          phone: house.owner?.phone ?? "-",
          overdueCount: unpaidInvoices.length,
          overdueMonths,
          overdueDetails,
          totalOwed,
          lastPaidMonth,
        });
      }

      // 2. คัดกรองบิลที่ชำระล่วงหน้า (Advance Payments)
      // คือบิลที่ขึ้นต้นด้วย ADV- หรือเป็นบิลสถานะ PAID ในงวดอนาคต (billingYear/billingMonth > ปัจจุบัน)
      const advanceInvoices = house.invoices.filter((inv) => {
        if (inv.billingYear === 9999) return false;
        if (inv.invoiceNo && inv.invoiceNo.startsWith("TR-")) return false;
        if (inv.status !== "PAID" && inv.status !== "PARTIAL") return false;
        const paidVal = Number(inv.paidAmount || inv.totalAmount || 0);
        if (paidVal <= 0) return false;

        const isAdvInvoice = inv.invoiceNo && inv.invoiceNo.startsWith("ADV-");
        const isFuture = inv.billingYear > currentYear || (inv.billingYear === currentYear && inv.billingMonth > currentMonth);

        return isAdvInvoice || isFuture;
      });

      if (advanceInvoices.length > 0) {
        // เรียงจากงวดใกล้สุดไปไกลสุด
        advanceInvoices.sort((a, b) => {
          if (a.billingYear !== b.billingYear) return a.billingYear - b.billingYear;
          return a.billingMonth - b.billingMonth;
        });

        const advanceMonths = advanceInvoices.map(
          (inv) => `${thaiMonths[inv.billingMonth - 1] || `เดือน ${inv.billingMonth}`} ${inv.billingYear + 543}`
        );

        const advanceDetails = advanceInvoices.map((inv) => {
          const paid = truncateDecimals(Number(inv.paidAmount || inv.totalAmount || inv.baseAmount || 0));
          return {
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            billingMonth: inv.billingMonth,
            billingYear: inv.billingYear,
            yearThai: inv.billingYear + 543,
            monthName: thaiMonths[inv.billingMonth - 1] || `เดือน ${inv.billingMonth}`,
            monthLabel: `${thaiMonths[inv.billingMonth - 1] || `เดือน ${inv.billingMonth}`} ${inv.billingYear + 543}`,
            baseAmount: Number(inv.baseAmount || 0),
            paidAmount: paid,
            amount: paid,
            status: inv.status,
            paidAt: inv.paidAt ? new Date(inv.paidAt).toISOString() : null,
          };
        });

        const totalAdvanceAmount = advanceDetails.reduce((sum, d) => sum + d.amount, 0);
        const lastAdv = advanceInvoices[advanceInvoices.length - 1];
        const coveredUntil = lastAdv
          ? `${thaiMonths[lastAdv.billingMonth - 1] || `เดือน ${lastAdv.billingMonth}`} ${lastAdv.billingYear + 543}`
          : "-";

        if (totalAdvanceAmount > 0) {
          formattedAdvances.push({
            id: house.id,
            houseNumber: house.houseNo,
            ownerName: house.owner?.name ?? "-",
            phone: house.owner?.phone ?? "-",
            advanceCount: advanceInvoices.length,
            advanceMonths,
            advanceDetails,
            totalAdvanceAmount,
            coveredUntil,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: formattedDebts, // backward compatible
      debts: formattedDebts,
      advances: formattedAdvances,
    });
  } catch (error) {
    console.error("Fetch API error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถดึงข้อมูลได้" },
      { status: 500 }
    );
  }
}
