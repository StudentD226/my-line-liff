import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendStatusUpdateFlex } from '@/lib/line-notify'; 

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

export async function GET() {
  try {
    // 🌟 ดึงบิลแจ้งโอน พร้อมกับดึง "หนี้ทั้งหมดที่ค้างอยู่" ของบ้านนั้นมาด้วย
    const invoices = await prisma.invoice.findMany({
      where: { status: 'CHECKING', billingYear: 9999 }, 
      include: { 
        house: {
          include: {
            invoices: {
              where: { status: { in: ['PENDING', 'OVERDUE'] }, billingYear: { not: 9999 } }
            }
          }
        } 
      },
      orderBy: { createdAt: 'asc' } 
    });

    // 🌟 คำนวณยอดหนี้รวมของแต่ละบ้านแนบส่งไปให้หน้าเว็บ
    const mappedInvoices = invoices.map(inv => {
      const totalDebt = inv.house?.invoices.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0) || 0;
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

    if (status === 'PAID') {
      let remainingMoney = truncateDecimals(Number(transactionInvoice.totalAmount)); 
      let updatedInvoicesCount = 0;

      const unpaidInvoices = await prisma.invoice.findMany({
        where: { 
          residentHouseId: transactionInvoice.residentHouseId,
          status: { in: ['PENDING', 'OVERDUE'] },
          billingYear: { not: 9999 } 
        },
        orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
      });

      for (const inv of unpaidInvoices) {
        if (remainingMoney <= 0) break; 

        const debtOfThisInvoice = truncateDecimals(Number(inv.totalAmount));

        if (remainingMoney >= debtOfThisInvoice) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { 
              status: 'PAID', 
              paidAt: new Date(),
              totalAmount: 0 
            }
          });
          remainingMoney = truncateDecimals(remainingMoney - debtOfThisInvoice);
          updatedInvoicesCount++;
        } else {
          const newDebt = truncateDecimals(debtOfThisInvoice - remainingMoney);
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { totalAmount: newDebt }
          });
          remainingMoney = 0;
          updatedInvoicesCount++;
        }
      }

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
              totalAmount: 0, 
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

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() }
      });

      await sendStatusUpdateFlex(invoiceId, 'PAID');

      return NextResponse.json({ 
        success: true, 
        message: `รับยอดโอนสำเร็จ (หักหนี้ไป ${updatedInvoicesCount} บิล)` 
      });
    }

  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}