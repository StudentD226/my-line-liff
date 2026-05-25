export const dynamic = 'force-dynamic'; // 🌟 พระเอกของเรา สั่งให้ห้ามจำข้อมูลเก่า!
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendStatusUpdateFlex } from '@/lib/line-notify'; 

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

// ==========================================
// 1. ดึงข้อมูลสลิปที่รอตรวจสอบ (พร้อมโชว์ยอดหนี้ที่หัก Partial แล้ว)
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
                status: { in: ['PENDING', 'OVERDUE', 'REJECTED', 'PARTIAL'] }, // 🌟 เพิ่ม PARTIAL
                invoiceNo: { not: { startsWith: 'TR-' } },
                billingYear: { not: 9999 } // กันบิลแปลกปลอม
              }
            }
          }
        } 
      },
      orderBy: { createdAt: 'asc' } 
    });

    const mappedInvoices = invoices.map(inv => {
      // 🌟 คิดหนี้รวมแบบหักเงินที่ทยอยจ่ายไปแล้ว (total - paid)
      const totalDebt = inv.house?.invoices.reduce((sum, item) => {
        const debt = truncateDecimals(Number(item.totalAmount || 0) - Number(item.paidAmount || 0));
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
// 2. แอดมินกดอนุมัติ/ปฏิเสธ สลิป (ระบบ FIFO ของแท้!)
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
      let remainingMoney = truncateDecimals(Number(transactionInvoice.totalAmount)); // ยอดเงินที่โอนมาจริงๆ
      let updatedInvoicesCount = 0;

      // ดึงบิลเก่าที่ค้างอยู่ทั้งหมด (รวมถึง PARTIAL)
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
        
        // 🌟 หนี้จริงๆ ของบิลใบนี้ = ยอดรวม - ยอดที่เคยจ่ายมาแล้ว
        const currentTotal = truncateDecimals(Number(inv.totalAmount || 0));
        const currentPaid = truncateDecimals(Number(inv.paidAmount || 0));
        const actualDebt = truncateDecimals(currentTotal - currentPaid);

        if (actualDebt <= 0) continue; // ถ้าไม่เหลือหนี้ให้ข้ามไป

        if (remainingMoney >= actualDebt) {
          // 👉 จ่ายครบพอดีปิดบิลนี้ (เปลี่ยนสถานะเป็น PAID และเติม paidAmount ให้เต็ม)
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { 
              paidAmount: currentTotal, // เติมเงินให้เต็มกระปุก
              status: 'PAID', 
              paidAt: new Date() 
            }
          });
          remainingMoney = truncateDecimals(remainingMoney - actualDebt);
          updatedInvoicesCount++;
        } else {
          // 👉 จ่ายขาด (เงินหมดก่อนปิดบิล)
          const newPaidAmount = truncateDecimals(currentPaid + remainingMoney);
          await prisma.invoice.update({
            where: { id: inv.id },
            data: { 
              paidAmount: newPaidAmount, // สะสมยอดโอนเพิ่มเข้าไป
              status: 'PARTIAL' // เปลี่ยนเป็นสีส้ม
            }
          });
          remainingMoney = 0;
          updatedInvoicesCount++;
        }
      }

      // 👉 จ่ายเกิน (งอกบิลล่วงหน้า)
      if (remainingMoney > 0) {
        const house = await prisma.house.findUnique({ where: { id: transactionInvoice.residentHouseId } });
        const monthlyRate = truncateDecimals(house?.feeType === 'CALCULATED' && house?.houseSize ? Number(house.feeRate) * Number(house.houseSize) : Number(house?.feeRate || 1000));
        
        let lastM = unpaidInvoices.length > 0 ? unpaidInvoices[unpaidInvoices.length - 1].billingMonth : new Date().getMonth() + 1;
        let lastY = unpaidInvoices.length > 0 ? unpaidInvoices[unpaidInvoices.length - 1].billingYear : new Date().getFullYear();

        // สมมติค่าส่วนกลาง 1000 แล้วโอนเกินมา 2500 ก็งอกบิลรัวๆ เลย
        while (remainingMoney >= monthlyRate) {
          lastM++; if (lastM > 12) { lastM = 1; lastY++; }
          await prisma.invoice.create({
            data: {
              invoiceNo: `ADV-${house?.houseNo}-${String(lastM).padStart(2, '0')}${lastY}`,
              billingMonth: lastM, 
              billingYear: lastY,
              baseAmount: monthlyRate, 
              penaltyAmount: 0, 
              totalAmount: monthlyRate, 
              paidAmount: monthlyRate, // 🌟 งอกปุ๊บถือว่าจ่ายเต็มปั๊บ
              status: 'PAID', 
              paidAt: new Date(), 
              dueDate: new Date(lastY, lastM - 1, 5),
              residentHouseId: transactionInvoice.residentHouseId, 
              isNotified: true
            }
          });
          remainingMoney = truncateDecimals(remainingMoney - monthlyRate);
          updatedInvoicesCount++;
        }
      }

      // สุดท้าย: เปลี่ยนสถานะสลิปที่รอยืนยัน (TR-) เป็น PAID
      await prisma.invoice.update({ 
        where: { id: invoiceId }, 
        data: { status: 'PAID', paidAt: new Date() } 
      });
      
      // ส่งแจ้งเตือนว่ารับเงินแล้ว
      await sendStatusUpdateFlex(invoiceId, 'PAID');

      return NextResponse.json({ success: true, message: `รับยอดโอนสำเร็จ (อัปเดตไป ${updatedInvoicesCount} รายการ)` });
    }
  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต' }, { status: 500 });
  }
}