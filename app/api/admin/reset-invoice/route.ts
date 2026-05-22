import { NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

// 🌟 เพิ่มฟังก์ชันตัดเศษให้เหมือนไฟล์อื่น
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function POST(request: Request) {
  try {
    const { invoiceId, newStatus } = await request.json();

    const invoice = await prisma.invoice.findUnique({ 
      where: { id: invoiceId },
      include: { house: { include: { residents: true } } }
    });

    if (!invoice) return NextResponse.json({ success: false }, { status: 404 });

    // 2. เตรียมข้อมูลอัปเดตสถานะ
    let updateData: any = { status: newStatus };

    if (newStatus === 'PENDING') {
      // ถ้าเปลี่ยนเป็น PENDING ให้เคลียร์ค่าปรับเป็น 0 และยอดรวมเป็นยอดฐาน
      updateData = {
        ...updateData,
        penaltyAmount: 0,
        totalAmount: truncateDecimals(invoice.baseAmount),
        slipUrl: null,
        payeeName: null,
        paidAt: null
      };
    } else if (newStatus === 'PAID') {
      // ถ้าจ่ายแล้ว ให้ล็อคยอดรวมตามที่โชว์ตอนนั้น (หรือจะให้บวกค่าปรับที่คำนวณไว้ก่อนหน้าก็ได้)
      if (!invoice.paidAt) updateData.paidAt = new Date();
    }

    // อัปเดตสถานะใน DB
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData
    });

    // 3. Logic ส่ง LINE แจ้งเตือน (ใช้โครงสร้างเดิมของพี่)
    const targetLineIds = invoice.house.residents
      .filter(r => r.lineId && r.isNotify)
      .map(r => r.lineId as string);

    if (targetLineIds.length > 0) {
      const isPaid = newStatus === 'PAID';
      const isRejected = newStatus === 'REJECTED';
      
      if (isPaid || isRejected) {
        const statusText = isPaid ? "ยืนยันการชำระเงินสำเร็จ" : "สลิปการโอนเงินไม่ถูกต้อง";
        const statusColor = isPaid ? "#1DB446" : "#E63946";
        
        // ส่งข้อความ... (โค้ดเดิมพี่ตรงนี้ใช้ได้เลย ไม่ต้องแก้ครับ)
        // ...
      }
    }

    return NextResponse.json({ success: true, message: `อัปเดตสถานะเป็น ${newStatus} แล้ว` });

  } catch (error) {
    console.error("Reset Invoice Error:", error);
    return NextResponse.json({ success: false, error: 'ดำเนินการไม่สำเร็จ' }, { status: 500 });
  }
}