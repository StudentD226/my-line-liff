export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.events || body.events.length === 0) return NextResponse.json({ status: 'ok' }, { status: 200 });

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
                    orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
                  }
                }
              }
            }
          });

          if (!user || !user.residentHouse) {
            await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: "text", text: "กรุณาลงทะเบียนข้อมูลบ้านก่อนครับ" }] });
            continue;
          }

          // 🌟 1. ดึงการตั้งค่าของแอดมินกลับมาแล้วครับ! (ใช้ penaltyRatePerDay ตามในรูปเลย)
          const config = await prisma.systemConfig.findFirst();
          const penaltyRate = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;

          let pendingInvoices = user.residentHouse.invoices || [];
          let grandTotalBase = 0;
          let totalPenalty = 0;
          const tableContents: any[] = [];
          const today = new Date(); 
          today.setHours(0, 0, 0, 0);

          // 🌟 2. วนลูปคำนวณ
          pendingInvoices.forEach(inv => {
            let paid = truncateDecimals(Number(inv.paidAmount || 0));
            let penalty = truncateDecimals(Number(inv.penaltyAmount || 0)); 
            let base = truncateDecimals(Number(inv.baseAmount || 0));

            const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
            dueDate.setHours(0, 0, 0, 0);

            if (today > dueDate) {
              inv.status = inv.status === 'PARTIAL' ? 'PARTIAL' : 'OVERDUE';
              
              // 🌟 3. ถ้าระบบยังไม่แสตมป์ค่าปรับ (เป็น 0) ให้คำนวณสดจาก Config แบบปลอดภัย ไม่มีทางเป็น 0!
              if (penalty === 0) {
                let monthsLate = (today.getFullYear() - dueDate.getFullYear()) * 12 + (today.getMonth() - dueDate.getMonth());
                if (monthsLate <= 0) monthsLate = 1; // เลยกำหนดปุ๊บ บังคับขั้นต่ำ 1 เดือน (100 บาท) ทันที!
                penalty = truncateDecimals(monthsLate * penaltyRate);
              }
            }

            // หักลดยอดที่จ่ายแล้ว (กรณี PARTIAL)
            if (paid > 0) {
              if (paid >= penalty) { base = truncateDecimals(base - (paid - penalty)); penalty = 0; } 
              else { penalty = truncateDecimals(penalty - paid); }
            }

            const rowTotal = truncateDecimals(base + penalty);

            if (rowTotal > 0) {
              grandTotalBase += base;
              totalPenalty += penalty;
              
              const label = `${fullThaiMonths[inv.billingMonth]} ${inv.billingYear + 543}`;
              
              tableContents.push({
                type: "box", layout: "horizontal", margin: "md",
                contents: [
                  { type: "text", text: label, size: "sm", color: "#4B5563", weight: "bold" },
                  { type: "text", text: `${rowTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#111827", align: "end", weight: "bold" }
                ]
              });
            }
          });

          const hasPending = tableContents.length > 0;
          const houseNo = user.residentHouse.houseNo || 'ไม่ระบุ';
          let flexMessage: any;

          if (hasPending) {
            const finalGrandTotal = truncateDecimals(grandTotalBase + totalPenalty);
            
            // เพิ่มแถวค่าปรับแยกโชว์ให้ชัดๆ ถ้าระบบมีค่าปรับ
            if (totalPenalty > 0) {
              tableContents.push({
                type: "box", layout: "horizontal", margin: "md",
                contents: [
                  { type: "text", text: `(รวมค่าปรับล่าช้าแล้ว)`, size: "xs", color: "#EA580C", weight: "bold" },
                  { type: "text", text: `${totalPenalty.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "xs", color: "#EA580C", align: "end", weight: "bold" }
                ]
              });
            }

            const autoRefDate = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear() + 543}`;
            const customInvoiceNo = `${houseNo}-${autoRefDate}`;

            flexMessage = {
              type: 'flex', altText: `ใบแจ้งชำระค่าส่วนกลาง บ้านเลขที่ ${houseNo}`,
              contents: {
                type: "bubble", size: "kilo",
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
                      type: "box", layout: "vertical", margin: "xl", backgroundColor: "#FDEBEC", cornerRadius: "lg", paddingAll: "lg",
                      contents: [
                        { type: "text", text: "ยอดค้างชำระทั้งหมด", size: "xs", color: "#EF4444", weight: "bold", align: "start" },
                        {
                          type: "box", layout: "horizontal", margin: "sm", alignItems: "flex-end",
                          contents: [
                            { type: "text", text: " ", flex: 1 },
                            { type: "text", text: finalGrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "xxl", weight: "bold", color: "#EF4444", align: "center", flex: 0 },
                            { type: "text", text: "บาท", size: "sm", weight: "bold", color: "#EF4444", align: "end", flex: 1 }
                          ]
                        }
                      ]
                    },
                    { type: "box", layout: "vertical", margin: "md", borderColor: "#E5E7EB", borderWidth: "light", cornerRadius: "lg", paddingAll: "md", contents: tableContents }
                  ]
                },
                footer: {
                  type: "box", layout: "vertical", paddingStart: "xl", paddingEnd: "xl", paddingBottom: "xl",
                  contents: [
                    { type: "button", style: "primary", color: "#376B64", height: "sm", action: { type: "uri", label: "ดูประวัติและชำระเงิน", uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/invoices` } },
                    {
                      type: "box", layout: "horizontal", margin: "md",
                      contents: [
                        { type: "text", text: "PAYMENT ID", size: "xxs", color: "#4B5563", weight: "bold", flex: 0 },
                        { type: "text", text: customInvoiceNo, size: "xxs", color: "#4B5563", weight: "bold", align: "end", flex: 1 }
                      ]
                    }
                  ]
                }
              }
            };
          } else {
            flexMessage = {
              type: "flex", altText: `ตรวจสอบค่าส่วนกลาง`,
              contents: { type: "bubble", body: { type: "box", layout: "vertical", paddingAll: "xl", contents: [ { type: "text", text: `บ้านเลขที่ ${houseNo}`, weight: "bold", size: "xl" }, { type: "text", text: "ไม่มียอดค้างชำระ", color: "#16A34A", margin: "md" } ] } }
            };
          }

          try { await client.replyMessage({ replyToken: event.replyToken, messages: [flexMessage] }); } 
          catch (e) { await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: "text", text: `ระบบขัดข้อง กรุณาดูผ่านเว็บครับ` }] }); }
        }
      }
    }
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}