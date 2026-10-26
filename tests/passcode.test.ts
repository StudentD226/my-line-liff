import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper function equivalent to verify-passcode logic
export function verifyPasscodeLogic(inputPasscode: string, dbPasscode: string | null | undefined, houseNo: string) {
  if (!inputPasscode || !dbPasscode || !houseNo) {
    return false;
  }

  const cleanDbPasscode = dbPasscode.trim().toUpperCase();
  const cleanInputPasscode = String(inputPasscode).trim().toUpperCase();
  const cleanHouseNo = houseNo.trim().toUpperCase();

  const dbParts = cleanDbPasscode.split('-');
  const dbSuffix = dbParts.length > 1 ? dbParts.slice(1).join('-') : '';

  return (
    cleanDbPasscode === cleanInputPasscode ||
    (dbSuffix !== '' && dbSuffix === cleanInputPasscode) ||
    (`${cleanHouseNo}-${cleanInputPasscode}` === cleanDbPasscode)
  );
}

// Helper function equivalent to generatePasscode
export function generatePasscode(houseNo: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${houseNo.trim()}-${randomPart}`;
}

describe('Passcode Logic & Edge Cases', () => {
  it('should generate passcode in format {houseNo}-{4 alphanumeric chars}', () => {
    const passcode = generatePasscode('99/1');
    assert.match(passcode, /^99\/1-[A-Z0-9]{4}$/);
  });

  it('should trim whitespace from houseNo when generating passcode', () => {
    const passcode = generatePasscode('  26  ');
    assert.match(passcode, /^26-[A-Z0-9]{4}$/);
  });

  it('should match exact uppercase passcode', () => {
    const isMatch = verifyPasscodeLogic('99/1-ABCD', '99/1-ABCD', '99/1');
    assert.equal(isMatch, true);
  });

  it('should match lowercase input with uppercase in DB (case-insensitive)', () => {
    const isMatch = verifyPasscodeLogic('99/1-abcd', '99/1-ABCD', '99/1');
    assert.equal(isMatch, true);
  });

  it('should match suffix only (4 characters) in lowercase', () => {
    const isMatch = verifyPasscodeLogic('abcd', '99/1-ABCD', '99/1');
    assert.equal(isMatch, true);
  });

  it('should match suffix only in uppercase', () => {
    const isMatch = verifyPasscodeLogic('ABCD', '99/1-ABCD', '99/1');
    assert.equal(isMatch, true);
  });

  it('should handle house numbers with slashes and dashes (e.g. 10/2-1)', () => {
    const dbPass = '10/2-1-XY99';
    assert.equal(verifyPasscodeLogic('xy99', dbPass, '10/2-1'), true);
    assert.equal(verifyPasscodeLogic('10/2-1-XY99', dbPass, '10/2-1'), true);
  });

  it('should trim leading and trailing spaces from input', () => {
    const isMatch = verifyPasscodeLogic('  ABCD  ', '99/1-ABCD', '99/1');
    assert.equal(isMatch, true);
  });

  it('should reject wrong passcode', () => {
    const isMatch = verifyPasscodeLogic('WRONG', '99/1-ABCD', '99/1');
    assert.equal(isMatch, false);
  });

  it('should reject empty or null passcode', () => {
    assert.equal(verifyPasscodeLogic('', '99/1-ABCD', '99/1'), false);
    assert.equal(verifyPasscodeLogic('ABCD', null, '99/1'), false);
    assert.equal(verifyPasscodeLogic('ABCD', undefined, '99/1'), false);
  });

  it('should reject when house number does not match', () => {
    // If input is 26-ABCD but db is 99/1-ABCD
    const isMatch = verifyPasscodeLogic('26-ABCD', '99/1-ABCD', '26');
    assert.equal(isMatch, false);
  });
});
