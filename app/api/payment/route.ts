import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🌟 Helper ตัดทศนิยมทิ้ง ดักไว้ก่อนบันทึกลงฐานข้อมูล
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
    
    // 🌟 เอา truncateDecimals มาครอบการรับค่าเงินทั้งหมด ป้องกันทศนิยมเพี้ยนจากฝั่ง Frontend
    const payAmount = truncateDecimals(parseFloat(formData.get('payAmount') as string || '0'));
    const remainingBalance = truncateDecimals(parseFloat(formData.get('remainingBalance') as string || '0'));
    const advanceMonths = parseInt(formData.get('payOptionMonths') as string || '0', 10);
    const fineAmount = truncateDecimals(parseFloat(formData.get('fineAmount') as string || '0'));

    if (!file || !houseNo) return NextResponse.json({ success: false }, { status: 400 });

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
      include: { residents: true, invoices: { where: { status: { in: ['PENDING', 'OVERDUE', 'REJECTED'] } }, orderBy: { dueDate: 'asc' } } }
    });

    if (!house) return NextResponse.json({ success: false }, { status: 404 });

    const existingInvoices = house.invoices;
    const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const getThaiYear = (y: number) => String(y > 2500 ? y : y + 543).slice(-2);
    
    const receiptItems: any[] = [];
    const now = new Date();

    const dayStr = String(now.getDate()).padStart(2, '0');
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const yearStr = String(now.getFullYear() + 543);
    const customTeacherInvNo = `${houseNo}-${dayStr}${monthStr}${yearStr}`;

    if (existingInvoices.length > 0) {
      const overdueInvoices = existingInvoices.filter(inv => new Date(inv.dueDate) < now);
      const currentInvoices = existingInvoices.filter(inv => new Date(inv.dueDate) >= now);

      if (overdueInvoices.length > 0) {
        const first = overdueInvoices[0];
        const last = overdueInvoices[overdueInvoices.length - 1];
        const range = overdueInvoices.length === 1 
          ? `${fullThaiMonths[first.billingMonth]} ${getThaiYear(first.billingYear)}`
          : `${fullThaiMonths[first.billingMonth]} ${getThaiYear(first.billingYear)} - ${fullThaiMonths[last.billingMonth]} ${getThaiYear(last.billingYear)}`;
        
        receiptItems.push({
          type: "box", layout: "horizontal", margin: "md", contents: [
            { type: "text", text: `ยอดค้าง (${overdueInvoices.length} ด.)`, size: "sm", color: "#EF4444", weight: "bold", flex: 5 },
            { type: "text", text: range, size: "xs", color: "#EF4444", align: "end", flex: 5, wrap: true }
          ]
        });
      }

      if (currentInvoices.length > 0) {
        const first = currentInvoices[0];
        const last = currentInvoices[currentInvoices.length - 1];
        const range = currentInvoices.length === 1 
          ? `${fullThaiMonths[first.billingMonth]} ${getThaiYear(first.billingYear)}`
          : `${fullThaiMonths[first.billingMonth]} ${getThaiYear(first.billingYear)} - ${fullThaiMonths[last.billingMonth]} ${getThaiYear(last.billingYear)}`;
        
        receiptItems.push({
          type: "box", layout: "horizontal", margin: "md", contents: [
            { type: "text", text: `รอบปกติ (${currentInvoices.length} ด.)`, size: "sm", color: "#4B5563", weight: "bold", flex: 5 },
            { type: "text", text: range, size: "xs", color: "#4B5563", align: "end", flex: 5, wrap: true }
          ]
        });
      }

      await Promise.all(
        existingInvoices.map(inv => 
          prisma.invoice.update({
            where: { id: inv.id },
            data: { 
              invoiceNo: customTeacherInvNo, 
              status: 'CHECKING', 
              slipUrl, 
              transferDate, 
              transferTime
            }
          })
        )
      );
      
      existingInvoices.forEach(inv => { inv.invoiceNo = customTeacherInvNo; });
    }

    if (fineAmount > 0) {
      receiptItems.push({
        type: "box", layout: "horizontal", margin: "md", contents: [
          { type: "text", text: "ค่าปรับ", size: "sm", color: "#EA580C", weight: "bold", flex: 5 },
          { type: "text", text: `${fineAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EA580C", align: "end", flex: 5 }
        ]
      });
    }

    if (advanceMonths > 0) {
      let lastM = existingInvoices.length > 0 ? existingInvoices[existingInvoices.length - 1].billingMonth : new Date().getMonth() + 1;
      let lastY = existingInvoices.length > 0 ? existingInvoices[existingInvoices.length - 1].billingYear : new Date().getFullYear();
      
      const monthlyRate = truncateDecimals(house.feeType === 'CALCULATED' && house.houseSize
        ? Number(house.feeRate) * Number(house.houseSize)
        : Number(house.feeRate || 1000));
      
      let startM = 0, startY = 0;
      for (let i = 0; i < advanceMonths; i++) {
        lastM++; if (lastM > 12) { lastM = 1; lastY++; }
        if (i === 0) { startM = lastM; startY = lastY; }
        
        await prisma.invoice.create({
          data: {
            invoiceNo: customTeacherInvNo, billingMonth: lastM, billingYear: lastY,
            baseAmount: monthlyRate, totalAmount: monthlyRate, status: 'CHECKING',
            dueDate: new Date(lastY, lastM - 1, 5), slipUrl, transferDate, transferTime, residentHouseId: house.id
          }
        });
      }

      const advanceRange = advanceMonths === 1
        ? `${fullThaiMonths[startM]} ${getThaiYear(startY)}`
        : `${fullThaiMonths[startM]} ${getThaiYear(startY)} - ${fullThaiMonths[lastM]} ${getThaiYear(lastY)}`;

      receiptItems.push({
        type: "box", layout: "horizontal", margin: "md", contents: [
          { type: "text", text: `จ่ายล่วงหน้า (${advanceMonths} ด.)`, size: "sm", color: "#059669", weight: "bold", flex: 5 },
          { type: "text", text: advanceRange, size: "xs", color: "#059669", align: "end", flex: 5, wrap: true }
        ]
      });
    }

    const lastInvNo = existingInvoices?.[0]?.invoiceNo || customTeacherInvNo;

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
            // 🌟 ปรับ UI ยอดเงินตรงนี้: เลขใหญ่ xxl + บาทชิดขวา
            {
              type: "box", layout: "vertical", margin: "xl", backgroundColor: "#EBF5FB", cornerRadius: "lg", paddingAll: "lg",
              contents: [
                { type: "text", text: "ยอดรวมที่โอน", size: "xs", color: "#0369A1", weight: "bold", align: "start" },
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
              type: "box", layout: "vertical", margin: "md", borderColor: "#E5E7EB", borderWidth: "light", cornerRadius: "lg", paddingAll: "md",
              contents: receiptItems.length > 0 ? receiptItems : [{ type: "text", text: "ไม่พบข้อมูลรายการ", size: "sm", color: "#9CA3AF", align: "center" }]
            },
            ...(remainingBalance > 0 ? [
              {
                type: "box", layout: "horizontal", margin: "lg", paddingAll: "md", backgroundColor: "#FEF2F2", cornerRadius: "lg", alignItems: "center",
                contents: [
                  { type: "text", text: "ค้างชำระคงเหลือ", size: "sm", color: "#EF4444", weight: "bold", flex: 1 },
                  { type: "text", text: `${remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "sm", color: "#EF4444", align: "end", weight: "bold", flex: 1 }
                ]
              }
            ] : [])
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
                { type: "text", text: "PAYMENT ID", size: "xxs", color: "#4B5563", weight: "bold", flex: 0 },
                { type: "text", text: lastInvNo, size: "xxs", color: "#4B5563", weight: "bold", align: "end", flex: 1 }
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