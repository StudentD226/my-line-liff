import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function createInvoiceFlexMessage(data: any) {
  const tableContents: any[] = [];
  if (data.currentInvoiceItem) {
    tableContents.push({
      type: "box", layout: "horizontal", margin: "md",
      contents: [
        { type: "text", text: data.currentInvoiceItem.label, size: "sm", color: "#059669" },
        { type: "text", text: `${data.currentInvoiceItem.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#059669", align: "end" }
      ]
    });
  }
  if (data.pastYearTotals) {
    Object.keys(data.pastYearTotals).forEach(yearStr => {
      const yearNum = parseInt(yearStr);
      tableContents.push({
        type: "box", layout: "horizontal", margin: "md",
        contents: [
          { type: "text", text: `ยอดค้างชำระปี ${yearNum + 543}`, size: "sm", color: "#EF4444" },
          { type: "text", text: `${data.pastYearTotals[yearNum].toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
        ]
      });
    });
  }
  if (data.pastMonthItems) {
    data.pastMonthItems.forEach((item: any) => {
      tableContents.push({
        type: "box", layout: "horizontal", margin: "md",
        contents: [
          { type: "text", text: item.label, size: "sm", color: "#EF4444" },
          { type: "text", text: `${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
        ]
      });
    });
  }
  if (data.totalPenalty > 0) {
    tableContents.push({
      type: "box", layout: "horizontal", margin: "md",
      contents: [
        { type: "text", text: `ค่าปรับ`, size: "sm", color: "#EA580C" },
        { type: "text", text: `${data.totalPenalty.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EA580C", align: "end" }
      ]
    });
  }

  let boxBgColor = "#EBF5FB";
  let mainTextColor = "#111827";
  let mainTitle = "ยอดที่ต้องชำระ";

  if (data.type === 'REMINDER') {
    boxBgColor = "#FFEDD5";
    mainTextColor = "#EA580C";
    mainTitle = "แจ้งเตือนยอดที่ต้องชำระ";
  } else if (data.type === 'OVERDUE' || data.isOverdue) {
    boxBgColor = "#FDEBEC";
    mainTextColor = "#EF4444";
    mainTitle = "ยอดค้างชำเนะ";
  }

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box", layout: "vertical", paddingAll: "xl", backgroundColor: "#FFFFFF",
      contents: [
        {
          type: "box", layout: "horizontal", alignItems: "center",
          contents: [
            { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/376B64/home.png", size: "28px", flex: 0 },
            { type: "text", text: `บ้านเลขที่ ${data.houseNo}`, weight: "bold", size: "xl", color: "#111827", margin: "md" }
          ]
        },
        {
          type: "box", layout: "horizontal", margin: "md", backgroundColor: "#D1E7E3", cornerRadius: "20px", paddingAll: "sm", paddingStart: "md", paddingEnd: "md", alignItems: "flex-start",
          contents: [
            { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/2a524c/info.png", size: "16px", flex: 0, margin: "xs" },
            { type: "text", text: `ใบแจ้งชำระค่าส่วนกลาง\nประจำเดือน ${data.headerBillingMonthText}`, size: "xs", color: "#2A524C", weight: "bold", margin: "sm", wrap: true, flex: 1 }
          ]
        },
        {
          type: "box", layout: "vertical", margin: "xl", backgroundColor: boxBgColor, cornerRadius: "lg", paddingAll: "lg",
          contents: [
            { type: "text", text: mainTitle, size: "xs", color: mainTextColor, weight: "bold", align: "start" },
            {
              type: "box", layout: "horizontal", margin: "sm", justifyContent: "center", alignItems: "flex-end", spacing: "sm",
              contents: [
                { type: "text", text: data.finalGrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "xl", weight: "bold", color: mainTextColor, adjustMode: "shrink-to-fit", align: "center", flex: 0 },
                { type: "text", text: "บาท", size: "sm", weight: "bold", color: mainTextColor, flex: 0, margin: "xs" }
              ]
            }
          ]
        },
        {
          type: "box", layout: "vertical", margin: "md", borderColor: "#E5E7EB", borderWidth: "light", cornerRadius: "lg", paddingAll: "md",
          contents: tableContents.length > 0 ? tableContents : [{ type: "text", text: "ไม่พบข้อมูลรายการ", size: "sm", color: "#9CA3AF", align: "center" }]
        },
        {
          type: "box", layout: "vertical", margin: "lg",
          contents: [
            {
              type: "box", layout: "horizontal", borderColor: "#E5E7EB", borderWidth: "light", cornerRadius: "lg", paddingAll: "md", alignItems: "center", backgroundColor: "#FFFFFF",
              contents: [
                { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/376B64/calendar.png", size: "32px", flex: 0 },
                {
                  type: "box", layout: "vertical", margin: "md",
                  contents: [
                    { type: "text", text: "กรุณาชำระภายในวันที่", size: "xs", color: "#4B5563", weight: "bold" },
                    { type: "text", text: data.dueDateText, size: "md", color: "#EF4444", weight: "bold", margin: "xs" }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    footer: {
      type: "box", layout: "vertical", paddingStart: "xl", paddingEnd: "xl", paddingBottom: "xl",
      contents: [
        {
          type: "button", style: "primary", color: "#376B64", height: "sm",
          action: { type: "uri", label: "ดูประวัติและชำระเงิน", uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/invoices` }
        },
        {
          type: "box", layout: "horizontal", margin: "md",
          contents: [
            { type: "text", text: "PAYMENT ID", size: "xxs", color: "#6B7280", weight: "bold", flex: 0 },
            { type: "text", text: data.invoiceNo || "N/A", size: "xxs", color: "#6B7280", weight: "bold", align: "end", flex: 1 }
          ]
        }
      ]
    }
  };
}

async function sendAutoLineMessage(lineId: string, flexBubbleStructure: any) {
  if (!lineId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return;
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
      body: JSON.stringify({ to: lineId, messages: [{ type: "flex", altText: "ใบแจ้งชำระค่าส่วนกลาง", contents: flexBubbleStructure }] }),
    });
  } catch (error) {
    console.error('❌ Error sending LINE:', error);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });

  try {
    const config = await prisma.systemConfig.findFirst();
    if (!config) return NextResponse.json({ success: false, message: 'ไม่พบการตั้งค่าระบบ' });

    const currentDay = new Date().getDate();
    let reminderType: 'NONE' | 'REMINDER' | 'OVERDUE' = 'NONE';
    if (currentDay === config.secondReminderDay) reminderType = 'REMINDER';
    else if (currentDay === config.dueDateDay + 1) reminderType = 'OVERDUE';

    if (reminderType === 'NONE') return NextResponse.json({ success: true, message: 'วันนี้ไม่ใช่วันส่งทวงยอดค้างครับ' });

    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: { in: ['PENDING'] } },
      include: { house: { include: { residents: true } } }
    });
    if (pendingInvoices.length === 0) return NextResponse.json({ success: true, message: 'ไม่มีบิลค้างชำระที่ต้องทวง' });

    let flatPenaltyPerMonth = config.penaltyRatePerDay || 100;
    let stats = { lineSent: 0, updatedInvoices: 0 };

    for (const inv of pendingInvoices) {
      let currentPenalty = inv.penaltyAmount || 0;
      if (reminderType === 'OVERDUE') {
        const dueDate = new Date(inv.dueDate); dueDate.setHours(0, 0, 0, 0);
        const todayNoTime = new Date(); todayNoTime.setHours(0, 0, 0, 0);
        if (todayNoTime > dueDate) {
          const overdueMonths = Math.ceil(Math.ceil((todayNoTime.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) / 30);
          currentPenalty = overdueMonths * flatPenaltyPerMonth;
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { penaltyAmount: currentPenalty, totalAmount: inv.baseAmount + currentPenalty, status: 'OVERDUE' }
          });
        }
      }

      const allUnpaidForThisHouse = await prisma.invoice.findMany({
        where: { residentHouseId: inv.residentHouseId, status: { in: ['PENDING', 'OVERDUE', 'REJECTED'] } },
        orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
      });

      let currentInvoiceItem: any = null;
      let pastYearTotals: Record<number, number> = {};
      let pastMonthItems: { label: string, amount: number }[] = [];
      let totalPenalty = 0;
      let grandTotalBase = 0;
      const currentYear = inv.billingYear;

      allUnpaidForThisHouse.forEach(uInv => {
        let base = uInv.baseAmount;
        let penalty = (uInv.id === inv.id) ? currentPenalty : (uInv.penaltyAmount || 0);
        grandTotalBase += base; totalPenalty += penalty;
        const label = `${fullThaiMonths[uInv.billingMonth]} ${uInv.billingYear + 543}`;
        if (uInv.id === inv.id) {
          currentInvoiceItem = { label, amount: base };
        } else {
          if (uInv.billingYear < currentYear) pastYearTotals[uInv.billingYear] = (pastYearTotals[uInv.billingYear] || 0) + base;
          else pastMonthItems.push({ label, amount: base });
        }
      });

      const finalGrandTotal = grandTotalBase + totalPenalty;
      const isOverdue = reminderType === 'OVERDUE' || currentPenalty > 0;
      const due = new Date(inv.dueDate);
      const dueDateText = `${String(due.getDate()).padStart(2, '0')}/${String(due.getMonth() + 1).padStart(2, '0')}/${due.getFullYear() + 543}`;
      const headerBillingMonthText = `${fullThaiMonths[inv.billingMonth]} ${inv.billingYear + 543}`;

      for (const resident of inv.house.residents) {
        if (resident.lineId) {
          const flexMsg = createInvoiceFlexMessage({
            type: reminderType, houseNo: inv.house.houseNo, headerBillingMonthText,
            currentInvoiceItem, pastYearTotals, pastMonthItems, totalPenalty,
            finalGrandTotal, isOverdue, dueDateText, invoiceNo: inv.invoiceNo
          });
          await sendAutoLineMessage(resident.lineId, flexMsg);
          stats.lineSent++;
        }
      }
      stats.updatedInvoices++;
    }
    return NextResponse.json({ success: true, message: 'ส่งแจ้งเตือนสำเร็จ', stats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
