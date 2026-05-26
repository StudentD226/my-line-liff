export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// 🌟 Helper ตัดทศนิยมทิ้ง 
const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

function createInvoiceFlexMessage(data: any) {
  const tableContents: any[] = [];

  if (data.currentInvoiceItem) {
    tableContents.push({
      type: "box", layout: "horizontal", margin: "md",
      contents: [
        { type: "text", text: data.currentInvoiceItem.label, size: "sm", color: "#059669" }, // เอา weight: "bold" ออก
        { type: "text", text: `${data.currentInvoiceItem.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#059669", align: "end" } // เอา weight: "bold" ออก
      ]
    });
  }

  if (data.pastMonthItems && data.pastMonthItems.length > 0) {
    [...data.pastMonthItems].reverse().forEach((item: any) => {
      tableContents.push({
        type: "box", layout: "horizontal", margin: "md",
        contents: [
          { type: "text", text: item.label, size: "sm", color: "#EF4444" },
          { type: "text", text: `${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" } // เอา weight: "bold" ออก
        ]
      });
    });
  }

  if (data.pastYearTotals) {
    Object.keys(data.pastYearTotals)
      .sort((a, b) => Number(b) - Number(a))
      .forEach(yearStr => {
        const yearNum = parseInt(yearStr);
        tableContents.push({
          type: "box", layout: "horizontal", margin: "md",
          contents: [
            { type: "text", text: `ยอดค้างชำระปี ${yearNum + 543}`, size: "sm", color: "#EF4444" },
            { type: "text", text: `${data.pastYearTotals[yearNum].toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" } // เอา weight: "bold" ออก
          ]
        });
    });
  }

  if (data.totalPenalty > 0) {
    tableContents.push({
      type: "box", layout: "horizontal", margin: "md",
      contents: [
        { type: "text", text: `ค่าปรับ`, size: "sm", color: "#EA580C" },
        { type: "text", text: `${data.totalPenalty.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EA580C", align: "end" } // เอา weight: "bold" ออก
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
    mainTitle = "ยอดค้างชำระ";
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
            // 🌟 แก้ข้อความและเอา weight: "bold" ออก
            { type: "text", text: `ใบแจ้งชำระค่าส่วนกลาง\nประจำเดือน ${data.headerBillingMonthText}`, size: "xs", color: "#2A524C", margin: "sm", wrap: true, flex: 1 }
          ]
        },
        {
          type: "box", layout: "vertical", margin: "xl", backgroundColor: boxBgColor, cornerRadius: "lg", paddingAll: "lg",
          contents: [
            { type: "text", text: mainTitle, size: "xs", color: mainTextColor, weight: "bold", align: "start" },
            {
              type: "box", layout: "horizontal", margin: "sm", alignItems: "flex-end",
              contents: [
                { type: "text", text: " ", flex: 1 }, 
                { type: "text", text: data.finalGrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "xxl", weight: "bold", color: mainTextColor, align: "center", flex: 0, adjustMode: "shrink-to-fit" },
                { type: "text", text: "บาท", size: "sm", weight: "bold", color: mainTextColor, align: "end", flex: 1 }
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
                    // 🌟 1. ขยายให้ใหญ่ขึ้น (size: "sm")
                    { type: "text", text: "กรุณาชำระภายในวันที่", size: "sm", color: "#4B5563", weight: "bold" },
                    // 🌟 2. ย่อวันที่ (size: "xs") และเป็นตัวธรรมดา (weight: "regular")
                    { type: "text", text: data.dueDateText, size: "xs", color: "#EF4444", weight: "regular", margin: "xs" }
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
        ...(data.invoiceNo ? [{
          type: "box", layout: "horizontal", margin: "md",
          contents: [
            { type: "text", text: "PAYMENT ID", size: "xxs", color: "#6B7280", weight: "bold", flex: 0 },
            { type: "text", text: data.invoiceNo, size: "xxs", color: "#6B7280", weight: "bold", align: "end", flex: 1 }
          ]
        }] : [])
      ]
    }
  };
}

// ==========================================
// 1. ระบบแอดมินกดส่งบิลเอง (POST)
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 🌟 ดักจับทั้ง invoiceId และ id เพื่อแก้บั๊ก id: undefined
    const targetId = body.invoiceId || body.id; 
    const type = body.type;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ของบิล' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: targetId },
      include: { house: { include: { residents: true, owner: true } } }
    });
    const config = await prisma.systemConfig.findFirst();

    if (!invoice) return NextResponse.json({ success: false, error: 'ไม่พบบิล' }, { status: 404 });

    let displayPenalty = 0;
    let penaltyRatePerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;

    // คำนวณค่าปรับเฉพาะบิลนี้ 
    if (type === 'OVERDUE') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dueDate = new Date(invoice.dueDate); dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        const overdueMonths = Math.floor(overdueDays / 30);
        displayPenalty = truncateDecimals(overdueMonths * penaltyRatePerMonth);
        
        await prisma.invoice.update({
          where: { id: targetId },
          data: { 
            penaltyAmount: displayPenalty, 
            totalAmount: truncateDecimals(Number(invoice.baseAmount) + displayPenalty), 
            status: 'OVERDUE' 
          }
        });
      }
    } else if (type === 'SEND' || type === 'REMINDER') {
      displayPenalty = truncateDecimals(Number(invoice.penaltyAmount || 0));
    }

    const targetLineIds: string[] = [];
    invoice.house.residents.forEach(user => { if (user.lineId) targetLineIds.push(user.lineId); });
    if (invoice.house.owner?.lineId) targetLineIds.push(invoice.house.owner.lineId);
    const uniqueLineIds = [...new Set(targetLineIds)];

    if (uniqueLineIds.length === 0) return NextResponse.json({ success: false, error: 'ไม่มีลูกบ้านผูก LINE' }, { status: 400 });

    const allUnpaidInvoices = await prisma.invoice.findMany({
      where: {
        residentHouseId: invoice.residentHouseId,
        status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] as any }, // เพิ่ม PARTIAL
        billingYear: { not: 9999 } 
      },
      orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
    });

    let currentInvoiceItem: any = null;
    let pastYearTotals: Record<number, number> = {};
    let pastMonthItems: { label: string, amount: number }[] = [];
    let totalPenalty = 0;
    let grandTotalBase = 0;

    const targetYear = invoice.billingYear;
    const targetMonth = invoice.billingMonth;

    allUnpaidInvoices.forEach(inv => {
      // 🌟 ดักทางบิลอนาคต: ดึงเฉพาะบิลเป้าหมายและบิลที่เก่ากว่าเท่านั้น
      const isTargetInvoice = inv.id === invoice.id;
      const isOlderInvoice = inv.billingYear < targetYear || (inv.billingYear === targetYear && inv.billingMonth < targetMonth);

      if (isTargetInvoice || isOlderInvoice) {
        let paid = truncateDecimals(Number(inv.paidAmount || 0));
        let penalty = isTargetInvoice ? displayPenalty : truncateDecimals(Number(inv.penaltyAmount || 0));
        let base = truncateDecimals(Number(inv.baseAmount || 0));

        // 🌟 Logic หักเงินจ่ายบางส่วน (Partial)
        if (paid > 0) {
          if (paid >= penalty) {
            base = truncateDecimals(base - (paid - penalty));
            penalty = 0;
          } else {
            penalty = truncateDecimals(penalty - paid);
          }
        }

        if (base > 0 || penalty > 0) {
          grandTotalBase += base;
          totalPenalty += penalty;

          const label = `${fullThaiMonths[inv.billingMonth]} ${inv.billingYear + 543}`;

          if (isTargetInvoice) {
            currentInvoiceItem = { label, amount: base };
          } else {
            if (inv.billingYear < targetYear) {
              pastYearTotals[inv.billingYear] = truncateDecimals((pastYearTotals[inv.billingYear] || 0) + base);
            } else {
              pastMonthItems.push({ label, amount: base });
            }
          }
        }
      }
    });

    const finalGrandTotal = truncateDecimals(grandTotalBase + totalPenalty);
    const headerBillingMonthText = `${fullThaiMonths[invoice.billingMonth]} ${invoice.billingYear + 543}`;
    const dueDateObj = new Date(invoice.dueDate);
    
    // 🌟 เปลี่ยน Format วันที่ให้ใช้เว้นวรรค 07 เมษายน 2569
    const dueDateText = `${String(dueDateObj.getDate()).padStart(2, '0')} ${fullThaiMonths[dueDateObj.getMonth() + 1]} ${dueDateObj.getFullYear() + 543}`;

    const flexBubble = createInvoiceFlexMessage({
      type: type,
      houseNo: invoice.house.houseNo,
      headerBillingMonthText,
      currentInvoiceItem,
      pastYearTotals,
      pastMonthItems,
      totalPenalty,
      finalGrandTotal,
      isOverdue: type === 'OVERDUE',
      dueDateText,
      invoiceNo: invoice.invoiceNo || invoice.id 
    });

    const flexMessage: messagingApi.FlexMessage = {
      type: 'flex',
      altText: `ใบเสร็จเรียกเก็บเงิน บ้านเลขที่ ${invoice.house.houseNo}`,
      contents: flexBubble as any
    };

    for (const lineId of uniqueLineIds) {
      await client.pushMessage({ to: lineId, messages: [flexMessage] }).catch(err => console.error("Line push err:", err));
    }

    return NextResponse.json({ success: true, message: 'ส่งแจ้งเตือนสำเร็จ' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการส่ง' }, { status: 500 });
  }
}