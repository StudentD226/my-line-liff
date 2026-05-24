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

    // 🌟 1. สร้างวันที่ปัจจุบัน (ดึงปีจริงมาใช้)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(currentMonth).padStart(2, '0');
    const yearStrThai = String(currentYear + 543);
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    const paymentReferenceId = `TR-${houseNo}-${dayStr}${monthStr}${yearStrThai}-${randomSuffix}`;

    // 🌟 2. บันทึกลงฐานข้อมูล (แก้ปีจาก 9999 เป็นปีปัจจุบันแล้ว!)
    await prisma.invoice.create({
      data: {
        invoiceNo: paymentReferenceId,
        billingMonth: currentMonth,
        billingYear: currentYear, // 👈 ใช้ปีปัจจุบัน ไม่ใช้ 9999 แล้ว
        baseAmount: payAmount,
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

    // 🌟 3. Flex Message (เปลี่ยนคำให้เป็นใบรับทราบการโอน)
    const flexMessage: any = {
      type: "flex",
      altText: `แจ้งยืนยันรับสลิปโอนเงิน บ้านเลขที่ ${house.houseNo}`,
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
              type: "box", layout: "vertical", margin: "xl", backgroundColor: "#EBF5FB", cornerRadius: "lg", paddingAll: "lg", alignItems: "center",
              contents: [
                { type: "text", text: "ยอดเงินที่แจ้งโอน", size: "xs", color: "#0369A1", weight: "bold", align: "center" },
                {
                  type: "box", layout: "horizontal", margin: "sm", alignItems: "flex-end", spacing: "sm", justifyContent: "center",
                  contents: [
                    { type: "text", text: payAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), size: "xxl", weight: "bold", color: "#0369A1", align: "center" },
                    { type: "text", text: "บาท", size: "sm", weight: "bold", color: "#0369A1", align: "center", flex: 0, margin: "xs" }
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
                        { type: "text", text: "วันที่ส่งสลิปเข้าระบบ", size: "xs", color: "#4B5563", weight: "bold" },
                        { type: "text", text: `${dayStr}/${monthStr}/${yearStrThai}`, size: "md", color: "#111827", weight: "bold", margin: "xs" }
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
                { type: "text", text: paymentReferenceId, size: "xxs", color: "#4B5563", weight: "bold", align: "end", flex: 1 }
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