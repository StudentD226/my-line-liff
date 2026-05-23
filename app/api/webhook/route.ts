export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});
const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.events || body.events.length === 0) return NextResponse.json({ status: 'ok', message: 'Webhook is working!' }, { status: 200 });

    for (const event of body.events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text;
        const lineId = event.source.userId;

        if (text === 'ตรวจสอบค่าส่วนกลาง') {
          const user = await prisma.user.findUnique({
            where: { lineId: lineId || '' },
            include: {
              residentHouse: {
                include: {
                  invoices: {
                    where: { status: { in: ['PENDING', 'OVERDUE', 'REJECTED'] } },
                    orderBy: { dueDate: 'asc' }
                  }
                }
              }
            }
          });

          if (!user || !user.residentHouse) {
            await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: "text", text: "คุณยังไม่ได้ลงทะเบียนข้อมูลบ้าน กรุณากดปุ่ม 'ลงทะเบียน' ที่เมนูด้านล่างก่อนนะครับ" }] });
            continue;
          }

          const config = await prisma.systemConfig.findFirst();
          let flatPenaltyPerMonth = config?.penaltyRatePerDay || 100;

          let pendingInvoices = await prisma.invoice.findMany({
            where: { residentHouseId: user.residentHouse.id, status: { in: ['PENDING', 'OVERDUE', 'REJECTED'] } },
            orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
          });

          const today = new Date(); today.setHours(0, 0, 0, 0);
          for (let inv of pendingInvoices) {
            const dueDate = new Date(inv.dueDate); dueDate.setHours(0, 0, 0, 0);
            if (today > dueDate) {
              const diffTime = today.getTime() - dueDate.getTime();
              const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const overdueMonths = Math.floor(overdueDays / 30); // 🌟 แก้เป็น Math.floor (ครบ 30 วันถึงนับ 1 เดือน)
              inv.penaltyAmount = overdueMonths * flatPenaltyPerMonth;
              inv.totalAmount = inv.baseAmount + inv.penaltyAmount;
              inv.status = 'OVERDUE';
            }
          }

          const hasPenalty = pendingInvoices.some(inv => (inv.penaltyAmount || 0) > 0);
          if (hasPenalty) {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            pendingInvoices = pendingInvoices.filter(inv => !(inv.billingMonth === currentMonth && inv.billingYear === currentYear && (inv.penaltyAmount || 0) === 0));
          }

          const hasPending = pendingInvoices.length > 0;
          const houseNo = user.residentHouse.houseNo;
          let flexMessage: any;

          if (hasPending) {
            let currentInvoiceItem: any = null;
            let pastYearTotals: Record<number, number> = {};
            let pastMonthItems: { label: string, amount: number }[] = [];
            let totalPenalty = 0;
            let grandTotalBase = 0;
            const currentYear = new Date().getFullYear();
            const currentInvoiceId = pendingInvoices[pendingInvoices.length - 1].id;

            pendingInvoices.forEach(inv => {
              let base = inv.baseAmount;
              let penalty = inv.penaltyAmount || 0;
              grandTotalBase += base; totalPenalty += penalty;
              const label = `${fullThaiMonths[inv.billingMonth]} ${inv.billingYear + 543}`;
              if (inv.id === currentInvoiceId) {
                currentInvoiceItem = { label, amount: base };
              } else {
                if (inv.billingYear < currentYear) pastYearTotals[inv.billingYear] = (pastYearTotals[inv.billingYear] || 0) + base;
                else pastMonthItems.push({ label, amount: base });
              }
            });

            const finalGrandTotal = grandTotalBase + totalPenalty;
            const tableContents: any[] = [];

            if (currentInvoiceItem) {
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
              tableContents.push({
                type: "box", layout: "horizontal", margin: "md",
                contents: [
                  { type: "text", text: `ยอดค้างชำระปี ${yearNum + 543}`, size: "sm", color: "#EF4444" },
                  { type: "text", text: `${pastYearTotals[yearNum].toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
                ]
              });
            });

            pastMonthItems.forEach(item => {
              tableContents.push({
                type: "box", layout: "horizontal", margin: "md",
                contents: [
                  { type: "text", text: item.label, size: "sm", color: "#EF4444" },
                  { type: "text", text: `${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end" }
                ]
              });
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

            const isOverdue = pendingInvoices.some(inv => new Date() > new Date(inv.dueDate)) || pendingInvoices.length > 1 || totalPenalty > 0;
            let boxBgColor = "#EBF5FB";
            let mainTextColor = "#111827";
            let mainTitle = "ยอดที่ต้องชำระ";

            if (isOverdue) {
              boxBgColor = "#FDEBEC";
              mainTextColor = "#EF4444";
              mainTitle = "ยอดค้างชำระ";
            }

            const lastInv = pendingInvoices[pendingInvoices.length - 1];
            const headerBillingMonthText = `${fullThaiMonths[lastInv.billingMonth]} ${lastInv.billingYear + 543}`;
            const dueDateObj = new Date(lastInv.dueDate);
            const dueDateText = `${String(dueDateObj.getDate()).padStart(2, '0')}/${String(dueDateObj.getMonth() + 1).padStart(2, '0')}/${dueDateObj.getFullYear() + 543}`;

            const autoRefDate = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear() + 543}`;
            // 🌟 สร้างรูปแบบตามใจอาจารย์ตรงนี้ไว้รอใช้เลย
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
                        { type: "text", text: `ใบแจ้งชำระค่าส่วนกลางประจำเดือน ${headerBillingMonthText}`, size: "xs", color: "#2A524C", weight: "bold", margin: "sm", wrap: true, flex: 1 }
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
                        // 🌟 [แก้ไขจุดสำคัญ] ตรวจเช็คค่าบิล ถ้าเจอรหัสเก่าที่เป็น INV ให้สลับสวิตช์เป็นสไตล์อาจารย์ที่เป็นตัวหนาทันที!
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
                size: "mega",
                body: {
                  type: "box", layout: "vertical", paddingAll: "xs",
                  contents: [
                    {
                      type: "box", layout: "vertical", borderColor: "#2d5a52", borderWidth: "2px", cornerRadius: "xl", paddingAll: "xl", backgroundColor: "#FFFFFF",
                      contents: [
                        {
                          type: "box", layout: "horizontal", margin: "md", alignItems: "flex-start",
                          contents: [
                            {
                              type: "box", layout: "vertical", backgroundColor: "#2d5a52", cornerRadius: "md", width: "48px", height: "48px", alignItems: "center", justifyContent: "center", flex: 0,
                              contents: [{ type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/ffffff/home.png", size: "24px" }]
                            },
                            {
                              type: "box", layout: "vertical", margin: "md",
                              contents: [
                                { type: "text", text: `บ้านเลขที่ ${houseNo}`, weight: "bold", size: "xxl", color: "#111827" },
                                { type: "text", text: "ไม่มียอดค้างชำระ", weight: "bold", color: "#16A34A", size: "md", margin: "sm" }
                              ]
                            }
                          ]
                        },
                        { type: "separator", margin: "lg", color: "#E5E7EB" },
                        {
                          type: "box", layout: "horizontal", margin: "lg", alignItems: "center",
                          contents: [
                            { type: "text", text: "ยอดที่ต้องชำระ", size: "md", weight: "bold", color: "#111827", flex: 1 },
                            { type: "text", text: "0 บาท", size: "xl", weight: "bold", color: "#111827", align: "end", flex: 0 }
                          ]
                        },
                        { type: "separator", margin: "lg", color: "#E5E7EB" },
                        { type: "text", text: "คุณชำระค่าส่วนกลางครบถ้วนแล้ว ขอบคุณที่ให้ความร่วมมือครับ", size: "sm", color: "#4B5563", margin: "lg", wrap: true }
                      ]
                    }
                  ]
                }
              }
            };
          }
          await client.replyMessage({ replyToken: event.replyToken, messages: [flexMessage as any] });
        }
      }
    }
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error("❌ [Webhook Error]:", error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
