"use client";
import React, { useState } from 'react';
import { UserPlus, Shield, Mail, Lock, User } from 'lucide-react';

export default function StaffManagementPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'NITI' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        alert("✅ สร้างบัญชีให้พนักงานเรียบร้อย!");
        setFormData({ name: '', email: '', password: '', role: 'NITI' }); // ล้างฟอร์ม
      } else {
        alert(`❌ ผิดพลาด: ${data.error}`);
      }
    } catch (error) {
      alert("❌ ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-3xl mx-auto bg-[#F8FAFC] min-h-screen">
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
                placeholder="เช่น สมชาย นิติบุคคล"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">อีเมล (ใช้สำหรับ Login) <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="email" 
                required 
                placeholder="email@example.com"
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
                placeholder="ตั้งรหัสผ่านให้พนักงาน (อย่างน้อย 6 ตัวอักษร)"
                minLength={6}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">แนะนำให้ใช้รหัสผ่านที่เดายาก และให้พนักงานไปเปลี่ยนทีหลัง</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">สิทธิ์การใช้งาน (Role) <span className="text-red-500">*</span></label>
            <select 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium bg-white" 
              value={formData.role} 
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="ADMIN">ADMIN (ผู้ดูแลระบบ - จัดการได้ทุกอย่าง)</option>
              <option value="NITI">NITI (นิติบุคคล - ดูแลลูกบ้านและบัญชี)</option>
            </select>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1A534B] hover:bg-[#14423b]'}`}
            >
              {isSubmitting ? 'กำลังสร้างบัญชี...' : '+ สร้างบัญชีพนักงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}