import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  processInitialBalances,
  parseCsvOrTextMigration,
  HouseMigrationInput,
  PenaltyCalcMode,
} from '@/lib/initial-balance';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

// ========================================================
// 🟢 GET: เรียกดูประวัติการตั้งค่ายอดยกมา (History Log) & สรุปภาพรวม
// ========================================================
export async function GET() {
  try {
    const history = await prisma.initialBalanceHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // ดึงข้อมูลบ้านทั้งหมดในโครงการ
    const allHouses = await prisma.house.findMany({
      select: {
        id: true,
        houseNo: true,
        feeRate: true,
      },
    });
    const totalHouses = allHouses.length;

    // ดึงบิลยอดยกมา (INIT-) และบิลชำระล่วงหน้า (ADV-)
    const initInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNo: { startsWith: 'INIT-' } },
          { invoiceNo: { startsWith: 'ADV-' } },
        ],
      },
      select: {
        id: true,
        invoiceNo: true,
        billingMonth: true,
        billingYear: true,
        baseAmount: true,
        penaltyAmount: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        house: { select: { houseNo: true } },
      },
    });

    // 1. ข้อมูลบิลยอดยกมาที่ยังค้างชำระ (Overdue / Pending)
    const overdueInitInvoices = initInvoices.filter((i) =>
      i.invoiceNo.startsWith('INIT-') && ['OVERDUE', 'PENDING', 'PARTIAL'].includes(i.status)
    );
    const distinctHouses = new Set(overdueInitInvoices.map((i) => i.house?.houseNo).filter(Boolean));
    const totalPrincipal = overdueInitInvoices.reduce((sum, i) => sum + (Number(i.baseAmount) || 0), 0);
    const totalPenalty = overdueInitInvoices.reduce((sum, i) => sum + (Number(i.penaltyAmount) || 0), 0);
    const grandTotal = overdueInitInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

    // 2. คำนวณช่วงเดือนของโครงการ (Migration Window: ตั้งแต่งวดแรกสุดจนถึงวันตัดยอด)
    // เริ่มต้นจาก ก.ย. 2564 (9/2021) ถึง ต.ค. 2569 (10/2026)
    let minMonthTotal = 2021 * 12 + 9;
    let maxMonthTotal = 2026 * 12 + 10;

    if (overdueInitInvoices.length > 0) {
      for (const inv of overdueInitInvoices) {
        if (inv.billingYear && inv.billingMonth) {
          const val = inv.billingYear * 12 + inv.billingMonth;
          if (val < minMonthTotal) minMonthTotal = val;
          if (val > maxMonthTotal) maxMonthTotal = val;
        }
      }
    }

    const totalMonthsPerHouse = Math.max(0, maxMonthTotal - minMonthTotal + 1);

    // นับงวดค้างชำระของแต่ละบ้าน
    const unpaidCountByHouse: Record<string, number> = {};
    for (const inv of overdueInitInvoices) {
      const hNo = inv.house?.houseNo;
      if (hNo) {
        unpaidCountByHouse[hNo] = (unpaidCountByHouse[hNo] || 0) + 1;
      }
    }

    // ตรวจสอบว่ามีการบันทึกยอดยกมาแล้วหรือไม่
    const hasInitialBalanceData = overdueInitInvoices.length > 0 || history.length > 0;

    let paidInvoicesCount = 0;
    let totalPaidAmount = 0;

    if (hasInitialBalanceData) {
      for (const house of allHouses) {
        const unpaidCount = unpaidCountByHouse[house.houseNo] || 0;
        const paidMonths = Math.max(0, totalMonthsPerHouse - unpaidCount);
        const rate = Number(house.feeRate) || 0;

        paidInvoicesCount += paidMonths;
        totalPaidAmount += paidMonths * rate;
      }
    }

    // รวมบิลชำระล่วงหน้า (ADV-) ที่มีสถานะ PAID หรือ PARTIAL
    const advancePaidInvoices = initInvoices.filter(
      (i) => i.invoiceNo.startsWith('ADV-') && (i.status === 'PAID' || i.status === 'PARTIAL')
    );
    for (const adv of advancePaidInvoices) {
      if (adv.status === 'PAID') {
        paidInvoicesCount += 1;
      }
      totalPaidAmount += Number(adv.paidAmount) || (adv.status === 'PAID' ? Number(adv.totalAmount) : 0);
    }

    // รวมบิลอื่นในระบบที่มีสถานะ PAID (ถ้ามี)
    const otherPaidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        invoiceNo: { not: { startsWith: 'TR-' } },
        NOT: [
          { invoiceNo: { startsWith: 'INIT-' } },
          { invoiceNo: { startsWith: 'ADV-' } },
        ],
      },
      select: {
        id: true,
        paidAmount: true,
        totalAmount: true,
      },
    });

    for (const op of otherPaidInvoices) {
      paidInvoicesCount += 1;
      totalPaidAmount += Number(op.paidAmount) || Number(op.totalAmount) || 0;
    }

    const totalHousesWithDebt = distinctHouses.size;
    const fullyPaidHousesCount = Math.max(0, totalHouses - totalHousesWithDebt);

    return NextResponse.json({
      success: true,
      history,
      summary: {
        totalHouses,
        totalHousesWithDebt,
        fullyPaidHousesCount,
        totalInvoices: overdueInitInvoices.length,
        totalPrincipal,
        totalPenalty,
        grandTotal,
        // 🌟 ข้อมูลที่จ่ายครบแล้ว
        paidInvoicesCount,
        totalPaidAmount,
        totalMonthsPerHouse,
      },
    });
  } catch (error: any) {
    console.error('Error fetching initial balance history:', error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถดึงประวัติการตั้งค่ายอดยกมาได้' }, { status: 500 });
  }
}

