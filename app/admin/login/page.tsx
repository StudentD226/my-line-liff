"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldAlert, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // State สำหรับเก็บข้อความแจ้งเตือนใต้ Textbox แต่ละช่อง
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  // ฟังก์ชันตรวจสอบอีเมลแบบ Real-time
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });

    if (!value) {
      setFieldErrors(prev => ({ ...prev, email: "กรุณากรอกอีเมล" }));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldErrors(prev => ({ ...prev, email: "รูปแบบอีเมลไม่ถูกต้อง (เช่น admin@domain.com)" }));
    } else {
      setFieldErrors(prev => ({ ...prev, email: "" }));
    }
  };

  // ฟังก์ชันตรวจสอบรหัสผ่านแบบ Real-time
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, password: value });

    if (!value) {
      setFieldErrors(prev => ({ ...prev, password: "กรุณากรอกรหัสผ่าน" }));
    } else if (value.length < 6) {
      setFieldErrors(prev => ({ ...prev, password: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }));
    } else {
      setFieldErrors(prev => ({ ...prev, password: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ดักไว้ก่อน: ถ้ายังมี Error ค้างอยู่ หรือยังไม่กรอกข้อมูล ห้ามกด Submit
    if (fieldErrors.email || fieldErrors.password || !formData.email || !formData.password) {
      if (!formData.email) setFieldErrors(prev => ({ ...prev, email: "กรุณากรอกอีเมล" }));
      if (!formData.password) setFieldErrors(prev => ({ ...prev, password: "กรุณากรอกรหัสผ่าน" }));
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
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setIsLoading(false);
      } else {
        // 🌟 จุดสำคัญ: ใช้ replace แทน push เพื่อปิดหน้า Login ทิ้งไปจากประวัติเบราว์เซอร์ ดึงเข้าหน้าแรกทันที
        router.replace("/admin");
        router.refresh();
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#376B64] to-[#2A524C] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-[#376B64]/30">
          A
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          เข้าสู่ระบบแอดมิน
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          จัดการข้อมูลและระบบนิติบุคคล
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-[2rem] sm:px-10 border border-gray-100">
          
          {/* แจ้งเตือนรวม (เวลา Login ผิดพลาดจาก Backend) */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="text-red-500 mr-3 shrink-0" size={20} />
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {/* ช่องอีเมล */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                อีเมล
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3.5 size-5 transition-colors ${fieldErrors.email ? 'text-red-400' : 'text-gray-400'}`} />
                <input
                  type="email"
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 font-medium transition-colors
                    ${fieldErrors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-transparent bg-red-50/30' 
                      : 'border-gray-200 focus:ring-[#1A534B] focus:border-transparent'}`}
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleEmailChange}
                />
              </div>
              {/* ข้อความเตือนใต้อีเมล */}
              {fieldErrors.email && (
                <div className="mt-1.5 flex items-center text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={14} className="mr-1" />
                  {fieldErrors.email}
                </div>
              )}
            </div>

            {/* ช่องรหัสผ่าน */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-3.5 size-5 transition-colors ${fieldErrors.password ? 'text-red-400' : 'text-gray-400'}`} />
                <input
                  type="password"
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 font-medium transition-colors
                    ${fieldErrors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-transparent bg-red-50/30' 
                      : 'border-gray-200 focus:ring-[#1A534B] focus:border-transparent'}`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handlePasswordChange}
                />
              </div>
              {/* ข้อความเตือนใต้รหัสผ่าน */}
              {fieldErrors.password && (
                <div className="mt-1.5 flex items-center text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={14} className="mr-1" />
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
                  ? "bg-gray-300 cursor-not-allowed" 
                  : "bg-[#1A534B] hover:bg-[#14423b] active:scale-[0.98]"
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}