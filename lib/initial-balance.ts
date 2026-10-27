// lib/initial-balance.ts

/**
 * โหมดการคำนวณเบี้ยปรับ:
 * - NO_PENALTY: ไม่คิดค่าปรับทุกกรณี (ค่าปรับ = ฿0)
 * - STEP_RATE_PERCENT: คิดเป็น % ของเงินต้น ตามจำนวนวันค้างชำระ (1-30 วัน=0%, 31-180 วัน=10%, >180 วัน=20%)
 * - FLAT_PER_MONTH: คิดเป็นจำนวนเดือนค้างชำระ × อัตราต่อเดือน (ตรงกับระบบบิลหลัก)
 */
export type PenaltyCalcMode = 'STEP_RATE_PERCENT' | 'FLAT_PER_MONTH' | 'NO_PENALTY';

export interface DebtPeriodInput {
  billingYear: number;
  billingMonth: number;
  dueDate: string; // "YYYY-MM-DD"
  principalAmount: number;
  customPenaltyRate?: number; // สำหรับ STEP_RATE_PERCENT: เช่น 0, 10, 20
  customFlatPenalty?: number; // สำหรับ FLAT_PER_MONTH: จำนวนเงินค่าปรับตายตัว (override)
}

export interface AdvancePeriodInput {
  billingYear: number;
  billingMonth: number;
  amount: number; // ยอดชำระจริง (paidAmount)
  baseAmount?: number; // อัตราเต็มงวดตามเรทของบ้าน (เช่น 1000)
  paidAmount?: number; // ยอดที่ตัดชำระ (เช่น 1000 หรือ 500)
  remainingAmount?: number; // ยอดคงเหลือค้างในงวดนั้น (เช่น 0 หรือ 500)
  status?: 'PAID' | 'PARTIAL'; // สถานะบิล ชำระครบ หรือ ชำระบางส่วน
}

export interface HouseMigrationInput {
  houseNo: string;
  unpaidPeriods?: DebtPeriodInput[];
  advancePeriods?: AdvancePeriodInput[];
}

export interface CalculatedPeriod {
  billingYear: number;
  billingMonth: number;
  dueDate: string;
  daysOverdue: number;
  monthsOverdue: number;
  principalAmount: number;
  penaltyCalcMode: PenaltyCalcMode;
  penaltyRatePercent: number; // สำหรับ STEP_RATE_PERCENT (0, 10, 20)
  flatPenaltyPerMonth: number; // สำหรับ FLAT_PER_MONTH (อัตราต่อเดือน)
  penaltyAmount: number;
  totalAmount: number;
}

export interface CalculatedHouse {
  houseNo: string;
  isFullyPaid: boolean;
  totalUnpaidMonths: number;
  totalPrincipal: number;
  totalPenalty: number;
  grandTotal: number;
  periods: CalculatedPeriod[];
  advancePeriods?: AdvancePeriodInput[];
}

export interface MigrationCalculationResult {
  cutoffDate: string;
  penaltyCalcMode: PenaltyCalcMode;
  totalProperties: number;
  fullyPaidProperties: number;
  overdueProperties: number;
  advanceProperties?: number;
  totalPrincipalDebt: number;
  totalPenaltyDebt: number;
  grandTotalDebt: number;
  totalAdvanceAmount?: number;
  totalAdvanceMonths?: number;
  details: CalculatedHouse[];
}

export const truncate2 = (val: number): number => Math.floor(Math.round(val * 10000) / 100) / 100;

/**
 * คำนวณอัตราเบี้ยปรับย้อนหลังตามจำนวนวันที่ค้างชำระจริง (Step Rate)
 * - 1-30 วัน: 0%
 * - 31-180 วัน: 10%
 * - เกิน 180 วัน: 20%
 */
export function getStepPenaltyRate(daysOverdue: number): number {
  if (daysOverdue <= 30) return 0;
  if (daysOverdue <= 180) return 10;
  return 20;
}

