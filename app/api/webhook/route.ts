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
                      billingYear: { not: 9999 }
                    },
                    orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
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
          let flatPenaltyPerMonth = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          
          let pendingInvoices = user.residentHouse.invoices || [];
          
          let grandTotalBase = 0;
          let totalPenalty = 0;
          let validInvoicesToDisplay: any[] = [];

          // 🌟 1. วนลูปคำนวณยอดทั้งหมด (หักลบ paidAmount และรวมยอดเป๊ะๆ)
          pendingInvoices.forEach(inv => {
            const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(); 
            dueDate.setHours(0, 0, 0, 0);
            
            let paid = truncateDecimals(Number(inv.paidAmount || 0));
            let penalty = truncateDecimals(Number(inv.penaltyAmount || 0));
            let base = truncateDecimals(Number(inv.baseAmount || 0));

            // คิดค่าปรับถ้าเลยกำหนด (และยังไม่จ่ายครบ)
            if (today > dueDate) {
              const diffTime = today.getTime() - dueDate.getTime();
              const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const overdueMonths = Math.floor(overdueDays / 30); 
              penalty = truncateDecimals(overdueMonths * flatPenaltyPerMonth);
              inv.status = inv.status === 'PARTIAL' ? 'PARTIAL' : 'OVERDUE';
            } else {
              if (inv.status !== 'REJECTED' && inv.status !== 'PARTIAL') penalty = 0;
            }

            // หักยอดที่ทยอยจ่ายไปแล้วออกจากค่าปรับและยอดหลัก
            if (paid > 0) {
              if (paid >= penalty) {
                base = truncateDecimals(base - (paid - penalty));
                penalty = 0;
              } else {
                penalty = truncateDecimals(penalty - paid);
              }
            }

            // ถ้ายอดรวมหนี้ยังเหลือ ค่อยเอามาแสดงและบวกเข้ายอดรวม
            if (base > 0 || penalty > 0) {
              inv.baseAmount = base;
              inv.penaltyAmount = penalty;
              inv.totalAmount = truncateDecimals(base + penalty);
              
              grandTotalBase += base;
              totalPenalty += penalty;
              
              validInvoicesToDisplay.push(inv);
            }
          });

          pendingInvoices = validInvoicesToDisplay;
          const hasPending = pendingInvoices.length > 0;
          const houseNo = user.residentHouse.houseNo || 'ไม่ระบุ';
          let flexMessage: any;

          if (hasPending) {
            let currentInvoiceItem: any = null;
            let pastYearTotals: Record<number, number> = {};
            let pastMonthItems: { label: string, amount: number }[] = [];
            const currentYear = today.getFullYear();
            const currentInvoiceId = pendingInvoices[pendingInvoices.length - 1].id;

            // จัดกลุ่มยอดบิลแสดงใน Flex Message
            pendingInvoices.forEach(inv => {
              const label = `${fullThaiMonths[inv.billingMonth]} ${inv.billingYear + 543}`;
              if (inv.id === currentInvoiceId) {
                currentInvoiceItem = { label, amount: inv.baseAmount };
              } else {
                if (inv.billingYear < currentYear) {
                  pastYearTotals[inv.billingYear] = truncateDecimals((pastYearTotals[inv.billingYear] || 0) + inv.baseAmount);
                } else {
                  pastMonthItems.push({ label, amount: inv.baseAmount });
                }
              }
            });

            const finalGrandTotal = truncateDecimals(grandTotalBase + totalPenalty);
            const tableContents: any[] = [];

            if (currentInvoiceItem && currentInvoiceItem.amount > 0) {
              tableContents.push({
                type: "box", layout: "horizontal", margin: "md",
                contents: [
                  { type: "text", text: currentInvoiceItem.label, size: "sm", color: "#059669" },
                  { type: "text", text: `${currentInvoiceItem.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#059669", align: "end" }
                ]
              });
            }

            Object.keys(pastYearTotals).forEach(yearStr => {
              const yearNum = parseInt(yearStr);
              if (pastYearTotals[yearNum] > 0) {
                tableContents.push({
                  type: "box", layout: "horizontal", margin: "md",
                  contents: [
                    { type: "text", text: `ยอดค้างชำระปี ${yearNum + 543}`, size: "sm", color: "#EF4444" },
                    { type: "text", text: `${pastYearTotals[yearNum].toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
                  ]
                });
              }
            });

            pastMonthItems.forEach(item => {
              if (item.amount > 0) {
                tableContents.push({
                  type: "box", layout: "horizontal", margin: "md",
                  contents: [
                    { type: "text", text: item.label, size: "sm", color: "#EF4444" },
                    { type: "text", text: `${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
                  ]
                });
              }
            });

            if (totalPenalty > 0) {
              tableContents.push({
                type: "box", layout: "horizontal", margin: "md",
                contents: [
                  { type: "text", text: `ค่าปรับ`, size: "sm", color: "#EA580C" },
                  { type: "text", text: `${totalPenalty.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EA580C", align: "end" }
                ]
              });
            }

            const isOverdue = pendingInvoices.some(inv => {
              const dDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
              return today > dDate;
            }) || pendingInvoices.length > 1 || totalPenalty > 0;

            let boxBgColor = isOverdue ? "#FDEBEC" : "#EBF5FB";
            let mainTextColor = isOverdue ? "#EF4444" : "#111827";
            let mainTitle = isOverdue ? "ยอดค้างชำระ" : "ยอดที่ต้องชำระ";

            const lastInv = pendingInvoices[pendingInvoices.length - 1];
            const headerBillingMonthText = `${fullThaiMonths[lastInv.billingMonth]} ${lastInv.billingYear + 543}`;
            const dueDateObj = lastInv.dueDate ? new Date(lastInv.dueDate) : new Date();
            const dueDateText = `${String(dueDateObj.getDate()).padStart(2, '0')}/${String(dueDateObj.getMonth() + 1).padStart(2, '0')}/${dueDateObj.getFullYear() + 543}`;

            const autoRefDate = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear() + 543}`;
            const customTeacherInvoiceNo = `${houseNo}-${autoRefDate}`;

            flexMessage = {
              type: 'flex',
              altText: `ใบแจ้งชำระค่าส่วนกลาง บ้านเลขที่ ${houseNo}`,
              contents: {
                type: "bubble",
                size: "kilo",
                body: {
                  type: "box", layout: "vertical", paddingAll: "xl", backgroundColor: "#FFFFFF",
                  contents: [
                    {
                      type: "box", layout: "horizontal", alignItems: "center",
                      contents: [
                        { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/376B64/home.png", size: "28px", flex: 0 },
                        { type: "text", text: `บ้านเลขที่ ${houseNo}`, weight: "bold", size: "xl", color: "#111827", margin: "md" }
                      ]
                    },
                    {
                      type: "box", layout: "horizontal", margin: "md", backgroundColor: "#D1E7E3", cornerRadius: "20px", paddingAll: "sm", paddingStart: "md", paddingEnd: "md", alignItems: "flex-start",
                      contents: [
                        { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/2a524c/info.png", size: "16px", flex: 0, margin: "xs" },
                        { type: "text", text: `ใบแจ้งชำระประจำเดือน ${headerBillingMonthText}`, size: "xs", color: "#2A524C", weight: "bold", margin: "sm", wrap: true, flex: 1 }
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
                            { type: "text", text: finalGrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "xxl", weight: "bold", color: mainTextColor, align: "center", flex: 0, adjustMode: "shrink-to-fit" },
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
                                { type: "text", text: "กรุณาชำระภายในวันที่", size: "xs", color: "#4B5563", weight: "bold" },
                                { type: "text", text: dueDateText, size: "md", color: "#EF4444", weight: "bold", margin: "xs" }
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
                        { type: "text", text: "PAYMENT ID", size: "xxs", color: "#4B5563", weight: "bold", flex: 0 },
                        {
                          type: "text",
                          text: (user.residentHouse.invoices?.[0]?.invoiceNo && !user.residentHouse.invoices[0].invoiceNo.startsWith('INV'))
                            ? user.residentHouse.invoices[0].invoiceNo
                            : customTeacherInvoiceNo,
                          size: "xxs",
                          color: "#4B5563",
                          weight: "bold",
                          align: "end",
                          flex: 1
                        }
                      ]
                    }
                  ]
                }
              }
            };
          } else {
            flexMessage = {
              type: "flex",
              altText: `ตรวจสอบค่าส่วนกลาง บ้านเลขที่ ${houseNo}`,
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
                            { type: "text", text: `บ้านเลขที่ ${houseNo}`, weight: "bold", size: "xl", color: "#111827" },
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

          // 🌟 ตัวจับบั๊ก LINE ขั้นสุดยอด ป้องกัน 400 Bad Request
          try {
            await client.replyMessage({ 
              replyToken: event.replyToken, 
              messages: [flexMessage as any] 
            });
          } catch (lineError: any) {
            console.error("❌ LINE Flex Validation Error:", JSON.stringify(lineError.response?.data || lineError.message, null, 2));
            // ส่ง Text กลับไปบอกลูกบ้านแทน หาก Flex Message มีปัญหา
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