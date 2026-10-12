// lib/initial-balance.ts

export interface DebtPeriodInput {
  billingYear: number;
  billingMonth: number;
  dueDate: string; // "YYYY-MM-DD"
  principalAmount: number;
  customPenaltyRate?: number; // ถ้ากำหนดเอง เช่น 0, 10, 20
}

export interface HouseMigrationInput {
  houseNo: string;
  unpaidPeriods?: DebtPeriodInput[];
}

export interface CalculatedPeriod {
  billingYear: number;
  billingMonth: number;
  dueDate: string;
  daysOverdue: number;
  principalAmount: number;
  penaltyRatePercent: number; // 0, 10, 20
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
}

export interface MigrationCalculationResult {
  cutoffDate: string;
  totalProperties: number;
  fullyPaidProperties: number;
  overdueProperties: number;
  totalPrincipalDebt: number;
  totalPenaltyDebt: number;
  grandTotalDebt: number;
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
 * ฟังก์ชันหลักในการคำนวณยอดยกมาตั้งต้น
 */
export function processInitialBalances(
  items: HouseMigrationInput[],
  cutoffDateStr: string
): MigrationCalculationResult {
  const cutoff = new Date(cutoffDateStr);
  cutoff.setHours(23, 59, 59, 999);

  let grandPrincipal = 0;
  let grandPenalty = 0;
  let fullyPaidHouses = 0;
  let overdueHouses = 0;

  const details: CalculatedHouse[] = items.map((item) => {
    const rawPeriods = item.unpaidPeriods || [];

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

      const rate = p.customPenaltyRate !== undefined ? Number(p.customPenaltyRate) : getStepPenaltyRate(daysOverdue);
      const principal = truncate2(Number(p.principalAmount) || 0);
      const penalty = truncate2(principal * (rate / 100));
      const total = truncate2(principal + penalty);

      housePrincipal += principal;
      housePenalty += penalty;

      return {
        billingYear: Number(p.billingYear),
        billingMonth: Number(p.billingMonth),
        dueDate: p.dueDate,
        daysOverdue,
        principalAmount: principal,
        penaltyRatePercent: rate,
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
    };
  });

  return {
    cutoffDate: cutoffDateStr,
    totalProperties: items.length,
    fullyPaidProperties: fullyPaidHouses,
    overdueProperties: overdueHouses,
    totalPrincipalDebt: truncate2(grandPrincipal),
    totalPenaltyDebt: truncate2(grandPenalty),
    grandTotalDebt: truncate2(grandPrincipal + grandPenalty),
    details,
  };
}

/**
 * ตัวแปลงข้อความ CSV หรือ Text ให้กลายเป็นโครงสร้าง HouseMigrationInput[]
 * รองรับบรรทัดรูปแบบ:
 * บ้านเลขที่, ปี(ค.ศ.), เดือน, วันครบกำหนด(YYYY-MM-DD), เงินต้น
 * หรือสำหรับบ้านที่จ่ายครบแล้ว:
 * บ้านเลขที่
 */
export function parseCsvOrTextMigration(rawText: string): HouseMigrationInput[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const houseMap = new Map<string, DebtPeriodInput[]>();

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    const houseNo = parts[0];
    if (!houseNo) continue;

    if (!houseMap.has(houseNo)) {
      houseMap.set(houseNo, []);
    }

    // ถ้ามีข้อมูลครบ 5 คอลัมน์ (houseNo, year, month, dueDate, amount)
    if (parts.length >= 5) {
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10);
      const dueDate = parts[3];
      const amount = parseFloat(parts[4]);

      if (!isNaN(year) && !isNaN(month) && !isNaN(amount) && amount > 0) {
        houseMap.get(houseNo)!.push({
          billingYear: year,
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