/**
 * คำนวณจำนวนเดือนค้างชำระ (ตรงกับระบบบิลหลัก: floor(days / 30))
 */
export function getOverdueMonths(daysOverdue: number): number {
  return Math.floor(daysOverdue / 30);
}

/**
 * ฟังก์ชันหลักในการคำนวณยอดยกมาตั้งต้น
 * @param items - รายการบ้านและงวดค้างชำระ
 * @param cutoffDateStr - วันที่ตัดยอด (YYYY-MM-DD)
 * @param penaltyCalcMode - โหมดการคำนวณเบี้ยปรับ (STEP_RATE_PERCENT หรือ FLAT_PER_MONTH)
 * @param flatPenaltyPerMonth - อัตราค่าปรับต่อเดือน (ใช้เมื่อ mode เป็น FLAT_PER_MONTH, default 100)
 */
export function processInitialBalances(
  items: HouseMigrationInput[],
  cutoffDateStr: string,
  penaltyCalcMode: PenaltyCalcMode = 'FLAT_PER_MONTH',
  flatPenaltyPerMonth: number = 100
): MigrationCalculationResult {
  const cutoff = new Date(cutoffDateStr);
  cutoff.setHours(23, 59, 59, 999);

  let grandPrincipal = 0;
  let grandPenalty = 0;
  let fullyPaidHouses = 0;
  let overdueHouses = 0;
  let advanceHouses = 0;
  let totalAdvanceAmount = 0;
  let totalAdvanceMonths = 0;

  const details: CalculatedHouse[] = items.map((item) => {
    const rawPeriods = item.unpaidPeriods || [];
    const rawAdvancePeriods = item.advancePeriods || [];

    if (rawAdvancePeriods.length > 0) {
      advanceHouses++;
      totalAdvanceMonths += rawAdvancePeriods.length;
      totalAdvanceAmount += rawAdvancePeriods.reduce(
        (sum, a) => sum + (Number(a.paidAmount !== undefined ? a.paidAmount : a.amount) || 0),
        0
      );
    }

    if (rawPeriods.length === 0) {
      fullyPaidHouses++;
      return {
        houseNo: item.houseNo.trim(),
        isFullyPaid: true,
        totalUnpaidMonths: 0,
        totalPrincipal: 0,
        totalPenalty: 0,
        grandTotal: 0,
        periods: [],
        advancePeriods: rawAdvancePeriods,
      };
    }

    let housePrincipal = 0;
    let housePenalty = 0;

    const periods: CalculatedPeriod[] = rawPeriods.map((p) => {
      const due = new Date(p.dueDate);
      due.setHours(0, 0, 0, 0);

      const diffTime = cutoff.getTime() - due.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays);
      const monthsOverdue = getOverdueMonths(daysOverdue);

      const principal = truncate2(Number(p.principalAmount) || 0);
      let penalty = 0;
      let ratePercent = 0;
      let usedFlatPerMonth = flatPenaltyPerMonth;

      if (penaltyCalcMode === 'NO_PENALTY') {
        // โหมด No Penalty: ไม่คิดค่าปรับทุกกรณี (฿0)
        penalty = 0;
        ratePercent = 0;
        usedFlatPerMonth = 0;
      } else if (penaltyCalcMode === 'STEP_RATE_PERCENT') {
        // โหมด Step Rate: คิดเป็น % ของเงินต้น
        ratePercent = p.customPenaltyRate !== undefined ? Number(p.customPenaltyRate) : getStepPenaltyRate(daysOverdue);
        penalty = truncate2(principal * (ratePercent / 100));
      } else {
        // โหมด Flat Per Month: คิดเป็น จำนวนเดือน × อัตราต่อเดือน (ตรงกับระบบบิลหลัก)
        if (p.customFlatPenalty !== undefined && p.customFlatPenalty !== null) {
          // Admin กำหนดค่าปรับตายตัวเอง (override)
          penalty = truncate2(Number(p.customFlatPenalty));
        } else {
          penalty = truncate2(monthsOverdue * flatPenaltyPerMonth);
        }
        usedFlatPerMonth = flatPenaltyPerMonth;
      }

      const total = truncate2(principal + penalty);

      housePrincipal += principal;
      housePenalty += penalty;

      return {
        billingYear: Number(p.billingYear),
        billingMonth: Number(p.billingMonth),
        dueDate: p.dueDate,
        daysOverdue,
        monthsOverdue,
        principalAmount: principal,
        penaltyCalcMode,
        penaltyRatePercent: ratePercent,
        flatPenaltyPerMonth: usedFlatPerMonth,
        penaltyAmount: penalty,
        totalAmount: total,
      };
    });

    housePrincipal = truncate2(housePrincipal);
    housePenalty = truncate2(housePenalty);
    const houseTotal = truncate2(housePrincipal + housePenalty);

    if (houseTotal > 0) overdueHouses++;
    else fullyPaidHouses++;

    grandPrincipal += housePrincipal;
    grandPenalty += housePenalty;

    return {
      houseNo: item.houseNo.trim(),
      isFullyPaid: houseTotal === 0,
      totalUnpaidMonths: periods.length,
      totalPrincipal: housePrincipal,
      totalPenalty: housePenalty,
      grandTotal: houseTotal,
      periods,
      advancePeriods: rawAdvancePeriods,
    };
  });

  return {
    cutoffDate: cutoffDateStr,
    penaltyCalcMode,
    totalProperties: items.length,
    fullyPaidProperties: fullyPaidHouses,
    overdueProperties: overdueHouses,
    advanceProperties: advanceHouses,
    totalPrincipalDebt: truncate2(grandPrincipal),
    totalPenaltyDebt: truncate2(grandPenalty),
    grandTotalDebt: truncate2(grandPrincipal + grandPenalty),
    totalAdvanceAmount: truncate2(totalAdvanceAmount),
    totalAdvanceMonths,
    details,
  };
}

