"use client";

import React, { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldAlert, AlertCircle, LogIn, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 เพิ่ม State สำหรับจัดการเปิด-ปิดรหัสผ่าน
  const [showPassword, setShowPassword] = useState(false);

  // State สำหรับเก็บข้อความแจ้งเตือนใต้ Textbox แต่ละช่อง
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  // ฟังก์ชันตรวจสอบอีเมลแบบ Real-time (ปรับปรุงประสิทธิภาพด้วย useCallback)
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));

    if (!value) {
      setFieldErrors(prev => ({ ...prev, email: "กรุณาระบุอีเมล" }));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldErrors(prev => ({ ...prev, email: "รูปแบบอีเมลไม่ถูกต้อง (ตัวอย่าง: admin@domain.com)" }));
    } else {
      setFieldErrors(prev => ({ ...prev, email: "" }));
    }
  }, []);

  // ฟังก์ชันตรวจสอบรหัสผ่านแบบ Real-time (ปรับปรุงประสิทธิภาพด้วย useCallback)
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, password: value }));

    if (!value) {
      setFieldErrors(prev => ({ ...prev, password: "กรุณาระบุรหัสผ่าน" }));
    } else if (value.length < 6) {
      setFieldErrors(prev => ({ ...prev, password: "รหัสผ่านต้องประกอบด้วยตัวอักษรอย่างน้อย 6 หลัก" }));
    } else {
      setFieldErrors(prev => ({ ...prev, password: "" }));
    }
  }, []);

  // ฟังก์ชันดำเนินการเข้าสู่ระบบ
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // ตรวจสอบความถูกต้องของข้อมูลก่อนส่งไปยังเซิร์ฟเวอร์
    if (fieldErrors.email || fieldErrors.password || !formData.email || !formData.password) {
      if (!formData.email) setFieldErrors(prev => ({ ...prev, email: "กรุณาระบุอีเมล" }));
      if (!formData.password) setFieldErrors(prev => ({ ...prev, password: "กรุณาระบุรหัสผ่าน" }));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (res?.error) {
        setError("ข้อมูลอีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setIsLoading(false);
      } else {
        // ใช้ replace เพื่อป้องกันการกดย้อนกลับมายังหน้า Login และส่งเข้าสู่ระบบ (RBAC จะถูกจัดการต่อใน Session)
        router.replace("/admin");
        router.refresh();
      }
    } catch (err) {
      setError("ระบบขัดข้อง ไม่สามารถเชื่อมต่อได้");
      setIsLoading(false);
    }
  }, [formData, fieldErrors, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#376B64] to-[#2A524C] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-[#376B64]/30">
          A
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          เข้าสู่ระบบผู้ดูแลระบบ
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          ระบบจัดการข้อมูลและระบบนิติบุคคลโครงการ
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-[2rem] sm:px-10 border border-slate-100">
          
          {/* ระบบแจ้งเตือนข้อผิดพลาดจากเซิร์ฟเวอร์ */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="text-red-500 mr-3 shrink-0" size={20} />
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* ส่วนกรอกข้อมูลอีเมล */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                อีเมลอ้างอิง
              </label>
              <div className="relative">
                <Mail className={`absolute left-4 top-3.5 size-5 transition-colors shrink-0 ${fieldErrors.email ? 'text-red-400' : 'text-slate-400'}`} />
                <input
                  type="email"
                  className={`appearance-none block w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 font-medium transition-colors
                    ${fieldErrors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-transparent bg-red-50/30 text-red-900' 
                      : 'border-slate-200 focus:ring-[#376B64] focus:border-[#376B64] bg-slate-50 focus:bg-white text-slate-900'}`}
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleEmailChange}
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.email && (
                <div className="mt-1.5 flex items-center text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={14} className="mr-1 shrink-0" />
                  {fieldErrors.email}
                </div>
              )}
            </div>

            {/* ส่วนกรอกข้อมูลรหัสผ่าน */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-3.5 size-5 transition-colors shrink-0 ${fieldErrors.password ? 'text-red-400' : 'text-slate-400'}`} />
                <input
                  // 🌟 สลับชนิดของ input ตาม state showPassword
                  type={showPassword ? "text" : "password"}
                  className={`appearance-none block w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 font-medium transition-colors
                    ${fieldErrors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-transparent bg-red-50/30 text-red-900' 
                      : 'border-slate-200 focus:ring-[#376B64] focus:border-[#376B64] bg-slate-50 focus:bg-white text-slate-900'}`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                />
                
                {/* 🌟 ปุ่มสลับแสดง/ซ่อนรหัสผ่าน */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors rounded-lg"
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? (
                    <EyeOff size={20} className="shrink-0" />
                  ) : (
                    <Eye size={20} className="shrink-0" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="mt-1.5 flex items-center text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={14} className="mr-1 shrink-0" />
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !!fieldErrors.email || !!fieldErrors.password || !formData.email || !formData.password}
                className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white transition-all 
                  ${isLoading || !!fieldErrors.email || !!fieldErrors.password || !formData.email || !formData.password
                  ? "bg-slate-300 cursor-not-allowed shadow-none" 
                  : "bg-[#376B64] hover:bg-[#2A524C] active:scale-[0.98] shadow-[#376B64]/30 hover:shadow-lg"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2 shrink-0" />
                    กำลังตรวจสอบข้อมูล...
                  </>
                ) : (
                  <>
                    <LogIn size={18} className="mr-2 shrink-0" />
                    ยืนยันการเข้าสู่ระบบ
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}