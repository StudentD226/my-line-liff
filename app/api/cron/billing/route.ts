export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

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

  if (data.pastMonthItems && data.pastMonthItems.length > 0) {
    // เรียงลำดับจากเดือนเก่าไปเดือนใหม่
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

async function handleCronJob(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized - คุณไม่มีสิทธิ์เข้าถึง', { status: 401 });
  }

  try {
    const config = await prisma.systemConfig.findFirst();
    if (!config) return NextResponse.json({ success: false, message: 'ไม่พบการตั้งค่าระบบ' });

    // 🌟 1. บังคับแปลงเวลาของเซิร์ฟเวอร์ (UTC) ให้เป็นเวลาไทย (Asia/Bangkok) ก่อนคำนวณเสมอ
    const now = new Date();
    const bkkTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    const currentDay = bkkTime.getDate();
    const currentHour = String(bkkTime.getHours()).padStart(2, '0');
    const currentMinute = String(bkkTime.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;
    
    const generateTimeStr = config.invoiceGenerateTime || "08:00";

    // 🌟 2. ล็อกเวลาอย่างเข้มงวด: ถ้าเวลาไทยปัจจุบัน "ไม่ตรง" กับเวลาตั้งค่าให้เด้งออกทันที ป้องกันการสแปมรายนาที
    if (currentTimeStr !== generateTimeStr) {
      return NextResponse.json({ 
        success: true, 
        message: `ยังไม่ถึงเวลาทำงานที่กำหนดไว้ (${generateTimeStr} น.) เวลาไทยปัจจุบันคือ ${currentTimeStr} น.` 
      });
    }

    // 3. สร้างบิลใหม่ถาวรถ้าถึงวันที่กำหนด (จะทำงานแค่นาทีนั้นนาทีเดียว)
    if (currentDay === config.invoiceGenerateDay) {
      let targetMonth = bkkTime.getMonth() + 2; 
      let targetYear = bkkTime.getFullYear();
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }

      const existingInvoice = await prisma.invoice.findFirst({
        where: { billingMonth: targetMonth, billingYear: targetYear }
      });

      if (!existingInvoice) {
        const houses = await prisma.house.findMany();
        const dueDate = new Date(targetYear, targetMonth - 1, config.dueDateDay, 23, 59, 59);
        const dayStr = String(bkkTime.getDate()).padStart(2, '0');
        const monthStr = String(bkkTime.getMonth() + 1).padStart(2, '0');
        const yearStrTh = String(bkkTime.getFullYear() + 543);

        for (const house of houses) {
          const monthlyRate = truncateDecimals(
            house.feeType === 'CALCULATED' && house.houseSize
              ? Number(house.feeRate) * Number(house.houseSize)
              : Number(house.feeRate || 1000)
          );
          const customInvoiceNo = `${house.houseNo}-${dayStr}${monthStr}${yearStrTh}-M${String(targetMonth).padStart(2, '0')}`;

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
        }
      }
    }

    // 4. ดึงบิลที่ถึงเวลาส่ง
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        isNotified: false,
        scheduledSendAt: { lte: now },
        status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] as any }, 
        billingYear: { not: 9999 } 
      },
      include: {
        house: { include: { residents: true } }
      }
    });

    if (pendingInvoices.length === 0) {
      return NextResponse.json({ success: true, message: 'ไม่มีบิลที่ต้องส่งในรอบเวลานี้ครับ' });
    }

    const penaltyRatePerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    let stats = { lineSent: 0, updatedInvoices: 0 };

    // 🌟 5. ดำเนินการคำนวณและบันทึกค่าปรับลงดีบีก่อนส่งข้อความ
    for (const inv of pendingInvoices) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dueDate = new Date(inv.dueDate); dueDate.setHours(0, 0, 0, 0);
      let currentPenalty = truncateDecimals(Number(inv.penaltyAmount || 0));

      if (today > dueDate) {
        const diffTime = today.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const overdueMonths = Math.ceil(overdueDays / 30);
        currentPenalty = truncateDecimals(overdueMonths * penaltyRatePerMonth);

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

    // 🌟 6. จัดกลุ่มบิลค้างตามรายบ้าน (Unique House Map) ป้องกันสแปมส่งซ้ำและแก้ปัญหาฟังก์ชันล่ม
    const uniqueHouseMap = new Map<string, any[]>();
    pendingInvoices.forEach(inv => {
      const list = uniqueHouseMap.get(inv.residentHouseId) || [];
      list.push(inv);
      uniqueHouseMap.set(inv.residentHouseId, list);
    });

    // 🌟 7. ลูปส่งไลน์และบันทึกสถานะ "รายบ้าน" ทันที เพื่อป้องกันสแปมหากหลุด Timeout
    for (const [houseId, invList] of uniqueHouseMap.entries()) {
      const sampleInv = invList[0];

      const allUnpaidForThisHouse = await prisma.invoice.findMany({
        where: {
          residentHouseId: houseId,
          status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] as any },
          billingYear: { not: 9999 }
        },
        orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }] // เอาบิลใหม่ล่าสุดเป็นตัวตั้ง
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
      const isOverdue = latestInv.status === 'OVERDUE' || allUnpaidForThisHouse.some(u => u.status === 'OVERDUE') || totalPenalty > 0;

      const due = new Date(latestInv.dueDate);
      const dueDateText = `${String(due.getDate()).padStart(2, '0')} ${fullThaiMonths[due.getMonth() + 1]} ${due.getFullYear() + 543}`;
      const headerBillingMonthText = `${fullThaiMonths[latestInv.billingMonth]} ${latestInv.billingYear + 543}`;

      for (const resident of sampleInv.house.residents) {
        if (resident.lineId) {
          const flexMsg = createInvoiceFlexMessage({
            type: latestInv.status === 'OVERDUE' ? 'OVERDUE' : 'SEND',
            houseNo: sampleInv.house.houseNo,
            headerBillingMonthText: headerBillingMonthText,
            currentInvoiceItem: currentInvoiceItem,
            pastYearTotals: pastYearTotals,
            pastMonthItems: pastMonthItems,
            totalPenalty: totalPenalty,
            finalGrandTotal: finalGrandTotal,
            isOverdue: isOverdue,
            dueDateText: dueDateText,
            invoiceNo: latestInv.invoiceNo || latestInv.id
          });

          await sendAutoLineMessage(resident.lineId, flexMsg);
          stats.lineSent++;
        }
      }

      // 🌟 สับสวิตช์เป็น true ทันทีรายกลุ่มยูนิต ป้องกันหุ่นยนต์ตัวถัดไปดึงซ้ำถ้าลูปค้าง
      const invIdsToUpdate = invList.map(i => i.id);
      await prisma.invoice.updateMany({
        where: { id: { in: invIdsToUpdate } },
        data: { isNotified: true }
      });
      stats.updatedInvoices += invIdsToUpdate.length;
    }

    return NextResponse.json({ success: true, message: 'หุ่นยนต์สร้างบิลและจัดส่งเวลาไทยรอบเดียวเสร็จสิ้น!', stats });

  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: 'ระบบหุ่นยนต์ผิดพลาด' }, { status: 500 });
  }
}

export async function GET(request: Request) { return handleCronJob(request); }
export async function POST(request: Request) { return handleCronJob(request); }