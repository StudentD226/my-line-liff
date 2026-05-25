export const dynamic = 'force-dynamic'; // 🌟 พระเอกของเรา สั่งให้ห้ามจำข้อมูลเก่า!
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendStatusUpdateFlex } from '@/lib/line-notify'; 

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

// ==========================================
// 1. ดึงข้อมูลสลิปที่รอตรวจสอบ 
// ==========================================
export async function GET() {
  try {
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
      // 🌟 แก้ไข 1: คิดหนี้รวมแบบเอา Base + Penalty สดๆ ชัวร์กว่าเชื่อ totalAmount ใน DB
      const totalDebt = inv.house?.invoices.reduce((sum, item) => {
        const itemTotal = Number(item.baseAmount || 0) + Number(item.penaltyAmount || 0); // บวกกันตรงนี้เลย!
        const debt = truncateDecimals(itemTotal - Number(item.paidAmount || 0));
        return sum + (debt > 0 ? debt : 0);
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

// ==========================================
// 2. แอดมินกดอนุมัติ/ปฏิเสธ สลิป (ระบบ FIFO)
// ==========================================
export async function PATCH(request: Request) {
  try {
    const { invoiceId, status, note } = await request.json();

    if (!invoiceId || !status) return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });

    const transactionInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!transactionInvoice) return NextResponse.json({ success: false, error: 'ไม่พบรายการแจ้งโอน' }, { status: 404 });

    // 🔴 แอดมินกด REJECT (ปฏิเสธสลิป)
    if (status === 'REJECTED') {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'REJECTED' } });
      await sendStatusUpdateFlex(invoiceId, 'REJECTED'); 
      return NextResponse.json({ success: true, message: `ปฏิเสธสลิปสำเร็จ` });
    }

    // 🟢 แอดมินกด PAID (ยืนยันยอดเงิน)
    if (status === 'PAID') {
      let remainingMoney = truncateDecimals(Number(transactionInvoice.totalAmount)); // ยอดที่โอนมา
      let updatedInvoicesCount = 0;

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

        // 🌟 แก้ไข 2: หาค่ายอดหนี้จริงด้วยการเอา Base + Penalty มาบวกกันใหม่!
        const base = Number(inv.baseAmount || 0);
        const penalty = Number(inv.penaltyAmount || 0);
        const currentTotal = truncateDecimals(base + penalty); 
        
        const currentPaid  = truncateDecimals(Number(inv.paidAmount  || 0));
        const actualDebt   = truncateDecimals(currentTotal - currentPaid);

        if (actualDebt <= 0) continue;

        if (remainingMoney < actualDebt) {
          // 👉 จ่ายขาด → บันทึก PARTIAL
          await prisma.invoice.update({
            where: { id: inv.id },
            data: {
              totalAmount: currentTotal, // ซ่อมข้อมูล totalAmount ใน DB ให้กลับมาถูกต้องด้วย
              paidAmount: truncateDecimals(currentPaid + remainingMoney),
              status: 'PARTIAL',
            },
          });
          remainingMoney = 0;
          updatedInvoicesCount++;
          break; 
        } else {
          // 👉 จ่ายครบ → ปิดบิล PAID
          await prisma.invoice.update({
            where: { id: inv.id },
            data: {
              totalAmount: currentTotal, // ซ่อมข้อมูล
              paidAmount: currentTotal,
              status: 'PAID',
              paidAt: new Date(),
            },
          });
          remainingMoney = truncateDecimals(remainingMoney - actualDebt);
          updatedInvoicesCount++;
        }
      }

      // 👉 จ่ายเกิน (งอกบิลล่วงหน้า)
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

        if (remainingMoney > 0) {
          console.warn(`[review-slips] invoiceId=${invoiceId} มีเงินเหลือ ${remainingMoney} บาท เศษที่ไม่พอเปิดบิล`);
        }
      }

      // ปิดงานสลิป TR- เป็น PAID
      await prisma.invoice.update({ 
        where: { id: invoiceId }, 
        data: { status: 'PAID', paidAt: new Date() } 
      });
      
      try {
        await sendStatusUpdateFlex(invoiceId, 'PAID');
      } catch (lineError) {
        console.error('[review-slips] LINE notify failed (PAID):', lineError);
      }

      return NextResponse.json({ success: true, message: `รับยอดโอนสำเร็จ (อัปเดตไป ${updatedInvoicesCount} รายการ)` });
    }
  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}