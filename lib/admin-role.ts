'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

/**
 * สิทธิ์ผู้ใช้งานระดับผู้ดูแลระบบ (Admin Roles)
 * - SUPER_ADMIN: ผู้ดูแลระบบสูงสุด (เข้าถึงได้ทุกฟังก์ชัน จัดการทีมงาน และตั้งค่าระบบ)
 * - ADMIN: ผู้ช่วยผู้ดูแลระบบ (จัดการข้อมูลบ้าน บิล การเงิน ประกาศข่าว แต่ไม่สามารถจัดการทีมงานหรือลบ SuperAdmin ได้)
 * - NITI: เจ้าหน้าที่นิติบุคคล (จัดการงานประจำวัน ตรวจสลิป รับแจ้งซ่อม บันทึกรายรับ-รายจ่าย ดูบิล แต่ไม่สามารถลบข้อมูลสำคัญหรือตั้งค่าระบบได้)
 */
export type AdminRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'NITI';

export interface AdminPermissions {
  /** สิทธิ์จัดการทีมงาน เพิ่ม/ลบ/รีเซ็ตรหัสผ่านเจ้าหน้าที่ */
  canManageStaff: boolean;
  /** สิทธิ์ตั้งค่าระบบส่วนกลาง บัญชีธนาคาร และยอดยกมา */
  canManageSettings: boolean;
  /** สิทธิ์ลบข้อมูลบ้าน */
  canDeleteHouse: boolean;
  /** สิทธิ์ลบหรือยกเลิกบิล */
  canDeleteInvoice: boolean;
  /** สิทธิ์ส่งการแจ้งเตือนยอดหนี้ */
  canNotifyDebts: boolean;
  /** สิทธิ์ตรวจสอบและอนุมัติสลิปโอนเงิน */
  canReviewSlips: boolean;
  /** สิทธิ์จัดการศูนย์รับเรื่อง/แจ้งซ่อม */
  canManageMaintenance: boolean;
  /** สิทธิ์ลบใบแจ้งซ่อม */
  canDeleteMaintenance: boolean;
  /** สิทธิ์จัดการข่าวประกาศ */
  canManageNews: boolean;
  /** สิทธิ์จัดการระบบบัญชีและการเงิน */
  canManageFinancial: boolean;
  /** สิทธิ์ลบรายการทางบัญชี */
  canDeleteFinancialTx: boolean;
}

export function useAdminRole() {
  const { data: session, status } = useSession();
  const rawRole = (session?.user as any)?.role as string | undefined;

  const role: AdminRoleType = useMemo(() => {
    if (rawRole === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (rawRole === 'ADMIN') return 'ADMIN';
    return 'NITI';
  }, [rawRole]);

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isNiti = role === 'NITI';

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'ผู้ดูแลระบบสูงสุด';
      case 'ADMIN':
        return 'ผู้ดูแลระบบ';
      case 'NITI':
      default:
        return 'เจ้าหน้าที่นิติบุคคล';
    }
  }, [role]);

  const permissions: AdminPermissions = useMemo(() => {
    return {
      canManageStaff: isSuperAdmin,
      canManageSettings: isAdmin,
      canDeleteHouse: isAdmin,
      canDeleteInvoice: isAdmin,
      canNotifyDebts: true,
      canReviewSlips: true,
      canManageMaintenance: true,
      canDeleteMaintenance: isAdmin,
      canManageNews: true,
      canManageFinancial: true,
      canDeleteFinancialTx: isAdmin,
    };
  }, [isAdmin, isSuperAdmin]);

  return {
    role,
    roleLabel,
    isSuperAdmin,
    isAdmin,
    isNiti,
    permissions,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    session,
  };
}