function normalizeMigrationYear(rawYear: number): number {
  if (rawYear > 2400) return rawYear - 543; // แปลง พ.ศ. เป็น ค.ศ. (เช่น 2564 -> 2021)
  if (rawYear >= 50 && rawYear <= 99) return rawYear + 2500 - 543; // เช่น 64 -> 2021
  return rawYear;
}

function parseMonthYear(str: string): { year: number; month: number } | null {
  const match = str.trim().match(/^(\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const m = parseInt(match[1], 10);
    const rawY = parseInt(match[2], 10);
    const y = normalizeMigrationYear(rawY);
    if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
      return { year: y, month: m };
    }
  }
  return null;
}

/**
 * ตัวแปลงข้อความ CSV หรือ Text ให้กลายเป็นโครงสร้าง HouseMigrationInput[]
 * รองรับทั้ง Comma (,) และ Tab (\t จาก Excel)
 * รูปแบบที่รองรับ:
 * 1) ช่วงเวลา: บ้านเลขที่, เดือนเริ่ม/ปีเริ่ม, เดือนสิ้นสุด/ปีสิ้นสุด, เงินต้น (เช่น 99/1, 9/2564, 12/2569, 500)
 * 2) รายเดือน (4 คอลัมน์): บ้านเลขที่, ปี, เดือน, เงินต้น (เช่น 99/1, 2567, 10, 500)
 * 3) รายปี (3 คอลัมน์): บ้านเลขที่, ปี, เงินต้นต่อเดือน (เช่น 99/1, 2567, 500 -> ค้างทั้ง 12 เดือน)
 * 4) มาตรฐาน (5 คอลัมน์): บ้านเลขที่, ปี, เดือน, กำหนดชำระ(YYYY-MM-DD), เงินต้น
 * 5) จ่ายครบแล้ว (1 คอลัมน์): บ้านเลขที่
 */
