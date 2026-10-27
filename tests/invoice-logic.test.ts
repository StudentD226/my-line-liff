import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure helper function for invoice number generation
export function formatInvoiceNo(houseNo: string, month: number | string, year: number | string): string {
  const targetYear = parseInt(String(year), 10);
  const targetMonth = parseInt(String(month), 10);
  const targetYearThai = targetYear + 543;
  const monthSuffix = String(targetMonth).padStart(2, '0');
  const cleanHouseNo = String(houseNo).trim();
  return `INV-${cleanHouseNo}-${monthSuffix}${targetYearThai}`;
}

// Pure helper function for duplicate invoice decision
export function checkInvoiceGenerationAction(
  existingInvoices: Array<{ id: string; status: string; invoiceNo: string }>
): 'CREATE' | 'UPDATE' | 'SKIP' {
  // Ignore TR- test invoices when checking duplicates
  const realInvoice = existingInvoices.find((inv) => !inv.invoiceNo.startsWith('TR-'));

  if (!realInvoice) {
    return 'CREATE';
  }

  if (realInvoice.status === 'PENDING') {
    return 'UPDATE';
  }

  return 'SKIP';
}

// Pure helper function for calculating due date with month clamping
export function calculateInvoiceDueDate(year: number, month: number, dueDateDay: number = 7): Date {
  // Clamping day to the last day of the month to prevent accidental month overflow
  const daysInMonth = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(Math.max(1, dueDateDay), daysInMonth);

  const dueDate = new Date(year, month - 1, clampedDay);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate;
}

