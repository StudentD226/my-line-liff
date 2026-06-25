'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Lock, Mail, Save, ShieldCheck, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session?.user?.name || '',   
        email: session?.user?.email || ''  
      }));
    }
  }, [session]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านไม่ตรงกัน',
        text: 'กรุณายืนยันรหัสผ่านใหม่ให้ถูกต้อง',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' }
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
          password: formData.password || undefined // ส่งเฉพาะตอนมีการพิมพ์รหัสใหม่
        }),
      });

      const data = await res.json();
      if (data.success) {
        // อัปเดตข้อมูลใน Session ของ Next-Auth เพื่อให้ชื่อที่มุมขวาบนเปลี่ยนตาม
        await update({ name: formData.name });
        
        Swal.fire({
          icon: 'success',
          title: 'อัปเดตข้อมูลสำเร็จ',
          text: 'ระบบได้บันทึกการเปลี่ยนแปลงบัญชีของคุณแล้ว',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' }
        });
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); // ล้างช่องรหัสผ่าน
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถอัปเดตข้อมูลได้ในขณะนี้',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-4xl mx-auto font-sans">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-2">
          <ShieldCheck className="text-[#376B64]" size={32} /> ตั้งค่าบัญชีผู้ดูแลระบบ
        </h1>
        <p className="text-slate-500 mt-2 text-sm">จัดการข้อมูลส่วนตัวและรหัสผ่านสำหรับเข้าใช้งานระบบ</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-[#376B64]/10 text-[#376B64] rounded-2xl flex items-center justify-center font-black text-2xl">
            {formData.name.charAt(0) || 'A'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{formData.name || 'กำลังโหลด...'}</h2>
            <p className="text-sm font-bold text-[#376B64] mt-1">
              สิทธิ์การเข้าถึง: {(session?.user as any)?.role === "SUPER_ADMIN" ? "ผู้ดูแลระบบสูงสุด" : (session?.user as any)?.role === "ADMIN" ? "แอดมิน" : "นิติบุคคล"}
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 max-w-xl">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">อีเมล (ไม่สามารถเปลี่ยนได้)</label>
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
            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อแสดงผล</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input 
                type="text" 
                required
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-white text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-bold" 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Lock size={18} className="text-slate-400" /> เปลี่ยนรหัสผ่าน (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
            </h3>
            
            <div className="space-y-4">
              <div>
                <input 
                  type="password" 
                  placeholder="รหัสผ่านใหม่"
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-medium" 
                />
              </div>
              <div>
                <input 
                  type="password" 
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  value={formData.confirmPassword} 
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-medium" 
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#376B64] hover:bg-[#2A524C] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="animate-spin mr-2" size={20} /> กำลังบันทึกข้อมูล...</>
              ) : (
                <><Save className="mr-2" size={20} /> บันทึกการเปลี่ยนแปลง</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}