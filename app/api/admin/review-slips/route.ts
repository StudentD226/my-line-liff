import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendStatusUpdateFlex } from '@/lib/line-notify'; 

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: 'CHECKING', billingYear: 9999 }, // บิลรอตรวจ
      include: { 
        house: {
          include: {
            invoices: {
              // 🌟 รวมหนี้ที่ค้างทั้งหมด (รวมที่จ่ายบางส่วนด้วย)
              where: { status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] }, billingYear: { not: 9999 } }
            }
          }
        } 
      },
      orderBy: { createdAt: 'asc' } 
    });

    const mappedInvoices = invoices.map(inv => {
      // 🌟 คำนวณหนี้คงเหลือจริง: (ยอดรวมทั้งหมด) - (ยอดที่เคยจ่ายมาแล้ว)
      const totalDebt = inv.house?.invoices.reduce((sum, item) => {
        const remaining = Number(item.totalAmount || 0) - Number(item.paidAmount || 0);
        return sum + (remaining > 0 ? remaining : 0);
      }, 0) || 0;
      
      return {
        ...inv,
        totalDebt: truncateDecimals(totalDebt)
      };
    });

    return NextResponse.json({ success: true, invoices: mappedInvoices });
  } catch (error) {
    console.error("Fetch Pending Invoices Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { invoiceId, status, note } = await request.json();

    if (!invoiceId || !status) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const transactionInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!transactionInvoice) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการแจ้งโอน' }, { status: 404 });
    }

    if (status === 'REJECTED') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'REJECTED' } 
      });
      await sendStatusUpdateFlex(invoiceId, 'REJECTED'); 
      return NextResponse.json({ success: true, message: `ปฏิเสธสลิปสำเร็จ` });
    }

    // 🌟 -----------------------------------------------------
    // กรณีอนุมัติยอดเงิน (FIFO ตัดยอดด้วย Schema ใหม่)
    // -----------------------------------------------------
    if (status === 'PAID') {
      let remainingMoney = truncateDecimals(Number(transactionInvoice.totalAmount)); 
      let updatedInvoicesCount = 0;

      // 1. ดึงบิลที่ค้างอยู่ เรียงจากเก่าไปใหม่
      const unpaidInvoices = await prisma.invoice.findMany({
        where: { 
          residentHouseId: transactionInvoice.residentHouseId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
          billingYear: { not: 9999 } 
        },
        orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
      });

      // 2. ไล่ตัดยอด FIFO เข้า paidAmount
      for (const inv of unpaidInvoices) {
        if (remainingMoney <= 0) break; 

        // คำนวณหนี้ที่เหลือของบิลใบนี้ (ยอดเต็ม - ยอดที่เคยจ่ายแล้ว)
        const debtOfThisInvoice = truncateDecimals(Number(inv.totalAmount) - Number(inv.paidAmount));

        if (remainingMoney >= debtOfThisInvoice) {
          // จ่ายครบ! โปะเต็มจำนวน
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { 
              paidAmount: Number(inv.totalAmount), // จ่ายเต็ม 100%
              status: 'PAID', 
              paidAt: new Date()
            }
          });
          remainingMoney = truncateDecimals(remainingMoney - debtOfThisInvoice);
          updatedInvoicesCount++;
        } else {
          // จ่ายได้แค่บางส่วน (เงินไม่พอโปะบิลนี้)
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { 
              paidAmount: truncateDecimals(Number(inv.paidAmount) + remainingMoney), // บวกเงินที่โอนเข้ามา
              status: 'PARTIAL' // เปลี่ยนสถานะเป็น จ่ายบางส่วน
            }
          });
          remainingMoney = 0;
          updatedInvoicesCount++;
        }
      }

      // 3. ถ้าเงินยังเหลือ... (โอนเกินมา) -> สร้างบิลล่วงหน้า
      if (remainingMoney > 0) {
        const house = await prisma.house.findUnique({ where: { id: transactionInvoice.residentHouseId } });
        const monthlyRate = truncateDecimals(house?.feeType === 'CALCULATED' && house?.houseSize ? Number(house.feeRate) * Number(house.houseSize) : Number(house?.feeRate || 1000));
        
        let lastM = unpaidInvoices.length > 0 ? unpaidInvoices[unpaidInvoices.length - 1].billingMonth : new Date().getMonth() + 1;
        let lastY = unpaidInvoices.length > 0 ? unpaidInvoices[unpaidInvoices.length - 1].billingYear : new Date().getFullYear();

        while (remainingMoney >= monthlyRate) {
          lastM++; if (lastM > 12) { lastM = 1; lastY++; }
          await prisma.invoice.create({
            data: {
              invoiceNo: `ADV-${house?.houseNo}-${lastM}${lastY}`,
              billingMonth: lastM,
              billingYear: lastY,
              baseAmount: monthlyRate,
              penaltyAmount: 0,
              totalAmount: monthlyRate, 
              paidAmount: monthlyRate, // จ่ายล่วงหน้าเต็มจำนวน
              status: 'PAID',
              paidAt: new Date(),
              dueDate: new Date(lastY, lastM - 1, 5),
              residentHouseId: transactionInvoice.residentHouseId,
              isNotified: true
            }
          });
          remainingMoney -= monthlyRate;
          updatedInvoicesCount++;
        }
      }

      // 4. อัปเดตสถานะสลิปนี้ให้เสร็จสมบูรณ์
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() }
      });

      // 5. ยิง LINE ใบเสร็จหาลูกบ้าน
      await sendStatusUpdateFlex(invoiceId, 'PAID');

      return NextResponse.json({ 
        success: true, 
        message: `รับยอดโอนสำเร็จ (ตัดหนี้ไป ${updatedInvoicesCount} รายการ)` 
      });
    }

  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}