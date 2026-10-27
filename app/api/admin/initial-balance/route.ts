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
      action?: 'preview' | 'confirm';
      cutoffDate?: string;
      items?: HouseMigrationInput[];
      rawCsvText?: string;
      penaltyCalcMode?: PenaltyCalcMode;
      flatPenaltyPerMonth?: number;
    };

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
        for (const houseData of calculation.details) {
          touchedHousesCount++;

          // ตรวจสอบหรือสร้างบ้าน
          const house = await tx.house.upsert({
            where: { houseNo: houseData.houseNo },
            update: {},
            create: {
              houseNo: houseData.houseNo,
              feeType: 'FIXED',
              feeRate: 0,
            },
          });

          // บันทึกบิลย้อนหลังเฉพาะงวดที่ค้าง
          for (const period of houseData.periods) {
            const cleanHouse = houseData.houseNo.replace(/[^a-zA-Z0-9]/g, '_');
            const monthPad = String(period.billingMonth).padStart(2, '0');
            const invoiceNo = `INIT-${cleanHouse}-${period.billingYear}-${monthPad}`;

            await tx.invoice.upsert({
              where: { invoiceNo },
              update: {
                baseAmount: period.principalAmount,
                penaltyAmount: period.penaltyAmount,
                totalAmount: period.totalAmount,
                dueDate: new Date(period.dueDate),
                status: 'OVERDUE',
              },
              create: {
                invoiceNo,
                billingYear: period.billingYear,
                billingMonth: period.billingMonth,
                baseAmount: period.principalAmount,
                penaltyAmount: period.penaltyAmount,
                totalAmount: period.totalAmount,
                paidAmount: 0,
                dueDate: new Date(period.dueDate),
                status: 'OVERDUE',
                residentHouseId: house.id,
              },
            });

            insertedInvoicesCount++;
          }
        }
      },
      {
        timeout: 60000, // รองรับกรณีนำเข้าข้อมูลย้อนหลังจำนวนมาก
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
