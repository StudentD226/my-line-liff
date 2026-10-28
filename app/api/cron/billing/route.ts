export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

function createInvoiceFlexMessage(data: any) {
  const tableContents: any[] = [];

  // 🌟 ตั้งค่า Theme สีเริ่มต้น (สีฟ้า - บิลปกติ)
  let boxBgColor = "#EBF5FB"; 
  let mainTextColor = "#111827"; 
  let itemTextColor = "#059669"; // สีเขียวสำหรับรายการบิลปกติ
  let mainTitle = "ยอดที่ต้องชำระ";

  let showHistory = false;
  let displayGrandTotal = data.currentInvoiceItem ? data.currentInvoiceItem.amount : data.finalGrandTotal;

  // 🌟 เปลี่ยน Theme สีตามประเภทบิล
  if (data.type === 'OVERDUE' || data.isOverdue) {
    boxBgColor = "#FDEBEC";     
    mainTextColor = "#EF4444";   
    itemTextColor = "#EF4444";   // แดง (ค้างชำระ)
    mainTitle = "ยอดค้างชำระ";
    showHistory = true; 
    displayGrandTotal = data.finalGrandTotal; 
  } else if (data.type === 'REMINDER') {
    boxBgColor = "#FFEDD5";     
    mainTextColor = "#EA580C";   
    itemTextColor = "#EA580C";   // ส้ม (ทวงล่วงหน้า)
    mainTitle = "แจ้งเตือนยอดที่ต้องชำระ";
    showHistory = true; 
    displayGrandTotal = data.finalGrandTotal; 
  }

  if (data.currentInvoiceItem) {
    tableContents.push({
      type: "box", layout: "horizontal", margin: "md",
      contents: [
        { type: "text", text: data.currentInvoiceItem.label, size: "sm", color: itemTextColor }, 
        { type: "text", text: `${data.currentInvoiceItem.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: itemTextColor, align: "end" } 
      ]
    });
  }

  if (showHistory) {
    if (data.pastMonthItems && data.pastMonthItems.length > 0) {
      data.pastMonthItems.forEach((item: any) => {
        tableContents.push({
          type: "box", layout: "horizontal", margin: "md",
          contents: [
            { type: "text", text: item.label, size: "sm", color: itemTextColor }, 
            { type: "text", text: `${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: itemTextColor, align: "end" } 
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
              { type: "text", text: `ยอดค้างปี ${yearNum + 543}`, size: "sm", color: itemTextColor }, 
              { type: "text", text: `${data.pastYearTotals[yearNum].toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: itemTextColor, align: "end" } 
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
                { type: "text", text: displayGrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "xxl", weight: "bold", color: mainTextColor, align: "center", flex: 0, adjustMode: "shrink-to-fit" },
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
        },
        ...(data.lastPaidText ? [{
          type: "box", layout: "horizontal", margin: "md", backgroundColor: "#F8FAFC", cornerRadius: "lg", paddingAll: "sm", paddingStart: "md", paddingEnd: "md", alignItems: "center", borderWidth: "light", borderColor: "#E2E8F0",
          contents: [
            { type: "text", text: "ชำระล่าสุดถึงงวด:", size: "xs", color: "#64748B", weight: "bold", flex: 0 },
            { type: "text", text: data.lastPaidText, size: "xs", color: "#0F766E", weight: "bold", align: "end", flex: 1 }
          ]
        }] : [])
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

async function sendAutoLineMessage(lineId: string, flexBubbleStructure: any) {
  if (!lineId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return;
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineId,
        messages: [{ type: "flex", altText: "ใบแจ้งชำระค่าส่วนกลาง", contents: flexBubbleStructure }]
      }),
    });
    if (response.ok) console.log(`✅ ส่งบิลเข้า LINE สำเร็จ: ${lineId}`);
  } catch (error) {
    console.error('❌ Error sending LINE:', error);
  }
}

// ==========================================
// ระบบแอดมินกดส่งบิลเอง (POST) 
// (มีติดไว้เผื่อเรียกใช้จากหน้าแอดมิน)
// ==========================================
async function handleManualSend(request: Request) {
  try {
    const body = await request.json();
    const targetId = body.invoiceId || body.id; 
    const type = body.type;

    if (!targetId) return NextResponse.json({ success: false, error: 'ไม่พบ ID ของบิล' }, { status: 400 });

    const invoice = await prisma.invoice.findUnique({
      where: { id: targetId },
      include: { house: { include: { residents: true, owner: true } } }
    });
    const config = await prisma.systemConfig.findFirst();

    if (!invoice) return NextResponse.json({ success: false, error: 'ไม่พบบิล' }, { status: 404 });

    let displayPenalty = 0;
    const penaltyRatePerMonth = config?.penaltyRatePerDay !== undefined && config?.penaltyRatePerDay !== null
      ? Number(config.penaltyRatePerDay)
      : 100;
    const isPenaltyDisabled = penaltyRatePerMonth <= 0;

    const todayObj = new Date(); todayObj.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(invoice.dueDate); dueDateObj.setHours(0, 0, 0, 0);
    const isPastDue = todayObj > dueDateObj;
    const isInitialBalance = invoice.invoiceNo && invoice.invoiceNo.startsWith('INIT-');

    if (type === 'OVERDUE') {
      if (!isPenaltyDisabled && !isInitialBalance && isPastDue) {
        const diffTime = todayObj.getTime() - dueDateObj.getTime();
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
      } else if (isPenaltyDisabled && !isInitialBalance) {
        displayPenalty = 0;
      }
    } else if (type === 'SEND' || type === 'REMINDER') {
      displayPenalty = isInitialBalance
        ? truncateDecimals(Number(invoice.penaltyAmount || 0))
        : (isPenaltyDisabled ? 0 : truncateDecimals(Number(invoice.penaltyAmount || 0)));
    }

    const targetLineIds: string[] = [];
    invoice.house.residents.forEach(user => { if (user.lineId) targetLineIds.push(user.lineId); });
    if (invoice.house.owner?.lineId) targetLineIds.push(invoice.house.owner.lineId);
    const uniqueLineIds = [...new Set(targetLineIds)];

    if (uniqueLineIds.length === 0) return NextResponse.json({ success: false, error: 'ไม่มีลูกบ้านผูก LINE' }, { status: 400 });

    const allUnpaidInvoices = await prisma.invoice.findMany({
      where: {
        residentHouseId: invoice.residentHouseId,
        status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] as any }, 
        billingYear: { not: 9999 } 
      },
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }]
    });

    let currentInvoiceItem: any = null;
    let pastYearTotals: Record<number, number> = {};
    let pastMonthItems: { label: string, amount: number }[] = [];
    let totalPenalty = 0;
    let grandTotalBase = 0;

    const targetYear = invoice.billingYear;
    const targetMonth = invoice.billingMonth;

    allUnpaidInvoices.forEach(inv => {
      const isTargetInvoice = inv.id === invoice.id;
      const isOlderInvoice = inv.billingYear < targetYear || (inv.billingYear === targetYear && inv.billingMonth < targetMonth);

      if (isTargetInvoice || isOlderInvoice) {
        if (!isTargetInvoice && inv.invoiceNo && inv.invoiceNo.startsWith('TR-')) return;

        let paid = truncateDecimals(Number(inv.paidAmount || 0));
        let penalty = isTargetInvoice ? displayPenalty : truncateDecimals(Number(inv.penaltyAmount || 0));
        let base = truncateDecimals(Number(inv.baseAmount || 0));

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
    const dueDateText = `${String(dueDateObj.getDate()).padStart(2, '0')} ${fullThaiMonths[dueDateObj.getMonth() + 1]} ${dueDateObj.getFullYear() + 543}`;

    // คำนวณงวดที่ชำระล่าสุด
    const lastPaidInvoice = await prisma.invoice.findFirst({
      where: {
        residentHouseId: invoice.residentHouseId,
        status: 'PAID',
        billingYear: { not: 9999 },
        invoiceNo: { not: { startsWith: 'TR-' } }
      },
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }]
    });

    let lastPaidText = '';
    if (lastPaidInvoice) {
      lastPaidText = `${fullThaiMonths[lastPaidInvoice.billingMonth]} ${lastPaidInvoice.billingYear + 543}`;
    } else {
      const sortedUnpaid = [...allUnpaidInvoices].sort((a,b) => (a.billingYear*12 + a.billingMonth) - (b.billingYear*12 + b.billingMonth));
      const earliest = sortedUnpaid[0];
      if (earliest) {
        let prevM = earliest.billingMonth - 1;
        let prevY = earliest.billingYear;
        if (prevM < 1) { prevM = 12; prevY--; }
        lastPaidText = `${fullThaiMonths[prevM]} ${prevY + 543}`;
      } else {
        lastPaidText = `${fullThaiMonths[invoice.billingMonth]} ${invoice.billingYear + 543}`;
      }
    }

    const flexBubble = createInvoiceFlexMessage({
      type: type,
      houseNo: invoice.house.houseNo,
      headerBillingMonthText,
      currentInvoiceItem,
      pastYearTotals,
      pastMonthItems,
      totalPenalty,
      finalGrandTotal,
      isOverdue: type === 'OVERDUE' || totalPenalty > 0 || isPastDue || invoice.status === 'OVERDUE',
      dueDateText,
      invoiceNo: invoice.invoiceNo || invoice.id,
      lastPaidText: lastPaidText,
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

// ==========================================
// 🌟 ระบบหุ่นยนต์ส่งบิลปกติ (Cron Job) 🌟
// ==========================================
async function handleCronJob(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized - คุณไม่มีสิทธิ์เข้าถึง', { status: 401 });
  }

  try {
    const config = await prisma.systemConfig.findFirst();
    if (!config) return NextResponse.json({ success: false, message: 'ไม่พบการตั้งค่าระบบ' });

    const now = new Date();
    const bkkTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    const url = new URL(request.url);
    const isForce = url.searchParams.get('force') === 'true';
    const targetHouseNo = url.searchParams.get('houseNo')?.trim();
    const isDryRun = url.searchParams.get('dryRun') === 'true';

    const currentDay = bkkTime.getDate();
    const currentHour = bkkTime.getHours();
    
    // ดึงเวลาที่กำหนดไว้จากระบบ (เช่น "09:00" -> ชั่วโมง 9)
    const generateTimeStr = config.invoiceGenerateTime || "08:00";
    const [targetHourStr] = generateTimeStr.split(':');
    const targetHour = parseInt(targetHourStr, 10);

    // 🌟 เช็คเฉพาะชั่วโมง: ถ้าไม่ใช่ชั่วโมงที่ตั้งไว้ (และไม่ได้ระบุ ?force=true) ให้ข้าม
    if (!isForce && currentHour !== targetHour) {
      return NextResponse.json({ 
        success: true, 
        message: `ยังไม่ถึงชั่วโมงทำงานที่กำหนดไว้ (${generateTimeStr} น.) เวลาไทยปัจจุบันคือ ${String(currentHour).padStart(2, '0')}:${String(bkkTime.getMinutes()).padStart(2, '0')} น.` 
      });
    }

    // 1. สร้างบิลใหม่ถ้าถึงวันที่ตั้งไว้ (หรือ force)
    if (currentDay === config.invoiceGenerateDay || isForce) {
      let targetMonth = bkkTime.getMonth() + 2; 
      let targetYear = bkkTime.getFullYear();
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }

      const houses = await prisma.house.findMany({
        where: targetHouseNo ? { houseNo: targetHouseNo } : undefined
      });

      if (houses.length === 0 && targetHouseNo) {
        return NextResponse.json({ success: false, message: `ไม่พบบ้านเลขที่ ${targetHouseNo} ในระบบ` });
      }

      const dueDate = new Date(targetYear, targetMonth - 1, config.dueDateDay, 23, 59, 59);
      const dayStr = String(bkkTime.getDate()).padStart(2, '0');
      const monthStr = String(bkkTime.getMonth() + 1).padStart(2, '0');
      const yearStrTh = String(bkkTime.getFullYear() + 543);

      for (const house of houses) {
        const existingHouseInvoice = await prisma.invoice.findFirst({
          where: { 
            residentHouseId: house.id,
            billingMonth: targetMonth, 
            billingYear: targetYear,
            invoiceNo: { not: { startsWith: 'TR-' } }
          }
        });

        if (existingHouseInvoice) {
          continue; // 🌟 ถ้าบ้านนี้มีบิลเดือนนี้แล้ว (เช่น ชำระล่วงหน้า ADV- หรือ PENDING อยู่แล้ว) ให้ข้ามไป ไม่สร้างบิลซ้ำ
        }

        const monthlyRate = truncateDecimals(
          house.feeType === 'CALCULATED' && house.houseSize
            ? Number(house.feeRate) * Number(house.houseSize)
            : Number(house.feeRate || 1000)
        );
        const customInvoiceNo = `${house.houseNo}-${dayStr}${monthStr}${yearStrTh}-M${String(targetMonth).padStart(2, '0')}`;

        if (!isDryRun) {
          try {
            await prisma.invoice.create({
              data: {
                invoiceNo: customInvoiceNo,
                billingMonth: targetMonth,
                billingYear: targetYear,
                baseAmount: monthlyRate,
                totalAmount: monthlyRate,
                paidAmount: 0, 
                status: 'PENDING',
                isNotified: false,
                dueDate: dueDate,
                scheduledSendAt: now,
                residentHouseId: house.id
              }
            });
          } catch (createErr: any) {
            if (createErr?.code === 'P2002') {
              console.log(`Invoice ${customInvoiceNo} already exists, skipping.`);
            } else {
              throw createErr;
            }
          }
        }
      }
    }

    // 2. ดึงเฉพาะบิลใหม่ที่ยังไม่เคยส่ง (isNotified: false)
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        isNotified: false,
        scheduledSendAt: { lte: now },
        status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] as any }, 
        billingYear: { not: 9999 },
        ...(targetHouseNo ? { house: { houseNo: targetHouseNo } } : {}),
        NOT: {
          invoiceNo: { startsWith: 'TR-' }
        }
      },
      include: {
        house: { include: { residents: true } }
      }
    });

    if (pendingInvoices.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: (currentDay === config.invoiceGenerateDay || isForce)
          ? 'สร้างบิลและส่งข้อความครบถ้วนแล้ว หรือไม่มีบิลใหม่ที่ต้องส่ง' 
          : `วันนี้ (วันที่ ${currentDay}) ไม่ใช่วันออกบิลประจำเดือน (วันที่ ${config.invoiceGenerateDay})` 
      });
    }

    const penaltyRatePerMonth = config?.penaltyRatePerDay !== undefined && config?.penaltyRatePerDay !== null
      ? Number(config.penaltyRatePerDay)
      : 100;
    const isPenaltyDisabled = penaltyRatePerMonth <= 0;
    let stats = { lineSent: 0, updatedInvoices: 0 };
    const todayObj = new Date(); todayObj.setHours(0, 0, 0, 0);

    // 🌟 3. อัปเดตค่าปรับสำหรับบิลตัวหลัก (ที่ยังไม่เคยส่ง)
    for (const inv of pendingInvoices) {
      const dueDateObj = new Date(inv.dueDate); dueDateObj.setHours(0, 0, 0, 0);
      const isInvInitialBalance = inv.invoiceNo && inv.invoiceNo.startsWith('INIT-');
      let currentPenalty = isInvInitialBalance
        ? truncateDecimals(Number(inv.penaltyAmount || 0))
        : (isPenaltyDisabled ? 0 : truncateDecimals(Number(inv.penaltyAmount || 0)));

      if (!isPenaltyDisabled && !isInvInitialBalance && todayObj > dueDateObj && currentPenalty === 0) {
        let monthsLate = (todayObj.getFullYear() - dueDateObj.getFullYear()) * 12 + (todayObj.getMonth() - dueDateObj.getMonth());
        if (monthsLate <= 0) monthsLate = 1;
        currentPenalty = truncateDecimals(monthsLate * penaltyRatePerMonth);

        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            penaltyAmount: currentPenalty,
            totalAmount: truncateDecimals(Number(inv.baseAmount) + currentPenalty),
            status: inv.status === 'PARTIAL' ? 'PARTIAL' : 'OVERDUE' 
          }
        });
      } else if (isPenaltyDisabled && !isInvInitialBalance && Number(inv.penaltyAmount) > 0) {
        currentPenalty = 0;
        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            penaltyAmount: 0,
            totalAmount: truncateDecimals(Number(inv.baseAmount))
          }
        });
      }
    }

    // จัดกลุ่มตามบ้านเพื่อรวมยอดหนี้ค้าง
    const uniqueHouseMap = new Map<string, any[]>();
    pendingInvoices.forEach(inv => {
      const list = uniqueHouseMap.get(inv.residentHouseId) || [];
      list.push(inv);
      uniqueHouseMap.set(inv.residentHouseId, list);
    });

    for (const [houseId, invList] of uniqueHouseMap.entries()) {
      const sampleInv = invList[0];
      if (!sampleInv || !sampleInv.house) continue;

      // ดึงประวัติค้างชำระทั้งหมดของบ้านนี้
      const allUnpaidForThisHouse = await prisma.invoice.findMany({
        where: {
          residentHouseId: houseId,
          status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] as any },
          billingYear: { not: 9999 },
          NOT: {
            invoiceNo: { startsWith: 'TR-' }
          }
        },
        orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }] 
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

      // 🌟 4. รวมยอด และแอบคำนวณค่าปรับสดๆ ให้บิลเก่า (ที่หลุดรอดมา) ด้วย
      allUnpaidForThisHouse.forEach(uInv => {
        let paid = truncateDecimals(Number(uInv.paidAmount || 0));
        let penalty = truncateDecimals(Number(uInv.penaltyAmount || 0));
        let base = truncateDecimals(Number(uInv.baseAmount || 0));

        const uInvDueDate = uInv.dueDate ? new Date(uInv.dueDate) : new Date();
        uInvDueDate.setHours(0, 0, 0, 0);
        const isUInvInitialBalance = uInv.invoiceNo && uInv.invoiceNo.startsWith('INIT-');

        if (!isPenaltyDisabled && !isUInvInitialBalance && todayObj > uInvDueDate && penalty === 0) {
          let monthsLate = (todayObj.getFullYear() - uInvDueDate.getFullYear()) * 12 + (todayObj.getMonth() - uInvDueDate.getMonth());
          if (monthsLate <= 0) monthsLate = 1;
          penalty = truncateDecimals(monthsLate * penaltyRatePerMonth);
        } else if (isPenaltyDisabled && !isUInvInitialBalance) {
          penalty = 0;
        }

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
      
      const due = new Date(latestInv.dueDate); due.setHours(0, 0, 0, 0);
      const isPastDue = todayObj > due;
      
      const isOverdue = latestInv.status === 'OVERDUE' || allUnpaidForThisHouse.some(u => u.status === 'OVERDUE') || totalPenalty > 0 || isPastDue;

      const dueDateText = `${String(due.getDate()).padStart(2, '0')} ${fullThaiMonths[due.getMonth() + 1]} ${due.getFullYear() + 543}`;
      const headerBillingMonthText = `${fullThaiMonths[latestInv.billingMonth]} ${latestInv.billingYear + 543}`;

      const lastPaidForThisHouse = await prisma.invoice.findFirst({
        where: {
          residentHouseId: sampleInv.house.id,
          status: 'PAID',
          billingYear: { not: 9999 },
          invoiceNo: { not: { startsWith: 'TR-' } }
        },
        orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }]
      });

      let lastPaidText = '';
      if (lastPaidForThisHouse) {
        lastPaidText = `${fullThaiMonths[lastPaidForThisHouse.billingMonth]} ${lastPaidForThisHouse.billingYear + 543}`;
      } else {
        const sortedUnpaid = [...allUnpaidForThisHouse].sort((a,b) => (a.billingYear*12 + a.billingMonth) - (b.billingYear*12 + b.billingMonth));
        const earliest = sortedUnpaid[0];
        if (earliest) {
          let prevM = earliest.billingMonth - 1;
          let prevY = earliest.billingYear;
          if (prevM < 1) { prevM = 12; prevY--; }
          lastPaidText = `${fullThaiMonths[prevM]} ${prevY + 543}`;
        } else {
          lastPaidText = `${fullThaiMonths[latestInv.billingMonth]} ${latestInv.billingYear + 543}`;
        }
      }

      for (const resident of sampleInv.house.residents) {
        if (resident.lineId) {
          const flexMsg = createInvoiceFlexMessage({
            type: isOverdue ? 'OVERDUE' : 'SEND',
            houseNo: sampleInv.house.houseNo,
            headerBillingMonthText: headerBillingMonthText,
            currentInvoiceItem: currentInvoiceItem,
            pastYearTotals: pastYearTotals,
            pastMonthItems: pastMonthItems,
            totalPenalty: totalPenalty,
            finalGrandTotal: finalGrandTotal,
            isOverdue: isOverdue,
            dueDateText: dueDateText,
            invoiceNo: latestInv.invoiceNo || latestInv.id,
            lastPaidText: lastPaidText,
          });

          if (!isDryRun) {
            await sendAutoLineMessage(resident.lineId, flexMsg);
          }
          stats.lineSent++;
        }
      }

      const invIdsToUpdate = invList.map(i => i.id);
      if (!isDryRun) {
        await prisma.invoice.updateMany({
          where: { id: { in: invIdsToUpdate } },
          data: { isNotified: true }
        });
      }
      stats.updatedInvoices += invIdsToUpdate.length;
    }

    return NextResponse.json({ 
      success: true, 
      message: isDryRun
        ? `[Dry Run] จำลองการทำงานสำเร็จ (ไม่ได้ส่ง LINE จริง) สำหรับ${targetHouseNo ? `บ้านเลขที่ ${targetHouseNo}` : 'ทุกบ้าน'}`
        : `หุ่นยนต์สร้างบิลและจัดส่งเวลาไทยรอบเดียวเสร็จสิ้น${targetHouseNo ? ` (เฉพาะบ้านเลขที่ ${targetHouseNo})` : ''}!`, 
      stats 
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: 'ระบบหุ่นยนต์ผิดพลาด',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}

export async function GET(request: Request) { return handleCronJob(request); }
export async function POST(request: Request) { return handleManualSend(request); }