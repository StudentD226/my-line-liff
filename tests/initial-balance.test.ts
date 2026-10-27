import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  truncate2,
  getStepPenaltyRate,
  getOverdueMonths,
  processInitialBalances,
  parseCsvOrTextMigration,
  HouseMigrationInput,
} from '../lib/initial-balance';

describe('Initial Balance & Debt Calculation Logic', () => {
  describe('truncate2 (2-Decimal Truncation Without Rounding Up)', () => {
    it('should keep 2 decimal places as is', () => {
      assert.equal(truncate2(123.45), 123.45);
    });

    it('should truncate the third decimal without rounding up', () => {
      assert.equal(truncate2(123.459), 123.45);
      assert.equal(truncate2(99.999), 99.99);
    });

    it('should handle zero and integer numbers', () => {
      assert.equal(truncate2(0), 0);
      assert.equal(truncate2(500), 500);
    });

    it('should handle floating point precision artifacts', () => {
      // In JS: 0.1 + 0.2 = 0.30000000000000004
      assert.equal(truncate2(0.1 + 0.2), 0.3);
    });
  });

  describe('getStepPenaltyRate', () => {
    it('should return 0% for 0 to 30 days overdue', () => {
      assert.equal(getStepPenaltyRate(0), 0);
      assert.equal(getStepPenaltyRate(1), 0);
      assert.equal(getStepPenaltyRate(15), 0);
      assert.equal(getStepPenaltyRate(30), 0);
    });

    it('should return 10% for 31 to 180 days overdue', () => {
      assert.equal(getStepPenaltyRate(31), 10);
      assert.equal(getStepPenaltyRate(90), 10);
      assert.equal(getStepPenaltyRate(180), 10);
    });

    it('should return 20% for > 180 days overdue', () => {
      assert.equal(getStepPenaltyRate(181), 20);
      assert.equal(getStepPenaltyRate(365), 20);
      assert.equal(getStepPenaltyRate(1000), 20);
    });
  });

  describe('getOverdueMonths', () => {
    it('should calculate floor(days / 30)', () => {
      assert.equal(getOverdueMonths(0), 0);
      assert.equal(getOverdueMonths(29), 0);
      assert.equal(getOverdueMonths(30), 1);
      assert.equal(getOverdueMonths(59), 1);
      assert.equal(getOverdueMonths(60), 2);
      assert.equal(getOverdueMonths(95), 3);
    });
  });

  describe('processInitialBalances', () => {
    it('should correctly process fully paid houses', () => {
      const items: HouseMigrationInput[] = [
        { houseNo: '99/1', unpaidPeriods: [] },
        { houseNo: '99/2' },
      ];
      const result = processInitialBalances(items, '2025-01-31');

      assert.equal(result.totalProperties, 2);
      assert.equal(result.fullyPaidProperties, 2);
      assert.equal(result.overdueProperties, 0);
      assert.equal(result.totalPrincipalDebt, 0);
      assert.equal(result.totalPenaltyDebt, 0);
      assert.equal(result.grandTotalDebt, 0);
      assert.equal(result.details[0].isFullyPaid, true);
    });

    it('should calculate debt with FLAT_PER_MONTH mode', () => {
      const items: HouseMigrationInput[] = [
        {
          houseNo: '10/5',
          unpaidPeriods: [
            {
              billingYear: 2024,
              billingMonth: 10,
              dueDate: '2024-10-07',
              principalAmount: 500,
            },
          ],
        },
      ];

      // Cutoff date: 2024-12-07 (approx 61 days overdue -> 2 months overdue)
      const result = processInitialBalances(items, '2024-12-07', 'FLAT_PER_MONTH', 100);

      assert.equal(result.overdueProperties, 1);
      const house = result.details[0];
      assert.equal(house.isFullyPaid, false);
      assert.equal(house.totalPrincipal, 500);
      // 61 days / 30 = 2 months overdue * 100 = 200 baht penalty
      assert.equal(house.totalPenalty, 200);
      assert.equal(house.grandTotal, 700);
    });

    it('should respect customFlatPenalty override', () => {
      const items: HouseMigrationInput[] = [
        {
          houseNo: '10/5',
          unpaidPeriods: [
            {
              billingYear: 2024,
              billingMonth: 10,
              dueDate: '2024-10-07',
              principalAmount: 500,
              customFlatPenalty: 50, // overridden by admin
            },
          ],
        },
      ];

      const result = processInitialBalances(items, '2024-12-07', 'FLAT_PER_MONTH', 100);
      assert.equal(result.details[0].totalPenalty, 50);
      assert.equal(result.details[0].grandTotal, 550);
    });

    it('should calculate debt with STEP_RATE_PERCENT mode', () => {
      const items: HouseMigrationInput[] = [
        {
          houseNo: '20/1',
          unpaidPeriods: [
            {
              billingYear: 2024,
              billingMonth: 6,
              dueDate: '2024-06-07', // > 180 days to 2025-01-01 -> 20%
              principalAmount: 1000,
            },
          ],
        },
      ];

      const result = processInitialBalances(items, '2025-01-01', 'STEP_RATE_PERCENT');
      const period = result.details[0].periods[0];
      assert.equal(period.penaltyRatePercent, 20);
      assert.equal(period.penaltyAmount, 200);
      assert.equal(period.totalAmount, 1200);
    });

    it('should respect customPenaltyRate override in STEP_RATE_PERCENT mode', () => {
      const items: HouseMigrationInput[] = [
        {
          houseNo: '20/1',
          unpaidPeriods: [
            {
              billingYear: 2024,
              billingMonth: 6,
              dueDate: '2024-06-07',
              principalAmount: 1000,
              customPenaltyRate: 5, // Custom 5% instead of auto 20%
            },
          ],
        },
      ];

      const result = processInitialBalances(items, '2025-01-01', 'STEP_RATE_PERCENT');
      assert.equal(result.details[0].totalPenalty, 50);
      assert.equal(result.details[0].grandTotal, 1050);
    });

    it('should set penalty to 0 for all periods when using NO_PENALTY mode', () => {
      const items: HouseMigrationInput[] = [
        {
          houseNo: '20/1',
          unpaidPeriods: [
            {
              billingYear: 2021,
              billingMonth: 9,
              dueDate: '2021-09-07', // Very old overdue
              principalAmount: 500,
            },
            {
              billingYear: 2026,
              billingMonth: 12,
              dueDate: '2026-12-07',
              principalAmount: 500,
            },
          ],
        },
      ];

      const result = processInitialBalances(items, '2026-12-31', 'NO_PENALTY');
      assert.equal(result.details[0].totalPenalty, 0);
      assert.equal(result.details[0].totalPrincipal, 1000);
      assert.equal(result.details[0].grandTotal, 1000);
      assert.equal(result.details[0].periods[0].penaltyAmount, 0);
      assert.equal(result.details[0].periods[1].penaltyAmount, 0);
    });
  });

  describe('parseCsvOrTextMigration', () => {
    it('should parse valid CSV format and group by house number', () => {
      const csv = `
        # Header or comments
        10/1, 2024, 1, 2024-01-07, 450
        10/1, 2024, 2, 2024-02-07, 450
        10/2, 2024, 1, 2024-01-07, 600
        10/3
      `;

      const parsed = parseCsvOrTextMigration(csv);
      assert.equal(parsed.length, 3);

      const house1 = parsed.find((h) => h.houseNo === '10/1');
      assert.ok(house1);
      assert.equal(house1.unpaidPeriods?.length, 2);
      assert.equal(house1.unpaidPeriods?.[0].principalAmount, 450);

      const house2 = parsed.find((h) => h.houseNo === '10/2');
      assert.ok(house2);
      assert.equal(house2.unpaidPeriods?.length, 1);

      const house3 = parsed.find((h) => h.houseNo === '10/3');
      assert.ok(house3);
      assert.equal(house3.unpaidPeriods?.length, 0);
    });

    it('should parse range syntax (e.g. 9/2564 to 12/2569) into multiple monthly periods', () => {
      const text = `
        # House with range from Sep 2564 (2021) to Dec 2569 (2026) = 64 months
        101/2, 9/2564, 12/2569, 500
      `;

      const parsed = parseCsvOrTextMigration(text);
      assert.equal(parsed.length, 1);
      const periods = parsed[0].unpaidPeriods || [];
      assert.equal(periods.length, 64);
      assert.equal(periods[0].billingYear, 2021);
      assert.equal(periods[0].billingMonth, 9);
      assert.equal(periods[0].principalAmount, 500);
      assert.equal(periods[63].billingYear, 2026);
      assert.equal(periods[63].billingMonth, 12);
    });

    it('should parse tab-separated values copied from Excel and Thai Buddhist years', () => {
      const text = "101/3\t2567\t10\t500";
      const parsed = parseCsvOrTextMigration(text);
      assert.equal(parsed.length, 1);
      const period = parsed[0].unpaidPeriods?.[0];
      assert.equal(period?.billingYear, 2024); // 2567 BE = 2024 AD
      assert.equal(period?.billingMonth, 10);
      assert.equal(period?.principalAmount, 500);
    });

    it('should parse 3-column format into all 12 months for that year', () => {
      const text = "101/4, 2568, 600";
      const parsed = parseCsvOrTextMigration(text);
      assert.equal(parsed.length, 1);
      const periods = parsed[0].unpaidPeriods || [];
      assert.equal(periods.length, 12);
      assert.equal(periods[0].billingYear, 2025);
      assert.equal(periods[0].principalAmount, 600);
    });

    it('should correctly process advance periods with full and partial payments', () => {
      const items: HouseMigrationInput[] = [
        {
          houseNo: '333/12',
          unpaidPeriods: [],
          advancePeriods: [
            {
              billingYear: 2026,
              billingMonth: 11,
              amount: 1000,
              baseAmount: 1000,
              paidAmount: 1000,
              remainingAmount: 0,
              status: 'PAID',
            },
            {
              billingYear: 2026,
              billingMonth: 12,
              amount: 500,
              baseAmount: 1000,
              paidAmount: 500,
              remainingAmount: 500,
              status: 'PARTIAL',
            },
          ],
        },
      ];

      const res = processInitialBalances(items, '2026-10-27');
      assert.equal(res.advanceProperties, 1);
      assert.equal(res.totalAdvanceMonths, 2);
      assert.equal(res.totalAdvanceAmount, 1500);
      assert.equal(res.details[0].advancePeriods?.length, 2);
      assert.equal(res.details[0].advancePeriods?.[0].status, 'PAID');
      assert.equal(res.details[0].advancePeriods?.[1].status, 'PARTIAL');
      assert.equal(res.details[0].advancePeriods?.[1].remainingAmount, 500);
    });
  });
});
