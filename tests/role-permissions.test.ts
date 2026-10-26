import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdminRole, getAdminPermissions } from '../lib/admin-role';

describe('Admin Roles & Permission Matrix', () => {
  describe('resolveAdminRole', () => {
    it('should resolve ADMIN as ADMIN', () => {
      assert.equal(resolveAdminRole('ADMIN'), 'ADMIN');
    });

    it('should map deprecated SUPER_ADMIN to ADMIN', () => {
      assert.equal(resolveAdminRole('SUPER_ADMIN'), 'ADMIN');
    });

    it('should resolve NITI as NITI', () => {
      assert.equal(resolveAdminRole('NITI'), 'NITI');
    });

    it('should default undefined, null, or empty string to NITI for least privilege', () => {
      assert.equal(resolveAdminRole(undefined), 'NITI');
      assert.equal(resolveAdminRole(null), 'NITI');
      assert.equal(resolveAdminRole(''), 'NITI');
    });

    it('should default arbitrary or unknown roles to NITI', () => {
      assert.equal(resolveAdminRole('RESIDENT'), 'NITI');
      assert.equal(resolveAdminRole('USER'), 'NITI');
      assert.equal(resolveAdminRole('admin'), 'NITI'); // Case sensitive
    });
  });

  describe('getAdminPermissions', () => {
    it('ADMIN should have all permissions including destructive actions', () => {
      const perms = getAdminPermissions('ADMIN');

      // Admin exclusive capabilities
      assert.equal(perms.canManageStaff, true, 'ADMIN can manage staff');
      assert.equal(perms.canManageSettings, true, 'ADMIN can manage settings');
      assert.equal(perms.canDeleteHouse, true, 'ADMIN can delete house');
      assert.equal(perms.canDeleteInvoice, true, 'ADMIN can delete invoice');
      assert.equal(perms.canDeleteMaintenance, true, 'ADMIN can delete maintenance ticket');
      assert.equal(perms.canDeleteFinancialTx, true, 'ADMIN can delete financial transaction');

      // Daily operations
      assert.equal(perms.canNotifyDebts, true, 'ADMIN can notify debts');
      assert.equal(perms.canReviewSlips, true, 'ADMIN can review slips');
      assert.equal(perms.canManageMaintenance, true, 'ADMIN can manage maintenance');
      assert.equal(perms.canManageNews, true, 'ADMIN can manage news');
      assert.equal(perms.canManageFinancial, true, 'ADMIN can manage financial');
    });

    it('NITI should have operational permissions but restricted from destructive/system actions', () => {
      const perms = getAdminPermissions('NITI');

      // Restricted actions
      assert.equal(perms.canManageStaff, false, 'NITI cannot manage staff');
      assert.equal(perms.canManageSettings, false, 'NITI cannot manage system settings');
      assert.equal(perms.canDeleteHouse, false, 'NITI cannot delete house');
      assert.equal(perms.canDeleteInvoice, false, 'NITI cannot delete invoice');
      assert.equal(perms.canDeleteMaintenance, false, 'NITI cannot delete maintenance ticket');
      assert.equal(perms.canDeleteFinancialTx, false, 'NITI cannot delete financial transaction');

      // Allowed daily operations
      assert.equal(perms.canNotifyDebts, true, 'NITI can notify debts');
      assert.equal(perms.canReviewSlips, true, 'NITI can review slips');
      assert.equal(perms.canManageMaintenance, true, 'NITI can manage maintenance');
      assert.equal(perms.canManageNews, true, 'NITI can manage news');
      assert.equal(perms.canManageFinancial, true, 'NITI can manage financial records');
    });
  });
});
