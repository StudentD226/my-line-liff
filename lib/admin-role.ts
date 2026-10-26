'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

/**
 * สิทธิ์ผู้ใช้งานระดับผู้ดูแลระบบ (Admin Roles)
 * - ADMIN: ผู้ดูแลระบบ (เข้าถึงและจัดการได้ทุกฟังก์ชัน ทั้งทีมงาน ข้อมูลบ้าน บิล การเงิน ประกาศข่าว และตั้งค่าระบบ)
 * - NITI: เจ้าหน้าที่นิติบุคคล (จัดการงานประจำวัน ตรวจสลิป รับแจ้งซ่อม บันทึกรายรับ-รายจ่าย ดูบิล)
 */
export type AdminRoleType = 'ADMIN' | 'NITI';

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
    if (rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN') return 'ADMIN';
    return 'NITI';
  }, [rawRole]);

  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = isAdmin; // Alias เพื่อ backward compatibility ให้แอดมินทำได้ทุกอย่าง
  const isNiti = role === 'NITI';

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'ADMIN':
        return 'ผู้ดูแลระบบ (Admin)';
      case 'NITI':
      default:
        return 'เจ้าหน้าที่นิติบุคคล (Niti)';
    }
  }, [role]);

  const permissions: AdminPermissions = useMemo(() => {
    return {
      canManageStaff: isAdmin,
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
  }, [isAdmin]);

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
