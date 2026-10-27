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

// Pure helper functions for table selection state logic
export function toggleSelectAll(currentSelected: string[], allIds: string[], checked: boolean): string[] {
  if (checked) {
    return [...allIds];
  }
  return [];
}

export function toggleSelectOne(currentSelected: string[], id: string): string[] {
  if (currentSelected.includes(id)) {
    return currentSelected.filter((item) => item !== id);
  }
  return [...currentSelected, id];
}

export function isSelectAllChecked(selectedCount: number, totalCount: number): boolean {
  return totalCount > 0 && selectedCount === totalCount;
}

export function isSelectAllIndeterminate(selectedCount: number, totalCount: number): boolean {
  return selectedCount > 0 && selectedCount < totalCount;
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

  describe('House Selection & Select All Logic', () => {
    const allHouseIds = ['house-1', 'house-2', 'house-3'];

    it('should select all house ids when select-all is checked', () => {
      const selected = toggleSelectAll([], allHouseIds, true);
      assert.deepEqual(selected, ['house-1', 'house-2', 'house-3']);
      assert.equal(isSelectAllChecked(selected.length, allHouseIds.length), true);
      assert.equal(isSelectAllIndeterminate(selected.length, allHouseIds.length), false);
    });

    it('should deselect all when select-all is unchecked', () => {
      const selected = toggleSelectAll(['house-1', 'house-2', 'house-3'], allHouseIds, false);
      assert.deepEqual(selected, []);
      assert.equal(isSelectAllChecked(selected.length, allHouseIds.length), false);
      assert.equal(isSelectAllIndeterminate(selected.length, allHouseIds.length), false);
    });

    it('should toggle single item correctly and show indeterminate when partial', () => {
      let selected: string[] = [];
      selected = toggleSelectOne(selected, 'house-1');
      assert.deepEqual(selected, ['house-1']);
      assert.equal(isSelectAllChecked(selected.length, allHouseIds.length), false);
      assert.equal(isSelectAllIndeterminate(selected.length, allHouseIds.length), true);

      selected = toggleSelectOne(selected, 'house-2');
      assert.deepEqual(selected, ['house-1', 'house-2']);
      assert.equal(isSelectAllChecked(selected.length, allHouseIds.length), false);
      assert.equal(isSelectAllIndeterminate(selected.length, allHouseIds.length), true);

      selected = toggleSelectOne(selected, 'house-3');
      assert.deepEqual(selected, ['house-1', 'house-2', 'house-3']);
      assert.equal(isSelectAllChecked(selected.length, allHouseIds.length), true);
      assert.equal(isSelectAllIndeterminate(selected.length, allHouseIds.length), false);

      selected = toggleSelectOne(selected, 'house-2');
      assert.deepEqual(selected, ['house-1', 'house-3']);
      assert.equal(isSelectAllChecked(selected.length, allHouseIds.length), false);
      assert.equal(isSelectAllIndeterminate(selected.length, allHouseIds.length), true);
    });

    it('should handle empty houses list gracefully', () => {
      assert.equal(isSelectAllChecked(0, 0), false);
      assert.equal(isSelectAllIndeterminate(0, 0), false);
    });
  });
});
