"use client";
import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Mail, Lock, User, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function StaffManagementPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'NITI' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🌟 State สำหรับจัดการ Popup แจ้งเตือน
  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string }>({ 
    show: false, type: 'success', title: '', message: '' 
  });

  // 🌟 ฟังก์ชันเรียกแสดง Popup (จะหายไปเองใน 4 วินาที)
  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlert({ show: true, type, title, message });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        // แจ้งเตือนสำเร็จแบบเป็นทางการ
        showAlert('success', 'ดำเนินการสำเร็จ', 'ระบบได้ทำการสร้างบัญชีผู้ใช้งานใหม่เรียบร้อยแล้ว');
        setFormData({ name: '', email: '', password: '', role: 'NITI' }); // ล้างฟอร์ม
      } else {
        // แจ้งเตือนข้อผิดพลาดจากฝั่ง Backend (เช่น อีเมลซ้ำ)
        showAlert('error', 'ไม่สามารถบันทึกข้อมูลได้', data.error || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      }
    } catch (error) {
      // แจ้งเตือนกรณีเซิร์ฟเวอร์มีปัญหา
      showAlert('error', 'ระบบขัดข้อง', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้งในภายหลัง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative p-6 sm:p-10 max-w-3xl mx-auto bg-[#F8FAFC] min-h-screen">
      
      {/* 🌟 Popup Notification (Toast) */}
      <div 
        className={`fixed top-6 right-4 sm:right-6 z-[100] transition-all duration-300 transform ${
          alert.show ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'
        } max-w-[90vw] sm:max-w-sm w-full`}
      >
        <div className={`flex items-start space-x-3 p-4 rounded-xl shadow-2xl border-l-4 bg-white ${
          alert.type === 'success' ? 'border-emerald-500' : 'border-red-500'
        }`}>
          {alert.type === 'success' ? (
            <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={24} />
          ) : (
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
          )}
          
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold ${alert.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
              {alert.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1 leading-snug">
              {alert.message}
            </p>
          </div>
          
          <button 
            onClick={() => setAlert(prev => ({ ...prev, show: false }))}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Shield className="mr-2 text-[#1A534B]" size={28} />
          จัดการทีมงาน
        </h1>
        <p className="text-gray-500 mt-1 text-sm">เพิ่มบัญชีผู้ใช้งานสำหรับแอดมินและนิติบุคคล (เฉพาะ Super Admin)</p>
      </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-4 flex items-center">
          <UserPlus className="mr-2 text-gray-400" size={20} />
          สร้างบัญชีใหม่
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อพนักงาน <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                required 
                placeholder="ระบุชื่อ-นามสกุล ของพนักงาน"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">อีเมล (ใช้สำหรับเข้าสู่ระบบ) <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="email" 
                required 
                placeholder="example@domain.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">รหัสผ่านชั่วคราว <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                required 
                placeholder="กำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร"
                minLength={6}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">
              * แนะนำให้ตั้งรหัสผ่านที่คาดเดาได้ยาก และแจ้งพนักงานเพื่อเปลี่ยนแปลงในภายหลัง
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">สิทธิ์การเข้าถึงระบบ (Role) <span className="text-red-500">*</span></label>
            <select 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium bg-white cursor-pointer" 
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="ADMIN">ผู้ดูแลระบบ (ADMIN) - เข้าถึงการจัดการได้ทุกฟังก์ชัน</option>
              <option value="NITI">นิติบุคคล (NITI) - เข้าถึงเฉพาะฟังก์ชันการดูแลลูกบ้าน</option>
            </select>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center ${
                isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#1A534B] hover:bg-[#14423b] active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังประมวลผล...
                </span>
              ) : (
                '+ ยืนยันการสร้างบัญชี'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}