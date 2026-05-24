import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('slip') as File;
    const houseNo = formData.get('houseNo') as string;
    const transferDate = formData.get('transferDate') as string;
    const transferTime = formData.get('transferTime') as string;
    
    // 🌟 รับยอดเงินที่ลูกบ้านพิมพ์โอนมา "จริงๆ"
    const payAmount = truncateDecimals(parseFloat(formData.get('payAmount') as string || '0'));

    if (!file || !houseNo || payAmount <= 0) return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });

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

    const now = new Date();
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = String(now.getFullYear() + 543);
    
    // 🌟 สร้างเลขที่แจ้งโอน (Transaction ID) 
    const customTeacherInvNo = `TR-${houseNo}-${dayStr}${monthStr}${yearStr}-${Date.now().toString().slice(-4)}`;

    // 🌟 สร้าง "บิลลอย" (Dummy Invoice) เพื่อรับยอดเงินก้อนนี้ส่งไปให้แอดมินตรวจ
    // โดยใช้ billingYear พิเศษ (เช่น 9999) เพื่อไม่ให้ไปปนกับบิลปกติในหน้าประวัติ
    await prisma.invoice.create({
      data: {
        invoiceNo: customTeacherInvNo,
        billingMonth: now.getMonth() + 1,
        billingYear: 9999, // 👈 มาร์คว่าเป็นบิลพักยอด (Transaction)
        baseAmount: payAmount, // 👈 ใส่ยอดเงินที่โอนจริง
        penaltyAmount: 0,
        totalAmount: payAmount,
        status: 'CHECKING',
        slipUrl,
        transferDate,
        transferTime,
        residentHouseId: house.id,
        dueDate: now,
        isNotified: false
      }
    });

    // 🌟 ส่ง Flex Message แจ้งลูกบ้าน (ดีไซน์เดิม)
    const flexMessage: any =  {
      type: "flex",
      altText: `แจ้งโอนเงิน บ้านเลขที่ ${house.houseNo}`,
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
                { type: "text", text: `บ้านเลขที่ ${house.houseNo}`, weight: "bold", size: "xl", color: "#111827", margin: "md" }
              ]
            },
            {
              type: "box", layout: "horizontal", margin: "md", backgroundColor: "#FFF7ED", cornerRadius: "20px", paddingAll: "sm", paddingStart: "md", paddingEnd: "md", alignItems: "center",
              contents: [
                { type: "image", url: "https://img.icons8.com/fluency-systems-filled/48/ea580c/time.png", size: "16px", flex: 0, margin: "xs" },
                { type: "text", text: "ส่งสลิปแล้ว เจ้าหน้าที่กำลังตรวจสอบ", size: "xs", color: "#EA580C", weight: "bold", margin: "sm", flex: 1 }
              ]
            },
            {
              type: "box", layout: "vertical", margin: "xl", backgroundColor: "#EBF5FB", cornerRadius: "lg", paddingAll: "lg",
              contents: [
                { type: "text", text: "แจ้งโอนเงินเข้าสู่ระบบ", size: "xs", color: "#0369A1", weight: "bold", align: "start" },
                {
                  type: "box", layout: "horizontal", margin: "sm", alignItems: "flex-end", spacing: "sm",
                  contents: [
                    { type: "text", text: payAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "xxl", weight: "bold", color: "#0369A1", adjustMode: "shrink-to-fit", align: "end", flex: 1 },
                    { type: "text", text: "บาท", size: "sm", weight: "bold", color: "#0369A1", align: "end", flex: 0, margin: "xs" }
                  ]
                }
              ]
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
                        { type: "text", text: "วันที่ส่งสลิป", size: "xs", color: "#4B5563", weight: "bold" },
                        { type: "text", text: `${dayStr}/${monthStr}/${yearStr}`, size: "md", color: "#111827", weight: "bold", margin: "xs" }
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
              type: "box", layout: "horizontal", margin: "md",
              contents: [
                { type: "text", text: "REF ID", size: "xxs", color: "#4B5563", weight: "bold", flex: 0 },
                { type: "text", text: customTeacherInvNo, size: "xxs", color: "#4B5563", weight: "bold", align: "end", flex: 1 }
              ]
            }
          ]
        }
      }
    };

    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (lineToken) {
      for (const res of house.residents) {
        if (res.lineId && res.isNotify) {
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lineToken}` },
            body: JSON.stringify({ to: res.lineId, messages: [flexMessage] })
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