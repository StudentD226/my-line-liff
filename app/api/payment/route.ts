export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import { messagingApi } from '@line/bot-sdk'; // 🌟 ใช้ SDK ของ LINE ชัวร์กว่ามาก!

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🌟 ตั้งค่า LINE Client สำหรับดัน Flex Message
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('slip') as File;
    const houseNo = formData.get('houseNo') as string;
    const transferDate = formData.get('transferDate') as string;
    const transferTime = formData.get('transferTime') as string;
    
    const payAmount = truncateDecimals(parseFloat(formData.get('payAmount') as string || '0'));

    if (!file || !houseNo || payAmount <= 0) 
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder: 'slips' }, (err, res) => {
        if (err) reject(err); else resolve(res);
      });
      uploadStream.end(buffer);
    });
    const slipUrl = (uploadResult as any).secure_url;

    const house = await prisma.house.findFirst({
      where: { houseNo },
      include: { residents: true }
    });

    if (!house) return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลบ้าน' }, { status: 404 });

    const oldestUnpaidInvoice = await prisma.invoice.findFirst({
      where: {
        residentHouseId: house.id,
        status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] },
        invoiceNo: { not: { startsWith: 'TR-' } },
        billingYear: { not: 9999 }
      },
      orderBy: [
        { billingYear: 'asc' },
        { billingMonth: 'asc' }
      ]
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    const targetMonth = oldestUnpaidInvoice ? oldestUnpaidInvoice.billingMonth : (now.getMonth() + 1);
    const targetYear = oldestUnpaidInvoice ? oldestUnpaidInvoice.billingYear : currentYear;

    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = String(currentYear + 543);
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    const paymentReferenceId = `TR-${houseNo}-${dayStr}${monthStr}${yearStr}-${randomSuffix}`;

    await prisma.invoice.create({
      data: {
        invoiceNo: paymentReferenceId,
        billingMonth: targetMonth, 
        billingYear: targetYear,  
        baseAmount: payAmount,
        penaltyAmount: 0,
        totalAmount: payAmount,
        paidAmount: 0, 
        status: 'CHECKING',
        slipUrl,
        transferDate,
        transferTime,
        residentHouseId: house.id,
        dueDate: now,
        isNotified: false
      }
    });

    const flexMessage: any = {
      type: "flex",
      altText: `แจ้งชำระค่าส่วนกลาง บ้านเลขที่ ${house.houseNo}`,
      contents: {
        type: "bubble",
        size: "kilo",
        body: {
          type: "box", layout: "vertical", paddingAll: "xl", backgroundColor: "#FFFFFF",
          contents: [
            {
              type: "box", layout: "horizontal", alignItems: "center",
              contents: [
                { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/376B64/home.png", size: "32px", flex: 0 },
                { type: "text", text: `บ้านเลขที่ ${house.houseNo}`, weight: "bold", size: "xxl", color: "#111827", margin: "md" }
              ]
            },
            {
              type: "box", layout: "horizontal", margin: "md", backgroundColor: "#FFF7ED", cornerRadius: "20px", paddingAll: "md", paddingStart: "lg", paddingEnd: "lg", alignItems: "center",
              contents: [
                { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/ea580c/time.png", size: "24px", flex: 0, margin: "xs" },
                { type: "text", text: "เจ้าหน้าที่ได้รับข้อมูลแล้ว รอการตรวจสอบ", size: "md", color: "#EA580C", weight: "normal", margin: "md", flex: 1 }
              ]
            },
            {
              type: "box", layout: "horizontal", margin: "xl", backgroundColor: "#FDEBEC", cornerRadius: "lg", paddingAll: "xl", alignItems: "center",
              contents: [
                { type: "text", text: "ยอดแจ้งโอน", size: "md", color: "#EF4444", weight: "bold", align: "start", flex: 1 },
                { type: "text", text: payAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "3xl", weight: "bold", color: "#EF4444", adjustMode: "shrink-to-fit", align: "center", flex: 0 },
                { type: "text", text: "บาท", size: "md", weight: "bold", color: "#EF4444", align: "end", flex: 1 }
              ]
            },
            {
              type: "box", layout: "vertical", margin: "lg",
              contents: [
                {
                  type: "box", layout: "horizontal", borderColor: "#E5E7EB", borderWidth: "light", cornerRadius: "lg", paddingAll: "lg", alignItems: "center", backgroundColor: "#FFFFFF",
                  contents: [
                    { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/376B64/calendar.png", size: "36px", flex: 0 },
                    {
                      type: "box", layout: "vertical", margin: "md",
                      contents: [
                        { type: "text", text: "วันที่ชำระ", size: "md", color: "#4B5563", weight: "bold" },
                        { type: "text", text: `${dayStr}/${monthStr}/${yearStr}`, size: "xl", color: "#111827", weight: "bold", margin: "xs" }
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
              action: { type: "uri", label: "ดูประวัติและสถานะบิล", uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/invoices` }
            },
            {
              type: "box", layout: "horizontal", margin: "lg",
              contents: [
                { type: "text", text: "REF ID", color: "#4B5563", weight: "bold", size: "xs" }, 
                { type: "text", text: paymentReferenceId, color: "#4B5563", weight: "bold", align: "end", size: "xs" } 
              ]
            }
          ]
        }
      }
    };

    if (client) {
      for (const res of house.residents) {
        // 🌟 ปลดล็อก! ไม่เช็ค isNotify แล้ว ขอแค่ลูกบ้านมี lineId ส่งใบเสร็จให้ทันที 100%
        if (res.lineId) {
          await client.pushMessage({
            to: res.lineId,
            messages: [flexMessage]
          }).catch(e => {
            console.error("❌ LINE Push Error in Payment API:", JSON.stringify(e.response?.data || e.message, null, 2));
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}