// ========================================================
// 🔴 DELETE: รีเซ็ตข้อมูลยอดยกมาทั้งหมด (ล้าง INIT- และประวัติทั้งหมด)
// ========================================================
export async function DELETE() {
  try {
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: {
        OR: [
          { invoiceNo: { startsWith: 'INIT-' } },
          { invoiceNo: { startsWith: 'ADV-' }, slipUrl: null },
        ],
      },
    });

    const deletedHistory = await prisma.initialBalanceHistory.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `รีเซ็ตข้อมูลยอดยกมาทั้งหมดสำเร็จ (ลบบิลยอดยกมา/ล่วงหน้า ${deletedInvoices.count} รายการ, ล้างประวัติ ${deletedHistory.count} รายการ)`,
      deletedInvoicesCount: deletedInvoices.count,
      deletedHistoryCount: deletedHistory.count,
    });
  } catch (error: any) {
    console.error('Error resetting initial balances:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถรีเซ็ตข้อมูลยอดยกมาได้' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action = 'preview',
      cutoffDate,
      items,
      rawCsvText,
      penaltyCalcMode = 'FLAT_PER_MONTH',
      flatPenaltyPerMonth,
    } = body as {
      action?: 'preview' | 'confirm' | 'reset_all';
      cutoffDate?: string;
      items?: HouseMigrationInput[];
      rawCsvText?: string;
      penaltyCalcMode?: PenaltyCalcMode;
      flatPenaltyPerMonth?: number;
    };

    // รองรับการรีเซ็ตข้อมูลผ่าน POST ด้วย
    if (action === 'reset_all') {
      const deletedInvoices = await prisma.invoice.deleteMany({
        where: {
          OR: [
            { invoiceNo: { startsWith: 'INIT-' } },
            { invoiceNo: { startsWith: 'ADV-' }, slipUrl: null },
          ],
        },
      });
      const deletedHistory = await prisma.initialBalanceHistory.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `รีเซ็ตข้อมูลยอดยกมาทั้งหมดสำเร็จ (ลบบิลยอดยกมา/ล่วงหน้า ${deletedInvoices.count} รายการ, ล้างประวัติ ${deletedHistory.count} รายการ)`,
        deletedInvoicesCount: deletedInvoices.count,
        deletedHistoryCount: deletedHistory.count,
      });
    }

    if (!cutoffDate) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุวันที่ตัดยอด (Cut-off Date)' },
        { status: 400 }
      );
    }

    // ดึงค่า penaltyRatePerDay จาก SystemConfig เป็น fallback (ชื่อ field หลอก — จริงๆ คือต่อเดือน)
    let resolvedFlatPenalty = flatPenaltyPerMonth;
    if (resolvedFlatPenalty === undefined || resolvedFlatPenalty === null) {
      const config = await prisma.systemConfig.findFirst();
      resolvedFlatPenalty = config?.penaltyRatePerDay !== undefined && config?.penaltyRatePerDay !== null
        ? Number(config.penaltyRatePerDay)
        : 100;
    }

    // แปลงข้อมูลจาก CSV หรือใช้ JSON Array
    let parsedItems: HouseMigrationInput[] = [];
    if (rawCsvText && typeof rawCsvText === 'string') {
      parsedItems = parseCsvOrTextMigration(rawCsvText);
    } else if (Array.isArray(items)) {
      parsedItems = items;
    }

    if (parsedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายการข้อมูลบ้านหรือประวัติค้างชำระที่ถูกต้อง' },
        { status: 400 }
      );
    }

    // 1. ประมวลผลคำนวณเบี้ยปรับตามโหมดที่เลือก
    const calculation = processInitialBalances(parsedItems, cutoffDate, penaltyCalcMode, resolvedFlatPenalty);

    // 2. ถ้าเป็นแค่โหมด Preview ให้ส่งผลลัพธ์การคำนวณกลับไปให้ผู้ใช้ตรวจทาน
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        data: calculation,
      });
    }

    // 3. ถ้าเป็นโหมด Confirm ให้บันทึกลงฐานข้อมูลจริงด้วย Database Transaction
    let insertedInvoicesCount = 0;
    let touchedHousesCount = 0;

    await prisma.$transaction(
      async (tx) => {
        // ดึงหรือสร้าง House ID สำหรับทุกบ้านที่เกี่ยวข้องในรอบนี้
        const houseNos = Array.from(new Set(calculation.details.map((d) => d.houseNo.trim())));

        const existingHouses = await tx.house.findMany({
          where: { houseNo: { in: houseNos } },
          select: { id: true, houseNo: true },
        });

        const houseMap = new Map<string, string>(
          existingHouses.map((h) => [h.houseNo, h.id])
        );

        // สร้างบ้านที่ยังไม่มีในระบบ (upsert/create)
        const missingHouseNos = houseNos.filter((no) => !houseMap.has(no));
        for (const hNo of missingHouseNos) {
          const created = await tx.house.create({
            data: {
              houseNo: hNo,
              feeType: 'FIXED',
              feeRate: 0,
            },
            select: { id: true, houseNo: true },
          });
          houseMap.set(created.houseNo, created.id);
        }

        const touchedHouseIds = Array.from(houseMap.values());

        // 🌟 ลบบิลยอดยกมา (INIT-) เดิมที่ยังค้างชำระ (OVERDUE/PENDING) และบิลยกมาล่วงหน้าเดิม (ADV- ที่ไม่มี slip)
        if (touchedHouseIds.length > 0) {
          await tx.invoice.deleteMany({
            where: {
              residentHouseId: { in: touchedHouseIds },
              invoiceNo: { startsWith: 'INIT-' },
              status: { in: ['OVERDUE', 'PENDING', 'PARTIAL'] },
            },
          });
          await tx.invoice.deleteMany({
            where: {
              residentHouseId: { in: touchedHouseIds },
              invoiceNo: { startsWith: 'ADV-' },
              slipUrl: null,
            },
          });
        }

        // เตรียมข้อมูล Invoices ทั้งหมดที่จะบันทึกใหม่
        const invoicesToInsert: Array<{
          invoiceNo: string;
          billingYear: number;
          billingMonth: number;
          baseAmount: number;
          penaltyAmount: number;
          totalAmount: number;
          paidAmount: number;
          dueDate: Date;
          status: 'OVERDUE' | 'PAID' | 'PARTIAL';
          paidAt?: Date | null;
          isNotified?: boolean;
          residentHouseId: string;
        }> = [];

        for (const houseData of calculation.details) {
          touchedHousesCount++;
          const houseId = houseMap.get(houseData.houseNo.trim());
          if (!houseId) continue;

          const cleanHouse = houseData.houseNo.trim().replace(/[^a-zA-Z0-9]/g, '_');

          // 1. งวดค้างชำระย้อนหลัง (สถานะ OVERDUE)
          for (const period of houseData.periods) {
            const monthPad = String(period.billingMonth).padStart(2, '0');
            const invoiceNo = `INIT-${cleanHouse}-${period.billingYear}-${monthPad}`;

            invoicesToInsert.push({
              invoiceNo,
              billingYear: period.billingYear,
              billingMonth: period.billingMonth,
              baseAmount: period.principalAmount,
              penaltyAmount: period.penaltyAmount,
              totalAmount: period.totalAmount,
              paidAmount: 0,
              dueDate: new Date(period.dueDate),
              status: 'OVERDUE',
              residentHouseId: houseId,
            });
          }

          // 2. 🌟 งวดชำระล่วงหน้า / จ่ายเกินรอบบิล (สถานะ PAID หรือ PARTIAL ตามยอดเงินที่ตัดชำระจริง)
          if (houseData.advancePeriods && houseData.advancePeriods.length > 0) {
            for (const adv of houseData.advancePeriods) {
              const mPad = String(adv.billingMonth).padStart(2, '0');
              const invoiceNo = `ADV-${cleanHouse}-${mPad}${adv.billingYear}`;
              const dueDate = new Date(adv.billingYear, adv.billingMonth - 1, 7, 23, 59, 59);

              const base = Number(adv.baseAmount) || Number(adv.amount) || 0;
              const paid = Number(adv.paidAmount !== undefined ? adv.paidAmount : adv.amount) || 0;
              const isPaid = paid >= base;
              const status: 'PAID' | 'PARTIAL' = adv.status || (isPaid ? 'PAID' : 'PARTIAL');

              invoicesToInsert.push({
                invoiceNo,
                billingYear: adv.billingYear,
                billingMonth: adv.billingMonth,
                baseAmount: base,
                penaltyAmount: 0,
                totalAmount: base,
                paidAmount: paid,
                dueDate,
                status,
                paidAt: paid > 0 ? new Date() : null,
                isNotified: true,
                residentHouseId: houseId,
              });
            }
          }
        }

        // 🌟 บันทึกด้วย createMany แบบ Chunk (รวดเร็วกว่า upsert ทีละแถวถึง 100 เท่า และไม่ทำให้ Transaction Timeout)
        if (invoicesToInsert.length > 0) {
          const CHUNK_SIZE = 500;
          for (let i = 0; i < invoicesToInsert.length; i += CHUNK_SIZE) {
            const chunk = invoicesToInsert.slice(i, i + CHUNK_SIZE);
            const res = await tx.invoice.createMany({
              data: chunk,
              skipDuplicates: true, // ป้องกันกรณีชนกับบิลที่จ่ายแล้ว
            });
            insertedInvoicesCount += res.count;
          }
        }

        // 🌟 บันทึกประวัติการตั้งค่ายอดยกมาลงตาราง InitialBalanceHistory
        const hasAdvance = calculation.details.some((d) => d.advancePeriods && d.advancePeriods.length > 0);
        const actionType = parsedItems.length === 1
          ? (hasAdvance ? 'ADVANCE' : 'SINGLE')
          : (rawCsvText ? 'BATCH_CSV' : 'BATCH_MULTI');
        const houseList = calculation.details.map((d) => d.houseNo).slice(0, 30).join(', ');
        const houseSummary = calculation.details.length > 30
          ? `${houseList} และอีก ${calculation.details.length - 30} หลัง`
          : houseList;

        const fullThaiMonths = [
          '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
          'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
        ];

        let detailedNote = '';
        if (calculation.overdueProperties > 0) {
          detailedNote = `บันทึกค้างชำระ ${calculation.overdueProperties} หลัง (รวม ${insertedInvoicesCount} งวด)`;
          const firstItem = parsedItems[0];
          if (parsedItems.length === 1 && firstItem && firstItem.unpaidPeriods && firstItem.unpaidPeriods.length > 0) {
            const periods = firstItem.unpaidPeriods;
            const minP = periods[0];
            const maxP = periods[periods.length - 1];
            if (minP && maxP) {
              let prevM = minP.billingMonth - 1;
              let prevY = minP.billingYear;
              if (prevM < 1) { prevM = 12; prevY--; }
              detailedNote += ` [ค้างงวด ${fullThaiMonths[minP.billingMonth]} ${minP.billingYear + 543} ถึง ${fullThaiMonths[maxP.billingMonth]} ${maxP.billingYear + 543} · ชำระล่าสุดถึงงวด ${fullThaiMonths[prevM]} ${prevY + 543}]`;
            }
          }
        } else if ((calculation.advanceProperties || 0) > 0) {
          detailedNote = `บันทึกชำระล่วงหน้า ${calculation.advanceProperties} หลัง (รวม ${calculation.totalAdvanceMonths || 0} งวด เป็นเงิน ฿${(calculation.totalAdvanceAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })})`;
          const firstItem = parsedItems[0];
          if (firstItem && firstItem.advancePeriods && firstItem.advancePeriods.length > 0) {
            const lastAdv = firstItem.advancePeriods[firstItem.advancePeriods.length - 1];
            detailedNote += ` [ชำระล่วงหน้าถึงงวด ${fullThaiMonths[lastAdv.billingMonth]} ${lastAdv.billingYear + 543}]`;
          }
        } else {
          const cutoffObj = new Date(cutoffDate);
          const cMonth = cutoffObj.getMonth() + 1;
          const cYear = cutoffObj.getFullYear();
          detailedNote = `ชำระครบถ้วนถึงรอบบิล ${fullThaiMonths[cMonth]} ${cYear + 543} (ตัดยอด ณ วันที่ ${cutoffDate})`;
        }

        await tx.initialBalanceHistory.create({
          data: {
            actionType,
            houseNo: houseSummary || 'ไม่ระบุ',
            cutoffDate,
            penaltyCalcMode,
            flatPenaltyPerMonth: resolvedFlatPenalty,
            housesCount: touchedHousesCount,
            invoicesCount: insertedInvoicesCount,
            totalPrincipalDebt: calculation.totalPrincipalDebt,
            totalPenaltyDebt: calculation.totalPenaltyDebt,
            grandTotalDebt: calculation.grandTotalDebt,
            note: detailedNote,
            recordedBy: 'Admin',
          },
        });
      },
      {
        maxWait: 20000,
        timeout: 60000,
      }
    );

    return NextResponse.json({
      success: true,
      message: `บันทึกข้อมูลยอดยกมาตั้งต้นสำเร็จ (บ้าน ${touchedHousesCount} หลัง, รายการหนี้ย้อนหลัง ${insertedInvoicesCount} รายการ)`,
      data: {
        totalProperties: calculation.totalProperties,
        fullyPaidProperties: calculation.fullyPaidProperties,
        overdueProperties: calculation.overdueProperties,
        totalPrincipalDebt: calculation.totalPrincipalDebt,
        totalPenaltyDebt: calculation.totalPenaltyDebt,
        grandTotalDebt: calculation.grandTotalDebt,
        insertedInvoicesCount,
      },
    });
  } catch (error: any) {
    console.error('Initial Balance API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลยอดยกมา' },
      { status: 500 }
    );
  }
}
