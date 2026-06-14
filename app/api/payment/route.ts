export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import { messagingApi } from '@line/bot-sdk'; 

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    
    // 🌟 รับค่าข้อมูลที่ AI สแกนมาได้
    const senderName = formData.get('senderName') as string || null;
    const receiverName = formData.get('receiverName') as string || null;
    const bankRef = formData.get('bankRef') as string || null;
    
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
        // 🌟 บันทึกข้อมูล AI ลง Database
        senderName,
        receiverName,
        bankRef,
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
                { type: "text", text: `🏠 บ้านเลขที่ ${house.houseNo}`, weight: "bold", size: "xl", color: "#111827" }
              ]
            },
            {
              type: "box", layout: "vertical", margin: "md", backgroundColor: "#FFF7ED", cornerRadius: "lg", paddingAll: "lg",
              contents: [
                { type: "text", text: " เจ้าหน้าที่ได้รับข้อมูลแล้ว\nกำลังตรวจสอบ", size: "sm", color: "#EA580C", weight: "bold", align: "center" }
              ]
            },sd
            {
              type: "box", layout: "vertical", margin: "xl", backgroundColor: "#FDEBEC", cornerRadius: "lg", paddingAll: "lg", alignItems: "center",
              contents: [
                { type: "text", text: "ยอดแจ้งโอน", size: "sm", color: "#EF4444", weight: "bold" },
                { type: "text", text: `${payAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "xl", weight: "bold", color: "#EF4444", margin: "sm" }
              ]
            },
            {
              type: "box", layout: "horizontal", margin: "lg",
              contents: [
                { type: "text", text: "วันที่ชำระ", size: "sm", color: "#4B5563" },
                { type: "text", text: `${dayStr} ${fullThaiMonths[parseInt(monthStr, 10)]} ${yearStr}`, size: "sm", color: "#111827", align: "end" }
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
              type: "text", text: `REF: ${paymentReferenceId}`, color: "#9CA3AF", size: "xs", align: "center", margin: "md"
            }
          ]
        }
      }
    };

    if (client) {
      for (const res of house.residents) {
        if (res.lineId) {
          await client.pushMessage({
            to: res.lineId,
            messages: [flexMessage]
          }).catch(e => {
            console.error("❌ LINE Push Error Details:", JSON.stringify(e.originalError?.response?.data || e, null, 2));
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