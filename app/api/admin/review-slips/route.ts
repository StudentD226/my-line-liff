export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { messagingApi } from '@line/bot-sdk';

const prisma = new PrismaClient();
const truncateDecimals = (val: number) => Math.floor(Math.round(val * 10000) / 100) / 100;

// ตั้งค่า LINE Client สำหรับยิงแจ้งเตือน
const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

// ==========================================
// ฟังก์ชันยิง Flex Message แจ้งผลการตรวจสลิป (นำอิโมจิออกทั้งหมด)
// ==========================================
async function sendInlineFlexNotify(invoice: any, status: string, note?: string) {
  if (!client) return;
  try {
    const house = await prisma.house.findUnique({
      where: { id: invoice.residentHouseId },
      include: { residents: true }
    });
    if (!house) return;

    const lineIds = house.residents.map(r => r.lineId).filter(Boolean) as string[];
    if (lineIds.length === 0) return;

    const isApproved = status === 'PAID';
    
    // ตั้งค่า Theme สีและข้อความ (เขียว = ผ่าน / แดง = ปฏิเสธ)
    const statusBgColor = isApproved ? "#ECFDF5" : "#FEF2F2"; 
    const statusTextColor = isApproved ? "#059669" : "#DC2626"; 
    
    // ข้อความแจ้งเตือนอย่างเป็นทางการ
    const statusText = isApproved 
      ? "ยืนยันการรับชำระเงินเสร็จสิ้น" 
      : `สถานะ: ปฏิเสธรายการ\nเหตุผล: ${note || 'ข้อมูลไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ'}`;
    
    // กล่องยอดเงิน
    const amountBgColor = isApproved ? "#ECFDF5" : "#FDEBEC";
    const amountTextColor = isApproved ? "#059669" : "#EF4444";

    const buttonColor = isApproved ? "#376B64" : "#EF4444";
    const buttonLabel = isApproved ? "ดูประวัติและสถานะบัญชี" : "ดำเนินการแนบหลักฐานใหม่";
    const buttonUri = isApproved ? "/invoices" : "/payment"; 

    // แปลงวันที่ตรวจสอบ
    const d = new Date();
    const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const dateStr = `${d.getDate()} ${fullThaiMonths[d.getMonth() + 1]} ${d.getFullYear() + 543}`;

    // โครงสร้าง Flex Message
    const flexMessage: messagingApi.FlexMessage = {
      type: "flex",
      altText: isApproved ? `การยืนยันรับชำระเงิน บ้านเลขที่อ้างอิง ${house.houseNo}` : `แจ้งเตือนการปฏิเสธรายการ บ้านเลขที่อ้างอิง ${house.houseNo}`,
      contents: {
        type: "bubble",
        size: "kilo",
        body: {
          type: "box", layout: "vertical", paddingAll: "xl", backgroundColor: "#FFFFFF",
          contents: [
            {
              type: "box", layout: "horizontal", alignItems: "center",
              contents: [
                { type: "text", text: `บ้านเลขที่อ้างอิง: ${house.houseNo || "-"}`, weight: "bold", size: "lg", color: "#111827" }
              ]
            },
            {
              type: "box", layout: "vertical", margin: "md", backgroundColor: statusBgColor, cornerRadius: "lg", paddingAll: "lg",
              contents: [
                { type: "text", text: statusText, size: "sm", color: statusTextColor, weight: "bold", align: "center", wrap: true }
              ]
            },
            {
              type: "box", layout: "vertical", margin: "xl", backgroundColor: amountBgColor, cornerRadius: "lg", paddingAll: "lg", alignItems: "center",
              contents: [
                { type: "text", text: "ยอดดำเนินการ", size: "sm", color: amountTextColor, weight: "bold" },
                { type: "text", text: `${Number(invoice.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, size: "xl", weight: "bold", color: amountTextColor, margin: "sm" }
              ]
            },
            {
              type: "box", layout: "horizontal", margin: "lg",
              contents: [
                { type: "text", text: "วันที่ตรวจสอบ", size: "sm", color: "#4B5563" },
                { type: "text", text: dateStr, size: "sm", color: "#111827", align: "end" }
              ]
            }
          ]
        },
        footer: {
          type: "box", layout: "vertical", paddingStart: "xl", paddingEnd: "xl", paddingBottom: "xl",
          contents: [
            {
              type: "button", style: "primary", color: buttonColor, height: "sm",
              action: { 
                type: "uri", 
                label: buttonLabel, 
                uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}${buttonUri}` 
              }
            },
            {
              type: "text", text: `หมายเลขอ้างอิงระบบ: ${invoice.invoiceNo}`, color: "#9CA3AF", size: "xs", align: "center", margin: "md"
            }
          ]
        }
      } as any
    };

    await client.multicast({ to: lineIds, messages: [flexMessage] });
  } catch (error) {
    console.error('Inline LINE notify failed:', error);
  }
}

// ==========================================
// 1. ดึงข้อมูลสลิปที่รอตรวจสอบ (GET)
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

      const totalDebt = inv.house?.invoices.reduce((sum, item) => {
        const itemTotal = Number(item.baseAmount || 0) + Number(item.penaltyAmount || 0); 
        const debt = truncateDecimals(itemTotal - Number(item.paidAmount || 0));
        return sum + (debt > 0 ? debt : 0);
      }, 0) || 0;
      
      return {
        ...inv,
        totalDebt: truncateDecimals(totalDebt),
        outstandingBalance: truncateDecimals(totalDebt) 
      };
    });

    return NextResponse.json({ success: true, invoices: mappedInvoices });
  } catch (error) {
    console.error("Fetch Pending Invoices Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}

// ==========================================
// 2. แอดมินกดอนุมัติ/ปฏิเสธ สลิป (PATCH)
// ==========================================
export async function PATCH(request: Request) {
  try {
    const { invoiceId, status, note } = await request.json();

    if (!invoiceId || !status) return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });

    const transactionInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!transactionInvoice) return NextResponse.json({ success: false, error: 'ไม่พบรายการอ้างอิงในระบบ' }, { status: 404 });

    // 1. กรณีปฏิเสธสลิป
    if (status === 'REJECTED') {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'REJECTED' } });
      await sendInlineFlexNotify(transactionInvoice, 'REJECTED', note); 
      return NextResponse.json({ success: true, message: `ดำเนินการปฏิเสธรายการสำเร็จ` });
    }

    // 2. กรณีอนุมัติสลิป (ทำงานตามระบบ FIFO)
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
      
      await sendInlineFlexNotify(transactionInvoice, 'PAID');

      return NextResponse.json({ success: true, message: `ดำเนินการเสร็จสิ้น (อัปเดตระบบ ${updatedInvoicesCount} รายการ)` });
    }
  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการประมวลผลระบบ' }, { status: 500 });
  }
}