export function parseCsvOrTextMigration(rawText: string): HouseMigrationInput[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const houseMap = new Map<string, DebtPeriodInput[]>();

  for (const line of lines) {
    // รองรับทั้ง Comma (,) และ Tab (\t จากการ Copy ใน Excel/Google Sheets)
    const delimiter = line.includes('\t') ? '\t' : ',';
    const parts = line.split(delimiter).map((p) => p.trim());
    const houseNo = parts[0];
    if (!houseNo) continue;

    if (!houseMap.has(houseNo)) {
      houseMap.set(houseNo, []);
    }

    // กรณี 1 คอลัมน์: บ้านเลขที่เฉยๆ -> จ่ายครบแล้ว
    if (parts.length === 1) {
      continue;
    }

    // กรณี 4 คอลัมน์: ตรวจสอบว่าเป็นแบบช่วงเวลา (Range) หรือแบบรายงวด (Year, Month, Amount)
    if (parts.length === 4) {
      const startRange = parseMonthYear(parts[1]);
      const endRange = parseMonthYear(parts[2]);
      const amount = parseFloat(parts[3]);

      if (startRange && endRange && !isNaN(amount) && amount > 0) {
        // แตกงวดอัตโนมัติตามช่วงเวลา
        const startTotal = startRange.year * 12 + startRange.month;
        const endTotal = endRange.year * 12 + endRange.month;
        if (startTotal <= endTotal) {
          for (let cur = startTotal; cur <= endTotal; cur++) {
            const y = Math.floor((cur - 1) / 12);
            const m = ((cur - 1) % 12) + 1;
            const mPad = String(m).padStart(2, '0');
            houseMap.get(houseNo)!.push({
              billingYear: y,
              billingMonth: m,
              dueDate: `${y}-${mPad}-07`,
              principalAmount: amount,
            });
          }
          continue;
        }
      }

      // หรือเป็นแบบ: บ้านเลขที่, ปี, เดือน, เงินต้น
      const rawYear = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10);
      if (!isNaN(rawYear) && !isNaN(month) && !isNaN(amount) && amount > 0) {
        const y = normalizeMigrationYear(rawYear);
        const mPad = String(month).padStart(2, '0');
        houseMap.get(houseNo)!.push({
          billingYear: y,
          billingMonth: month,
          dueDate: `${y}-${mPad}-07`,
          principalAmount: amount,
        });
        continue;
      }
    }

    // กรณี 3 คอลัมน์: บ้านเลขที่, ปี, เงินต้นต่อเดือน -> เหมาค้างทั้ง 12 เดือนของปีนั้น
    if (parts.length === 3) {
      const rawYear = parseInt(parts[1], 10);
      const amount = parseFloat(parts[2]);
      if (!isNaN(rawYear) && !isNaN(amount) && amount > 0) {
        const y = normalizeMigrationYear(rawYear);
        for (let m = 1; m <= 12; m++) {
          const mPad = String(m).padStart(2, '0');
          houseMap.get(houseNo)!.push({
            billingYear: y,
            billingMonth: m,
            dueDate: `${y}-${mPad}-07`,
            principalAmount: amount,
          });
        }
        continue;
      }
    }

    // กรณี 5 คอลัมน์ขึ้นไป (มาตรฐาน): houseNo, year, month, dueDate, amount
    if (parts.length >= 5) {
      const rawYear = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10);
      let dueDate = parts[3];
      const amount = parseFloat(parts[4]);

      if (!isNaN(rawYear) && !isNaN(month) && !isNaN(amount) && amount > 0) {
        const y = normalizeMigrationYear(rawYear);
        const mPad = String(month).padStart(2, '0');
        if (!dueDate || !dueDate.includes('-')) {
          dueDate = `${y}-${mPad}-07`;
        }
        houseMap.get(houseNo)!.push({
          billingYear: y,
          billingMonth: month,
          dueDate,
          principalAmount: amount,
        });
      }
    }
  }

  const result: HouseMigrationInput[] = [];
  for (const [houseNo, periods] of houseMap.entries()) {
    result.push({
      houseNo,
      unpaidPeriods: periods,
    });
  }

  return result;
}
