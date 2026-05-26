export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendStatusUpdateFlex } from '@/lib/line-notify'; 

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

// ==========================================
// 1. ดึงข้อมูลสลิปที่รอตรวจสอบ (ปรับปรุงสูตรคำนวณโชว์แอดมิน)
// ==========================================
export async function GET() {
  try {
    const config = await prisma.systemConfig.findFirst();
    const penaltyRate = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);

    const invoices = await prisma.invoice.findMany({
      where: { status: 'CHECKING' }, 
      include: { 
        house: {
          include: {
            invoices: {
              where: { 
                status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] },
                invoiceNo: { not: { startsWith: 'TR-' } },
                billingYear: { not: 9999 }
              }
            }
          }
        } 
      },
      orderBy: { createdAt: 'asc' } 
    });

    const mappedInvoices = invoices.map(inv => {
      // 🌟 1. ดักแก้บั๊ก: อัปเดตค่าปรับในอาเรย์ย่อยของบิลค้างก่อน เผื่อ Frontend ดึงไปวนลูปแสดงผล
      if (inv.house && inv.house.invoices) {
        inv.house.invoices = inv.house.invoices.map(item => {
          let base = Number(item.baseAmount || 0);
          let penalty = Number(item.penaltyAmount || 0);
          
          const dueDate = item.dueDate ? new Date(item.dueDate) : new Date();
          dueDate.setHours(0, 0, 0, 0);

          if (today > dueDate && penalty === 0) {
            let monthsLate = (today.getFullYear() - dueDate.getFullYear()) * 12 + (today.getMonth() - dueDate.getMonth());
            if (monthsLate <= 0) monthsLate = 1;
            penalty = truncateDecimals(monthsLate * penaltyRate);
          }

          return {
            ...item,
            penaltyAmount: penalty,
            totalAmount: truncateDecimals(base + penalty)
          };
        });
      }

      // 🌟 2. คำนวณยอดหนี้รวมสุทธิของบ้านหลังนี้ใหม่ทั้งหมดแบบรวมค่าปรับสดๆ
      const totalDebt = inv.house?.invoices.reduce((sum, item) => {
        const itemTotal = Number(item.baseAmount || 0) + Number(item.penaltyAmount || 0); 
        const debt = truncateDecimals(itemTotal - Number(item.paidAmount || 0));
        return sum + (debt > 0 ? debt : 0);
      }, 0) || 0;
      
      return {
        ...inv,
        // 🎯 3. ดักส่งให้ 2 ชื่อตัวแปรเลย กันเหนียว เผื่อ Frontend เรียกชื่อต่างกัน ยอดจะได้ขึ้นชัวร์ๆ!
        totalDebt: truncateDecimals(totalDebt),
        outstandingBalance: truncateDecimals(totalDebt) 
      };
    });

    return NextResponse.json({ success: true, invoices: mappedInvoices });
  } catch (error) {
    console.error("Fetch Pending Invoices Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ==========================================
// 2. แอดมินกดอนุมัติ/ปฏิเสธ สลิป (ระบบ FIFO)
// ==========================================
export async function PATCH(request: Request) {
  try {
    const { invoiceId, status, note } = await request.json();

    if (!invoiceId || !status) return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });

    const transactionInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!transactionInvoice) return NextResponse.json({ success: false, error: 'ไม่พบรายการแจ้งโอน' }, { status: 404 });

    if (status === 'REJECTED') {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'REJECTED' } });
      await sendStatusUpdateFlex(invoiceId, 'REJECTED').catch(e => console.error('LINE notify failed', e)); 
      return NextResponse.json({ success: true, message: `ปฏิเสธสลิปสำเร็จ` });
    }

    if (status === 'PAID') {
      let remainingMoney = truncateDecimals(Number(transactionInvoice.totalAmount)); 
      let updatedInvoicesCount = 0;

      const config = await prisma.systemConfig.findFirst();
      const penaltyRate = config?.penaltyRatePerDay ? Number(config.penaltyRatePerDay) : 100;
      const today = new Date(); 
      today.setHours(0, 0, 0, 0);

      const unpaidInvoices = await prisma.invoice.findMany({
        where: { 
          residentHouseId: transactionInvoice.residentHouseId,
          status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] },
          invoiceNo: { not: { startsWith: 'TR-' } },
          billingYear: { not: 9999 }
        },
        orderBy: [{ billingYear: 'asc' }, { billingMonth: 'asc' }]
      });

      for (const inv of unpaidInvoices) {
        if (remainingMoney <= 0) break;

        const base = Number(inv.baseAmount || 0);
        let penalty = Number(inv.penaltyAmount || 0);

        const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate && penalty === 0) {
            let monthsLate = (today.getFullYear() - dueDate.getFullYear()) * 12 + (today.getMonth() - dueDate.getMonth());
            if (monthsLate <= 0) monthsLate = 1;
            penalty = truncateDecimals(monthsLate * penaltyRate);
        }

        const currentTotal = truncateDecimals(base + penalty); 
        const currentPaid  = truncateDecimals(Number(inv.paidAmount  || 0));
        const actualDebt   = truncateDecimals(currentTotal - currentPaid);

        if (actualDebt <= 0) continue;

        if (remainingMoney < actualDebt) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: {
              penaltyAmount: penalty, 
              totalAmount: currentTotal, 
              paidAmount: truncateDecimals(currentPaid + remainingMoney),
              status: 'PARTIAL',
            },
          });
          remainingMoney = 0;
          updatedInvoicesCount++;
          break; 
        } else {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: {
              penaltyAmount: penalty, 
              totalAmount: currentTotal, 
              paidAmount: currentTotal,
              status: 'PAID',
              paidAt: new Date(),
            },
          });
          remainingMoney = truncateDecimals(remainingMoney - actualDebt);
          updatedInvoicesCount++;
        }
      }

      if (remainingMoney > 0) {
        const house = await prisma.house.findUnique({ where: { id: transactionInvoice.residentHouseId } });
        const monthlyRate = truncateDecimals(
          house?.feeType === 'CALCULATED' && house?.houseSize
            ? Number(house.feeRate) * Number(house.houseSize)
            : Number(house?.feeRate || 1000)
        );

        let lastM = unpaidInvoices.length > 0
          ? unpaidInvoices[unpaidInvoices.length - 1].billingMonth
          : new Date().getMonth() + 1;
        let lastY = unpaidInvoices.length > 0
          ? unpaidInvoices[unpaidInvoices.length - 1].billingYear
          : new Date().getFullYear();

        while (remainingMoney >= monthlyRate) {
          lastM++;
          if (lastM > 12) { lastM = 1; lastY++; }
          await prisma.invoice.create({
            data: {
              invoiceNo: `ADV-${house?.houseNo}-${String(lastM).padStart(2, '0')}${lastY}`,
              billingMonth: lastM,
              billingYear:  lastY,
              baseAmount:    monthlyRate,
              penaltyAmount: 0,
              totalAmount:   monthlyRate,
              paidAmount:    monthlyRate, 
              status:   'PAID',
              paidAt:   new Date(),
              dueDate:  new Date(lastY, lastM - 1, 5),
              residentHouseId: transactionInvoice.residentHouseId,
              isNotified: true,
            },
          });
          remainingMoney = truncateDecimals(remainingMoney - monthlyRate);
          updatedInvoicesCount++;
        }
      }

      await prisma.invoice.update({ 
        where: { id: invoiceId }, 
        data: { status: 'PAID', paidAt: new Date() } 
      });
      
      try {
        await sendStatusUpdateFlex(invoiceId, 'PAID');
      } catch (lineError) { console.error('LINE notify failed', lineError); }

      return NextResponse.json({ success: true, message: `รับยอดโอนสำเร็จ (อัปเดตไป ${updatedInvoicesCount} รายการ)` });
    }
  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}