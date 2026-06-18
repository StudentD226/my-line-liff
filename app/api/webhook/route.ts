export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// 🌟 Helper ตัดทศนิยมทิ้ง ไม่ให้ปัดขึ้น
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

// ==========================================
// 🌟 ฟังก์ชันสร้างหน้าตา Flex Message แบบมาตรฐาน (ร่างสมบูรณ์)
// ==========================================
function createInvoiceFlexMessage(data: any) {
  const tableContents: any[] = [];

  // ตั้งค่า Theme สีเริ่มต้น (สีฟ้า - บิลปกติ)
  let boxBgColor = "#EBF5FB"; 
  let mainTextColor = "#111827"; 
  let itemTextColor = "#059669"; // สีเขียวสำหรับรายการบิลปกติ
  let mainTitle = "ยอดที่ต้องชำระ";

  let showHistory = false;
  let displayGrandTotal = data.currentInvoiceItem ? data.currentInvoiceItem.amount : data.finalGrandTotal;

  // เปลี่ยน Theme สีตามประเภทบิล
  if (data.type === 'OVERDUE' || data.isOverdue) {
    boxBgColor = "#FDEBEC";     
    mainTextColor = "#EF4444";   
    itemTextColor = "#EF4444";   // สีแดง (ค้างชำระ)
    mainTitle = "ยอดค้างชำระ";
    showHistory = true;          // เปิดการแสดงประวัติค้างชำระ
    displayGrandTotal = data.finalGrandTotal;
  } else if (data.type === 'REMINDER') {
    boxBgColor = "#FFEDD5";     
    mainTextColor = "#EA580C";   
    itemTextColor = "#EA580C";   // สีส้ม (เตือนก่อนกำหนด)
    mainTitle = "แจ้งเตือนยอดที่ต้องชำระ";
    showHistory = true;          // เปิดการแสดงประวัติค้างชำระ
    displayGrandTotal = data.finalGrandTotal;
  }

  // แถวเดือนปัจจุบัน
  if (data.currentInvoiceItem) {
    tableContents.push({
      type: "box", layout: "horizontal", margin: "md",
      contents: [
        { type: "text", text: data.currentInvoiceItem.label, size: "sm", color: itemTextColor }, 
        { type: "text", text: `${data.currentInvoiceItem.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: itemTextColor, align: "end" } 
      ]
    });
  }

  // แถวหนี้ข้ามเดือน/ปี และค่าปรับ (โชว์เฉพาะเมื่อ showHistory = true)
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
        .sort((a, b) => Number(b) - Number(a)) // เรียงปีจาก ใหม่ ไป เก่า
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // ดักไว้ก่อน เผื่อ LINE ส่งมารีเช็กสถานะ Webhook (Verify)
    if (!body.events || body.events.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'Webhook is working!' }, { status: 200 });
    }

    for (const event of body.events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text?.trim();
        const lineId = event.source.userId;

        if (text === 'ตรวจสอบค่าส่วนกลาง') {
          const user = await prisma.user.findUnique({
            where: { lineId: lineId || '' },
            include: {
              residentHouse: {
                include: {
                  invoices: {
                    where: { 
                      status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] },
                      billingYear: { not: 9999 },
                      invoiceNo: { not: { startsWith: 'TR-' } } 
                    },
                    orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }]
                  }
                }
              }
            }
          });

          if (!user || !user.residentHouse) {
            await client.replyMessage({ 
              replyToken: event.replyToken, 
              messages: [{ type: "text", text: "คุณยังไม่ได้ลงทะเบียนข้อมูลบ้าน กรุณากดปุ่ม 'ลงทะเบียน' ที่เมนูด้านล่างก่อนนะครับ" }] 
            });
            continue;
          }

          const config = await prisma.systemConfig.findFirst();
          const penaltyRate = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          
          let pendingInvoices = user.residentHouse.invoices || [];
          let flexMessage: any;

          if (pendingInvoices.length > 0) {
            let currentInvoiceItem: any = null;
            let pastYearTotals: Record<number, number> = {};
            let pastMonthItems: { label: string, amount: number }[] = [];
            let totalPenalty = 0;
            let grandTotalBase = 0;

            const latestInv = pendingInvoices[0];
            const targetYear = latestInv.billingYear;
            const targetMonth = latestInv.billingMonth;

            pendingInvoices.forEach(inv => {
              let paid = truncateDecimals(Number(inv.paidAmount || 0));
              let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
              let base = truncateDecimals(Number(inv.baseAmount || 0));

              const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(); 
              dueDate.setHours(0, 0, 0, 0);
              
              // คำนวณค่าปรับสดๆ ถ้าระบบยังไม่แสตมป์
              if (today > dueDate && penalty === 0) {
                let monthsLate = (today.getFullYear() - dueDate.getFullYear()) * 12 + (today.getMonth() - dueDate.getMonth());
                if (monthsLate <= 0) monthsLate = 1;
                penalty = truncateDecimals(monthsLate * penaltyRate);
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
                const label = `${fullThaiMonths[inv.billingMonth]} ${inv.billingYear + 543}`;
                
                if (inv.id === latestInv.id) {
                  currentInvoiceItem = { label, amount: base };
                } else {
                  if (inv.billingYear < targetYear) {
                    pastYearTotals[inv.billingYear] = truncateDecimals((pastYearTotals[inv.billingYear] || 0) + base);
                  } else {
                    pastMonthItems.push({ label, amount: base });
                  }
                }
              }
            });

            const finalGrandTotal = truncateDecimals(grandTotalBase + totalPenalty);
            
            const dueObj = latestInv.dueDate ? new Date(latestInv.dueDate) : new Date();
            dueObj.setHours(0, 0, 0, 0);
            
            // 🌟 เช็กสถานะ Overdue เพื่อบังคับการ์ดแดง
            const isPastDue = today > dueObj;
            const isOverdue = latestInv.status === 'OVERDUE' || pendingInvoices.some(u => u.status === 'OVERDUE') || totalPenalty > 0 || isPastDue;

            const dueDateText = `${String(dueObj.getDate()).padStart(2, '0')} ${fullThaiMonths[dueObj.getMonth() + 1]} ${dueObj.getFullYear() + 543}`;
            const headerBillingMonthText = `${fullThaiMonths[latestInv.billingMonth]} ${latestInv.billingYear + 543}`;

            // 🌟 เรียกใช้ฟังก์ชันมาตรฐาน
            const flexBubble = createInvoiceFlexMessage({
              type: isOverdue ? 'OVERDUE' : 'SEND',
              houseNo: user.residentHouse.houseNo,
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

            flexMessage = {
              type: "flex",
              altText: `ใบแจ้งชำระค่าส่วนกลาง บ้านเลขที่ ${user.residentHouse.houseNo}`,
              contents: flexBubble
            };

          } else {
            // 🌟 กรณีไม่มีหนี้ค้างชำระ ส่งการ์ดสีเขียวปกติ
            flexMessage = {
              type: "flex",
              altText: `ตรวจสอบค่าส่วนกลาง บ้านเลขที่ ${user.residentHouse.houseNo}`,
              contents: {
                type: "bubble",
                size: "kilo", 
                body: {
                  type: "box", layout: "vertical", paddingAll: "xl", backgroundColor: "#FFFFFF",
                  contents: [
                    {
                      type: "box", layout: "horizontal", margin: "sm", alignItems: "center",
                      contents: [
                        {
                          type: "box", layout: "vertical", backgroundColor: "#2d5a52", cornerRadius: "md", width: "48px", height: "48px", alignItems: "center", justifyContent: "center", flex: 0,
                          contents: [{ type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/ffffff/home.png", size: "24px" }]
                        },
                        {
                          type: "box", layout: "vertical", margin: "md",
                          contents: [
                            { type: "text", text: `บ้านเลขที่ ${user.residentHouse.houseNo}`, weight: "bold", size: "xl", color: "#111827" },
                            { type: "text", text: "ไม่มียอดค้างชำระ", weight: "bold", color: "#16A34A", size: "sm", margin: "xs" }
                          ]
                        }
                      ]
                    },
                    { type: "separator", margin: "xl", color: "#E5E7EB" },
                    {
                      type: "box", layout: "horizontal", margin: "lg", alignItems: "center",
                      contents: [
                        { type: "text", text: "ยอดที่ต้องชำระ", size: "sm", weight: "bold", color: "#111827", flex: 1 },
                        { type: "text", text: "0 บาท", size: "xl", weight: "bold", color: "#111827", align: "end", flex: 0 }
                      ]
                    },
                    { type: "separator", margin: "xl", color: "#E5E7EB" },
                    { type: "text", text: "คุณชำระค่าส่วนกลางครบถ้วนแล้ว ขอบคุณที่ให้ความร่วมมือครับ", size: "xs", color: "#4B5563", margin: "lg", wrap: true }
                  ]
                }
              }
            };
          }

          try {
            await client.replyMessage({ 
              replyToken: event.replyToken, 
              messages: [flexMessage as any] 
            });
          } catch (lineError: any) {
            console.error("❌ LINE Flex Validation Error:", JSON.stringify(lineError.response?.data || lineError.message, null, 2));
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: `⚠️ ระบบสามารถคำนวณยอดให้ได้แล้ว แต่มียอดชำระซับซ้อนเกินไป กรุณากดปุ่มดูประวัติบิลผ่านเว็บแทนครับ` }]
            }).catch(e => console.error("Fallback LINE error:", e));
          }
        }
      }
    }
    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error("❌ [Webhook Fatal Error]:", error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}