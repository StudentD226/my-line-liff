export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// Helper ตัดทศนิยมทิ้ง
const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

function createInvoiceFlexMessage(data: any) {
  const tableContents: any[] = [];

  // 🌟 ตั้งค่า Theme สีเริ่มต้น
  let boxBgColor = "#EBF5FB"; // ฟ้าอ่อน (บิลใหม่)
  let mainTextColor = "#111827"; // ดำ (ตัวหนังสือหลัก)
  let itemTextColor = "#059669"; // เขียว (รายการบิลล่าสุด)
  let mainTitle = "ยอดที่ต้องชำระ";

  // 🌟 เปลี่ยน Theme สีตามประเภทบิล
  if (data.type === 'REMINDER') {
    boxBgColor = "#FFEDD5";     // ส้มอ่อน
    mainTextColor = "#EA580C";   // ส้มเข้ม
    itemTextColor = "#EA580C";   // 🌟 รายการบิลล่าสุด เปลี่ยนเป็นสีส้ม
    mainTitle = "แจ้งเตือนยอดที่ต้องชำระ";
  } else if (data.type === 'OVERDUE' || data.isOverdue) {
    boxBgColor = "#FDEBEC";     // แดงอ่อน
    mainTextColor = "#EF4444";   // แดงเข้ม
    itemTextColor = "#EF4444";   // 🌟 รายการบิลล่าสุด เปลี่ยนเป็นสีแดง
    mainTitle = "ยอดค้างชำระ";
  }

  // 🌟 นำสี itemTextColor มาใช้กับรายการบิลล่าสุด (เดือนล่าสุด)
  if (data.currentInvoiceItem) {
    tableContents.push({
      type: "box", layout: "horizontal", margin: "md",
      contents: [
        { type: "text", text: data.currentInvoiceItem.label, size: "sm", color: itemTextColor },
        { type: "text", text: `${data.currentInvoiceItem.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: itemTextColor, align: "end" }
      ]
    });
  }

  if (data.pastMonthItems && data.pastMonthItems.length > 0) {
    // เรียงจากเดือนเก่าที่สุดไปเดือนใหม่ล่าสุด (คงเป็นสีแดงเสมอ)
    [...data.pastMonthItems].reverse().forEach((item: any) => {
      tableContents.push({
        type: "box", layout: "horizontal", margin: "md",
        contents: [
          { type: "text", text: item.label, size: "sm", color: "#EF4444" },
          { type: "text", text: `${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
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
            { type: "text", text: `${data.pastYearTotals[yearNum].toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
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
                    { type: "text", text: "กรุณาชำระภายในวันที่", size: "sm", color: "#4B5563", weight: "bold" },
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
            { type: "text", text: "PAYMENT ID", size: "xxs", color: "#6B7280", flex: 0 },
            { type: "text", text: data.invoiceNo, size: "xxs", color: "#6B7280", align: "end", flex: 1 }
          ]
        }] : [])
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

async function handleRemindCronJob(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });

  try {
    const config = await prisma.systemConfig.findFirst();
    if (!config) return NextResponse.json({ success: false, message: 'ไม่พบการตั้งค่าระบบ' });

    const now = new Date();
    const bkkTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    const currentDay = bkkTime.getDate();
    const currentHour = String(bkkTime.getHours()).padStart(2, '0');
    const currentMinute = String(bkkTime.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    
    const targetTimeStr = config.invoiceGenerateTime || "08:00";

    // เช็คเวลา (ชั่วโมง:นาที)
    if (currentTimeStr !== targetTimeStr) {
      return NextResponse.json({ 
        success: true, 
        message: `ยังไม่ถึงเวลาทวงยอดที่กำหนดไว้ (${targetTimeStr} น.) เวลาไทยปัจจุบันคือ ${currentTimeStr} น.` 
      });
    }

    let reminderType: 'NONE' | 'REMINDER' | 'OVERDUE' = 'NONE';
    
    // 🌟 บั๊กวันทำงาน: เช็คให้ชัวร์ว่าตรงกับวันที่ใน config หรือวันที่ 15 แน่ๆ
    if (currentDay === config.secondReminderDay) {
        reminderType = 'REMINDER';
    } else if (currentDay === config.penaltyStartDay || currentDay === 15) {
        reminderType = 'OVERDUE';
    }

    // 🌟 ถ้าไม่ใช่วันที่กำหนด ให้เด้งออกทันที
    if (reminderType === 'NONE') {
        return NextResponse.json({ success: true, message: `วันนี้ (วันที่ ${currentDay}) ไม่ใช่วันส่งทวงยอดค้างครับ` });
    }

    // 1. ดักจับตั้งแต่ใน DB เลยว่าไม่หยิบบิลทดสอบ TR- มารันส่งทวงหนี้
    const pendingInvoices = await prisma.invoice.findMany({
      where: { 
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE', 'REJECTED'] as any },
        billingYear: { not: 9999 },
        NOT: {
          invoiceNo: { startsWith: 'TR-' }
        }
      },
      include: { house: { include: { residents: true } } }
    });
    
    if (pendingInvoices.length === 0) return NextResponse.json({ success: true, message: 'ไม่มีบิลค้างชำระที่ต้องทวง' });

    const penaltyRatePerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    let stats = { lineSent: 0, updatedInvoices: 0 };

    if (reminderType === 'OVERDUE') {
      for (const inv of pendingInvoices) {
        const dueDate = new Date(inv.dueDate); dueDate.setHours(0, 0, 0, 0);
        const todayNoTime = new Date(); todayNoTime.setHours(0, 0, 0, 0);

        if (todayNoTime > dueDate) {
          const diffTime = todayNoTime.getTime() - dueDate.getTime();
          const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const overdueMonths = Math.ceil(overdueDays / 30);

          const currentPenalty = truncateDecimals(overdueMonths * penaltyRatePerMonth);

          await prisma.invoice.update({
            where: { id: inv.id },
            data: {
              penaltyAmount: currentPenalty,
              totalAmount: truncateDecimals(Number(inv.baseAmount) + currentPenalty),
              status: inv.status === 'PARTIAL' ? 'PARTIAL' : 'OVERDUE'
            }
          });
        }
      }
    }

    const uniqueHouseMap = new Map<string, any[]>();
    pendingInvoices.forEach(inv => {
      const list = uniqueHouseMap.get(inv.residentHouseId) || [];
      list.push(inv);
      uniqueHouseMap.set(inv.residentHouseId, list);
    });

    for (const [houseId, invList] of uniqueHouseMap.entries()) {
      const sampleInv = invList[0];

      // 2. ดักบิล TR- ไม่ให้โผล่เข้ามารวมในหนี้ค้างชำระในอดีตของบ้านหลังนั้นๆ
      const allUnpaidForThisHouse = await prisma.invoice.findMany({
        where: { 
          residentHouseId: houseId, 
          status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] as any },
          billingYear: { not: 9999 },
          NOT: {
            invoiceNo: { startsWith: 'TR-' }
          }
        },
        orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }] // เอาใบใหม่ล่าสุดขึ้นก่อน
      });

      if (allUnpaidForThisHouse.length === 0) continue;

      const latestInv = allUnpaidForThisHouse[0];
      
      let currentInvoiceItem: any = null;
      let pastYearTotals: Record<number, number> = {};
      let pastMonthItems: { label: string, amount: number }[] = [];
      let totalPenalty = 0;
      let grandTotalBase = 0;
      const targetYear = latestInv.billingYear;
      const targetMonth = latestInv.billingMonth;

      allUnpaidForThisHouse.forEach(uInv => {
        let paid = truncateDecimals(Number(uInv.paidAmount || 0));
        let penalty = truncateDecimals(Number(uInv.penaltyAmount || 0));
        let base = truncateDecimals(Number(uInv.baseAmount || 0));

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
          const label = `${fullThaiMonths[uInv.billingMonth]} ${uInv.billingYear + 543}`;
          
          if (uInv.id === latestInv.id) {
            currentInvoiceItem = { label, amount: base };
          } else {
            if (uInv.billingYear < targetYear) {
              pastYearTotals[uInv.billingYear] = truncateDecimals((pastYearTotals[uInv.billingYear] || 0) + base);
            } else {
              pastMonthItems.push({ label, amount: base });
            }
          }
        }
      });

      const finalGrandTotal = truncateDecimals(grandTotalBase + totalPenalty);
      const isOverdue = reminderType === 'OVERDUE' || totalPenalty > 0;
      const due = new Date(latestInv.dueDate);
      
      const dueDateText = `${String(due.getDate()).padStart(2, '0')} ${fullThaiMonths[due.getMonth() + 1]} ${due.getFullYear() + 543}`;
      const headerBillingMonthText = `${fullThaiMonths[latestInv.billingMonth]} ${latestInv.billingYear + 543}`;

      for (const resident of sampleInv.house.residents) {
        if (resident.lineId) {
          const flexMsg = createInvoiceFlexMessage({
            type: reminderType, houseNo: sampleInv.house.houseNo, headerBillingMonthText,
            currentInvoiceItem, pastYearTotals, pastMonthItems, totalPenalty,
            finalGrandTotal, isOverdue, dueDateText, 
            invoiceNo: latestInv.invoiceNo || latestInv.id
          });
          await sendAutoLineMessage(resident.lineId, flexMsg);
          stats.lineSent++;
        }
      }
      stats.updatedInvoices += invList.length;
    }

    return NextResponse.json({ success: true, message: 'ส่งแจ้งเตือนสำเร็จ', stats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) { return handleRemindCronJob(request); }
export async function POST(request: Request) { return handleRemindCronJob(request); }