'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  User,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// สูตรการแสดงผลชื่อสิทธิ์การเข้าถึง (แยกออกมาเพื่อไม่ต้องสร้างใหม่ทุกครั้งที่ Render)
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
  ADMIN: 'แอดมิน',
};
const DEFAULT_ROLE_LABEL = 'นิติบุคคล';

// โหลด SweetAlert2 แบบ Lazy ผ่าน dynamic import() มาตรฐานของ JS
// (ไม่ใช้ next/dynamic เพราะออกแบบมาสำหรับ React Component เท่านั้น ไม่ใช่ library ทั่วไป)
async function fireAlert(options: any) {
  const Swal = (await import('sweetalert2')).default;
  return Swal.fire(options);
}

export default function AdminProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // สิทธิ์ผู้ใช้งานปัจจุบัน (เตรียมพร้อมสำหรับการขยายระบบสิทธิ์ในอนาคต โดยไม่กระทบการทำงานปัจจุบัน)
  const userRole = (session?.user as any)?.role as string | undefined;
  const roleLabel = useMemo(
    () => (userRole ? ROLE_LABELS[userRole] ?? DEFAULT_ROLE_LABEL : DEFAULT_ROLE_LABEL),
    [userRole]
  );

  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session?.user?.name || '',
        email: session?.user?.email || '',
      }));
    }
  }, [session]);

  // เช็คความตรงกันของรหัสผ่านแบบ Real-time
  const isPasswordMismatch =
    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;
  const isPasswordMatch =
    formData.password.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, name: value }));
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, password: value }));
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, confirmPassword: value }));
  }, []);

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.password && formData.password !== formData.confirmPassword) {
        fireAlert({
          icon: 'error',
          title: 'รหัสผ่านไม่ตรงกัน',
          text: 'กรุณายืนยันรหัสผ่านใหม่ให้ถูกต้องอีกครั้ง',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            password: formData.password || undefined, // ส่งเฉพาะตอนมีการพิมพ์รหัสใหม่
          }),
        });

        const data = await res.json();
        if (data.success) {
          // อัปเดตข้อมูลใน Session ของ Next-Auth เพื่อให้ชื่อที่มุมขวาบนเปลี่ยนตาม
          await update({ name: formData.name });

          fireAlert({
            icon: 'success',
            title: 'บันทึกข้อมูลสำเร็จ',
            text: 'ระบบได้บันทึกการเปลี่ยนแปลงข้อมูลบัญชีของท่านเรียบร้อยแล้ว',
            confirmButtonColor: '#376B64',
            customClass: { popup: 'rounded-[2rem]' },
          });
          setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' })); // ล้างช่องรหัสผ่าน
        } else {
          throw new Error(data.error);
        }
      } catch (error: any) {
        fireAlert({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.message || 'ไม่สามารถดำเนินการอัปเดตข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
          confirmButtonColor: '#e11d48',
          customClass: { popup: 'rounded-[2rem]' },
        });
      } finally {
        setIsLoading(false);
      }
    },
    [formData, update]
  );

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-4xl mx-auto font-sans">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-2">
          <ShieldCheck className="text-[#376B64]" size={32} /> ตั้งค่าบัญชีผู้ดูแลระบบ
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          จัดการข้อมูลส่วนตัวและรหัสผ่านสำหรับเข้าใช้งานระบบ
        </p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-[#376B64]/10 text-[#376B64] rounded-2xl flex items-center justify-center font-black text-2xl">
            {formData.name.charAt(0) || 'A'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {formData.name || 'กำลังโหลดข้อมูล...'}
            </h2>
            <p className="text-sm font-bold text-[#376B64] mt-1 flex items-center gap-1.5">
              <ShieldCheck size={14} />
              สิทธิ์การเข้าถึง: {roleLabel}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 max-w-xl">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              อีเมล (ไม่สามารถเปลี่ยนแปลงได้)
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full pl-12 pr-4 py-3 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              ชื่อแสดงผล <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                className="w-full pl-12 pr-4 py-3 bg-white text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Lock size={18} className="text-slate-400" /> เปลี่ยนรหัสผ่าน
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              เว้นว่างไว้ทั้งสองช่องหากไม่ต้องการเปลี่ยนแปลงรหัสผ่าน
            </p>

            <div className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="รหัสผ่านใหม่"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 pr-12 py-3 bg-white text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-[#376B64] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="ยืนยันรหัสผ่านใหม่"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`w-full px-4 pr-12 py-3 bg-white text-slate-800 border rounded-xl focus:ring-2 outline-none transition-all font-medium ${
                      isPasswordMismatch
                        ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400'
                        : isPasswordMatch
                        ? 'border-[#376B64]/40 focus:ring-[#376B64]/10 focus:border-[#376B64]'
                        : 'border-slate-200 focus:ring-[#376B64]/10 focus:border-[#376B64]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-[#376B64] transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {isPasswordMismatch && (
                  <p className="mt-2 text-sm font-bold text-rose-500 flex items-center gap-1.5">
                    <AlertCircle size={16} /> รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบความถูกต้องอีกครั้ง
                  </p>
                )}
                {isPasswordMatch && (
                  <p className="mt-2 text-sm font-bold text-[#376B64] flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> รหัสผ่านตรงกัน
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-start">
            <button
              type="submit"
              disabled={isLoading || isPasswordMismatch}
              className="px-8 py-3.5 bg-[#376B64] hover:bg-[#2A524C] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> กำลังบันทึกข้อมูล...
                </>
              ) : (
                <>
                  <Save className="mr-2" size={20} /> บันทึกการเปลี่ยนแปลง
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}