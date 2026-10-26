import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure helper function implementing natural house sorting used across admin pages
export function naturalHouseSort(a: string | null | undefined, b: string | null | undefined): number {
  const strA = (a || '').trim();
  const strB = (b || '').trim();
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

// Pure helper function for fee calculation
export function calculateHouseFee(
  feeType: 'FIXED' | 'CALCULATED' | string | undefined,
  feeRate: number,
  houseSize: number
): number {
  const rate = Number(feeRate) || 0;
  const size = Number(houseSize) || 0;
  const type = String(feeType || 'CALCULATED').toUpperCase();

  if (type === 'FIXED') {
    return rate;
  }
  return size * rate;
}

// Pure helper function for batch house generation and duplicate filtering
export function filterNewHouseNumbers(
  prefix: string,
  startNum: number,
  endNum: number,
  existingHouseNumbers: string[]
): string[] {
  if (startNum > endNum) return [];

  const candidateNumbers: string[] = [];
  for (let i = startNum; i <= endNum; i++) {
    candidateNumbers.push(`${prefix.trim()}${i}`);
  }

  const existingSet = new Set(existingHouseNumbers.map((h) => h.trim().toUpperCase()));
  return candidateNumbers.filter((num) => !existingSet.has(num.toUpperCase()));
}

describe('House Management Logic & Edge Cases', () => {
  describe('Natural Alphanumeric Sorting', () => {
    it('should sort integer house numbers naturally (2 before 10)', () => {
      const input = ['10', '2', '1', '20', '9'];
      const sorted = [...input].sort(naturalHouseSort);
      assert.deepEqual(sorted, ['1', '2', '9', '10', '20']);
    });

    it('should sort compound house numbers with slashes (e.g. 99/2 before 99/10)', () => {
      const input = ['99/10', '99/1', '100/1', '99/2', '99/20'];
      const sorted = [...input].sort(naturalHouseSort);
      assert.deepEqual(sorted, ['99/1', '99/2', '99/10', '99/20', '100/1']);
    });

    it('should handle alphanumeric prefixes (e.g. A1, A2, A10, B1)', () => {
      const input = ['B1', 'A10', 'A2', 'A1'];
      const sorted = [...input].sort(naturalHouseSort);
      assert.deepEqual(sorted, ['A1', 'A2', 'A10', 'B1']);
    });

    it('should handle empty, null, or whitespace values safely without crashing', () => {
      const input = ['10', '', null as any, '  ', '2'];
      const sorted = [...input].sort(naturalHouseSort);
      // Empty and whitespace should be ordered before numbers without error
      assert.equal(sorted[sorted.length - 1], '10');
      assert.equal(sorted[sorted.length - 2], '2');
    });
  });

  describe('House Fee Calculation', () => {
    it('should calculate fee based on size * rate for CALCULATED type', () => {
      const fee = calculateHouseFee('CALCULATED', 12, 50);
      assert.equal(fee, 600);
    });

    it('should calculate fee based on float rate and float size', () => {
      const fee = calculateHouseFee('CALCULATED', 10.5, 60);
      assert.equal(fee, 630);
    });

    it('should return fixed fee rate regardless of house size for FIXED type', () => {
      const fee = calculateHouseFee('FIXED', 500, 120);
      assert.equal(fee, 500);
    });

    it('should default to CALCULATED when feeType is undefined or null', () => {
      const fee = calculateHouseFee(undefined, 10, 45);
      assert.equal(fee, 450);
    });

    it('should handle zero size or zero rate without throwing', () => {
      assert.equal(calculateHouseFee('CALCULATED', 0, 50), 0);
      assert.equal(calculateHouseFee('CALCULATED', 10, 0), 0);
      assert.equal(calculateHouseFee('FIXED', 0, 50), 0);
    });
  });

  describe('Batch Generation & Duplicate House Prevention', () => {
    it('should generate continuous numbers when no duplicates exist', () => {
      const newHouses = filterNewHouseNumbers('99/', 1, 5, []);
      assert.deepEqual(newHouses, ['99/1', '99/2', '99/3', '99/4', '99/5']);
    });

    it('should filter out existing houses to prevent duplicate key errors', () => {
      const existing = ['99/2', '99/4'];
      const newHouses = filterNewHouseNumbers('99/', 1, 5, existing);
      assert.deepEqual(newHouses, ['99/1', '99/3', '99/5']);
    });

    it('should prevent case-insensitive duplicates (e.g. A1 vs a1)', () => {
      const existing = ['A1'];
      const newHouses = filterNewHouseNumbers('a', 1, 3, existing);
      assert.deepEqual(newHouses, ['a2', 'a3']);
    });

    it('should return empty array if startNum > endNum', () => {
      const newHouses = filterNewHouseNumbers('99/', 10, 5, []);
      assert.deepEqual(newHouses, []);
    });
  });
});