// Pure helper function for live overdue penalty calculation logic
export function calculateLiveInvoicePenalty(
  invoice: { dueDate: Date | string; status: string; penaltyAmount?: number; invoiceNo?: string },
  today: Date,
  penaltyRatePerMonth: number | undefined | null
): number {
  const isInitialBalance = invoice.invoiceNo && invoice.invoiceNo.startsWith('INIT-');
  if (isInitialBalance) {
    return Number(invoice.penaltyAmount || 0);
  }

  const resolvedRate = penaltyRatePerMonth !== undefined && penaltyRatePerMonth !== null ? Number(penaltyRatePerMonth) : 100;
  if (resolvedRate <= 0) return 0;

  const dueDate = new Date(invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const todayCopy = new Date(today);
  todayCopy.setHours(0, 0, 0, 0);

  if (todayCopy > dueDate && ['PENDING', 'OVERDUE', 'PARTIAL', 'REJECTED'].includes(invoice.status)) {
    const diffTime = todayCopy.getTime() - dueDate.getTime();
    const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const overdueMonths = Math.floor(overdueDays / 30);
    return overdueMonths * resolvedRate;
  }
  return Number(invoice.penaltyAmount || 0);
}

describe('Invoice Generation, Formatting & Duplicate Logic', () => {
  describe('formatInvoiceNo', () => {
    it('should format invoice number with Thai Buddhist year and padded month', () => {
      // 2025 AD = 2568 BE
      const invNo = formatInvoiceNo('99/1', 1, 2025);
      assert.equal(invNo, 'INV-99/1-012568');
    });

    it('should format 2-digit months correctly without double zero padding', () => {
      const invNo = formatInvoiceNo('12', 11, 2024);
      // 2024 AD = 2567 BE
      assert.equal(invNo, 'INV-12-112567');
    });

    it('should handle string inputs for month and year gracefully', () => {
      const invNo = formatInvoiceNo('26', '05', '2026');
      assert.equal(invNo, 'INV-26-052569');
    });

    it('should trim whitespace from house number', () => {
      const invNo = formatInvoiceNo('  10/2-1  ', 7, 2025);
      assert.equal(invNo, 'INV-10/2-1-072568');
    });

    it('should prevent year collisions across consecutive years', () => {
      const inv2025 = formatInvoiceNo('99/1', 1, 2025);
      const inv2026 = formatInvoiceNo('99/1', 1, 2026);
      assert.notEqual(inv2025, inv2026);
      assert.equal(inv2025, 'INV-99/1-012568');
      assert.equal(inv2026, 'INV-99/1-012569');
    });
  });

  describe('Duplicate Invoice Resolution (checkInvoiceGenerationAction)', () => {
    it('should return CREATE when no existing invoices exist', () => {
      const action = checkInvoiceGenerationAction([]);
      assert.equal(action, 'CREATE');
    });

    it('should return CREATE when only test invoices starting with TR- exist', () => {
      const existing = [
        { id: 'inv-test-1', status: 'PAID', invoiceNo: 'TR-99/1-012568' },
        { id: 'inv-test-2', status: 'PENDING', invoiceNo: 'TR-DEMO' },
      ];
      const action = checkInvoiceGenerationAction(existing);
      assert.equal(action, 'CREATE');
    });

    it('should return UPDATE when an existing real invoice is still PENDING', () => {
      const existing = [
        { id: 'inv-1', status: 'PENDING', invoiceNo: 'INV-99/1-012568' },
      ];
      const action = checkInvoiceGenerationAction(existing);
      assert.equal(action, 'UPDATE');
    });

    it('should return SKIP when an existing invoice has been PAID', () => {
      const existing = [
        { id: 'inv-1', status: 'PAID', invoiceNo: 'INV-99/1-012568' },
      ];
      const action = checkInvoiceGenerationAction(existing);
      assert.equal(action, 'SKIP');
    });

    it('should return SKIP when an existing invoice is in CHECKING or OVERDUE status', () => {
      assert.equal(
        checkInvoiceGenerationAction([{ id: '1', status: 'CHECKING', invoiceNo: 'INV-1-012568' }]),
        'SKIP'
      );
      assert.equal(
        checkInvoiceGenerationAction([{ id: '2', status: 'OVERDUE', invoiceNo: 'INV-1-012568' }]),
        'SKIP'
      );
    });
  });

  describe('calculateInvoiceDueDate', () => {
    it('should set due date to day 7 of target month by default at 23:59:59.999', () => {
      const dueDate = calculateInvoiceDueDate(2025, 3, 7);
      assert.equal(dueDate.getFullYear(), 2025);
      assert.equal(dueDate.getMonth(), 2); // 0-indexed March is 2
      assert.equal(dueDate.getDate(), 7);
      assert.equal(dueDate.getHours(), 23);
      assert.equal(dueDate.getMinutes(), 59);
      assert.equal(dueDate.getSeconds(), 59);
    });

    it('should safely clamp February days (e.g. day 31 clamped to 28 in non-leap year)', () => {
      const feb2025 = calculateInvoiceDueDate(2025, 2, 31);
      assert.equal(feb2025.getMonth(), 1); // 0-indexed Feb is 1
      assert.equal(feb2025.getDate(), 28);
    });

    it('should safely clamp February days to 29 in leap year (2024)', () => {
      const feb2024 = calculateInvoiceDueDate(2024, 2, 31);
      assert.equal(feb2024.getMonth(), 1);
      assert.equal(feb2024.getDate(), 29);
    });
  });

  describe('Live Overdue Penalty Calculation & Setting Respect', () => {
    const today = new Date('2026-05-15');

    it('should return 0 penalty when penaltyRatePerMonth is 0 (disabled in system settings)', () => {
      const invoice = {
        invoiceNo: 'INV-99/1-012569',
        dueDate: '2026-01-07', // ~4 months overdue
        status: 'OVERDUE',
        penaltyAmount: 400,
      };
      // When penalty is set to 0 in settings, penalty must be 0
      const penalty = calculateLiveInvoicePenalty(invoice, today, 0);
      assert.equal(penalty, 0);
    });

    it('should NOT recalculate live penalty for INIT- (initial balance) invoices', () => {
      const initInvoiceWithNoPenalty = {
        invoiceNo: 'INIT-99_1-2021-09',
        dueDate: '2021-09-07', // Very old overdue
        status: 'OVERDUE',
        penaltyAmount: 0, // Imported with NO_PENALTY
      };
      // Even if system rate is 100, INIT- with 0 penalty must stay 0
      const penalty = calculateLiveInvoicePenalty(initInvoiceWithNoPenalty, today, 100);
      assert.equal(penalty, 0);

      const initInvoiceWithFixedPenalty = {
        invoiceNo: 'INIT-99_1-2023-01',
        dueDate: '2023-01-07',
        status: 'OVERDUE',
        penaltyAmount: 150,
      };
      const penalty2 = calculateLiveInvoicePenalty(initInvoiceWithFixedPenalty, today, 100);
      assert.equal(penalty2, 150);

      // Even when system penalty rate is 0, INIT- with fixed penalty must retain its stored penalty
      const penalty3 = calculateLiveInvoicePenalty(initInvoiceWithFixedPenalty, today, 0);
      assert.equal(penalty3, 150);
    });

    it('should calculate penalty correctly for regular overdue invoices when penalty is enabled', () => {
      const invoice = {
        invoiceNo: 'INV-99/1-022569',
        dueDate: '2026-02-07', // ~3 months overdue from May 15
        status: 'OVERDUE',
        penaltyAmount: 0,
      };
      const penalty = calculateLiveInvoicePenalty(invoice, today, 100);
      assert.equal(penalty, 300); // 3 months * 100
    });

    it('should fallback to 100 when penalty rate is null or undefined', () => {
      const invoice = {
        invoiceNo: 'INV-99/1-022569',
        dueDate: '2026-02-07',
        status: 'OVERDUE',
        penaltyAmount: 0,
      };
      const penalty = calculateLiveInvoicePenalty(invoice, today, null);
      assert.equal(penalty, 300);
    });
  });
});
