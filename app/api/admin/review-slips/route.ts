import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendStatusUpdateFlex } from '@/lib/line-notify'; 

const prisma = new PrismaClient();

// 🟢 ดึงข้อมูลบิลที่สถานะเป็น 'รอตรวจสอบ' (CHECKING)
export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: 'CHECKING' },
      include: { house: true },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Fetch Pending Invoices Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// 🟢 แอดมินกดยืนยัน (PAID) หรือ ปฏิเสธ (REJECTED) แบบ "เหมาเข่งตามรูปสลิป"
export async function PATCH(request: Request) {
  try {
    const { invoiceId, status } = await request.json();

    if (!invoiceId || !status) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 1. ดึงข้อมูลบิลตั้งต้น เพื่อเอา `slipUrl` ไปค้นหาพรรคพวกของมัน
    const targetInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!targetInvoice || !targetInvoice.slipUrl) {
      return NextResponse.json({ success: false, error: 'ไม่พบบิลอ้างอิง หรือบิลนี้ไม่มีสลิป' }, { status: 404 });
    }

    // 2. หากุ่มบิลทุกใบที่ใช้สลิปเดียวกัน (`slipUrl`) และมีสถานะ `CHECKING`
    const relatedInvoices = await prisma.invoice.findMany({
      where: { 
        slipUrl: targetInvoice.slipUrl,
        status: 'CHECKING'
      }
    });

    // ดึง ID ของบิลทุกใบออกมาเป็น Array
    const invoiceIdsToUpdate = relatedInvoices.map(inv => inv.id);

    // 3. เตรียมข้อมูลที่จะใช้อัปเดต
    const updateData: any = { status: status };
    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    // 4. อัปเดตสถานะแบบเหมาเข่งทีเดียว
    if (invoiceIdsToUpdate.length > 0) {
      await prisma.invoice.updateMany({
        where: { id: { in: invoiceIdsToUpdate } },
        data: updateData
      });
    }

    // 🌟 5. ส่ง Flex Message แจ้งเตือนลูกบ้าน
    // (ส่งแค่ครั้งเดียวพอ โดยใช้ ID ของบิลใบแรกเป็นตัวแทน เพื่อไม่ให้ไลน์สแปมรัวๆ ตามจำนวนเดือน)
    if (relatedInvoices.length > 0) {
      await sendStatusUpdateFlex(relatedInvoices[0].id, status);
    }

    return NextResponse.json({ 
      success: true, 
      message: `อัปเดตสถานะสำเร็จ (${invoiceIdsToUpdate.length} บิล)` 
    });
  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}