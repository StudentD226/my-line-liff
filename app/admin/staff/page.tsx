"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UserPlus, Shield, Mail, Lock, User, CheckCircle, 
  AlertCircle, X, Users, Trash2, RefreshCw, ChevronDown, Copy, Loader2
} from 'lucide-react';
import Swal from 'sweetalert2';

// 🌟 ฟังก์ชันสุ่มรหัสผ่านเริ่มต้น
const generateDefaultPassword = (role: string) => {
  const prefix = role === 'ADMIN' ? 'SP' : 'NITI';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
};

export default function StaffManagementPage() {
  // 🌟 (ข้อ 3) จำลองสิทธิ์ผู้ใช้งาน (ในระบบจริงดึงจาก Session)
  const [currentUserRole] = useState<"SUPERADMIN" | "NITI">("SUPERADMIN");
  const canManage = currentUserRole === "SUPERADMIN";

  const [activeTab, setActiveTab] = useState<'CREATE' | 'LIST'>(canManage ? 'CREATE' : 'LIST');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: generateDefaultPassword('NITI'), 
    role: 'NITI' 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string }>({ 
    show: false, type: 'success', title: '', message: '' 
  });

  const showAlert = useCallback((type: 'success' | 'error', title: string, message: string) => {
    setAlert({ show: true, type, title, message });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  // 🌟 Auto-gen รหัสผ่านเมื่อเปลี่ยน Role
  useEffect(() => {
    setFormData(prev => ({ ...prev, password: generateDefaultPassword(prev.role) }));
  }, [formData.role]);

  // 🌟 ดึงข้อมูลรายชื่อพนักงาน
  const fetchStaffList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setStaffList(data.data || []);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'LIST') {
      fetchStaffList();
    }
  }, [activeTab, fetchStaffList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        showAlert('success', 'ดำเนินการสำเร็จ', 'ระบบได้ทำการสร้างบัญชีผู้ใช้งานใหม่เรียบร้อยแล้ว');
        setFormData({ name: '', email: '', role: 'NITI', password: generateDefaultPassword('NITI') });
      } else {
        showAlert('error', 'ไม่สามารถบันทึกข้อมูลได้', data.error || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      }
    } catch (error) {
      showAlert('error', 'ระบบขัดข้อง', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้งในภายหลัง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 (ข้อ 1) กำหนดปุ่มตกลงอยู่ซ้ายมือเสมอ
  const swalConfig = useMemo(() => ({
    confirmButtonColor: '#376B64',
    cancelButtonColor: '#94a3b8',
    reverseButtons: false, // บังคับปุ่มตกลงอยู่ซ้าย
    customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-6', cancelButton: 'rounded-xl font-bold px-6' }
  }), []);

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบบัญชี',
      html: `คุณกำลังจะลบบัญชีของ <b>${name}</b> ออกจากระบบ ยืนยันหรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      ...swalConfig
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          Swal.fire({ icon: 'success', title: 'ลบข้อมูลสำเร็จ', confirmButtonText: 'ตกลง', ...swalConfig });
          fetchStaffList();
        } else {
          Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: data.error, confirmButtonText: 'ตกลง', ...swalConfig });
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'ระบบขัดข้อง', confirmButtonText: 'ตกลง', ...swalConfig });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResetPassword = async (id: string, name: string, currentRole: string) => {
    const result = await Swal.fire({
      title: 'ตั้งค่ารหัสผ่านใหม่',
      html: `ต้องการสร้างรหัสผ่านใหม่สำหรับ <b>${name}</b> ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'สร้างรหัสใหม่',
      cancelButtonText: 'ยกเลิก',
      ...swalConfig
    });

    if (result.isConfirmed) {
      const newPassword = generateDefaultPassword(currentRole);
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/staff/${id}/reset-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword })
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({ 
            icon: 'success', 
            title: 'ตั้งค่ารหัสผ่านสำเร็จ', 
            html: `รหัสผ่านใหม่คือ: <b>${newPassword}</b>`,
            confirmButtonText: 'ตกลง', 
            ...swalConfig 
          });
          fetchStaffList();
        } else {
          Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: data.error, confirmButtonText: 'ตกลง', ...swalConfig });
        }
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'ระบบขัดข้อง', confirmButtonText: 'ตกลง', ...swalConfig });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="relative p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto bg-[#F8FAFC] min-h-screen font-sans">
      
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
          <button onClick={() => setAlert(prev => ({ ...prev, show: false }))} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Shield className="mr-2 text-[#376B64]" size={28} />
          จัดการทีมงานระบบ
        </h1>
        <p className="text-gray-500 mt-1 text-sm">ดูแลบัญชีผู้ใช้งานสำหรับผู้ดูแลระบบและนิติบุคคล</p>
      </div>

      {/* 🌟 Navigation Tabs */}
      <div className="flex space-x-2 bg-gray-200/50 p-1.5 rounded-2xl w-max mb-6">
        {canManage && (
          <button 
            onClick={() => setActiveTab('CREATE')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'CREATE' ? 'bg-white text-[#376B64] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UserPlus size={16} /> สร้างบัญชีใหม่
          </button>
        )}
        <button 
          onClick={() => setActiveTab('LIST')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'LIST' ? 'bg-white text-[#376B64] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> รายชื่อทีมงาน
        </button>
      </div>
      
      {/* 🌟 Tab 1: Create Account */}
      {activeTab === 'CREATE' && canManage && (
        <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4 flex items-center">
            <UserPlus className="mr-2 text-gray-400" size={20} />
            ฟอร์มสร้างบัญชี
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">สิทธิ์การเข้าถึง (Role) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 text-gray-400" size={18} />
                  <select 
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#376B64] outline-none transition-all font-bold bg-white cursor-pointer appearance-none text-slate-700" 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="ADMIN">ผู้ดูแลระบบ (SUPER ADMIN)</option>
                    <option value="NITI">นิติบุคคล (NITI)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">รหัสผ่านเริ่มต้น <span className="text-red-500">*</span></label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 text-[#376B64]" size={18} />
                  <input 
                    type="text" 
                    readOnly
                    className="w-full pl-10 pr-12 py-2.5 border border-emerald-200 bg-emerald-50 rounded-xl outline-none font-bold text-[#376B64] tracking-wider" 
                    value={formData.password} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, password: generateDefaultPassword(prev.role) }))}
                    className="absolute right-2 p-1.5 bg-white rounded-lg text-gray-400 hover:text-[#376B64] transition-colors border border-gray-200 shadow-sm"
                    title="สุ่มรหัสใหม่"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 font-medium">* ระบบสุ่มให้อัตโนมัติ สามารถคัดลอกให้พนักงานได้ทันที</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  required 
                  placeholder="ระบุชื่อ-นามสกุล ของพนักงาน"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#376B64] outline-none transition-all font-medium bg-gray-50 focus:bg-white" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">อีเมลเข้าสู่ระบบ <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="email" 
                  required 
                  placeholder="example@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#376B64] outline-none transition-all font-medium bg-gray-50 focus:bg-white" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full sm:w-auto text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center justify-center ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#376B64] hover:bg-[#2A524C] active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20} /> : <UserPlus className="mr-2" size={20} />}
                {isSubmitting ? 'กำลังประมวลผล...' : 'ยืนยันการสร้างบัญชี'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🌟 Tab 2: Staff List */}
      {activeTab === 'LIST' && (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-800 flex items-center text-base">
              <Users className="mr-2 text-gray-400" size={20} /> บัญชีผู้ใช้งานในระบบ
            </h3>
            {isLoading && <Loader2 className="animate-spin text-[#376B64]" size={20} />}
          </div>
          
          <div className="overflow-x-auto custom-scrollbar w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 sm:p-5">ชื่อ-นามสกุล</th>
                  <th className="p-4 sm:p-5">อีเมลเข้าสู่ระบบ</th>
                  <th className="p-4 sm:p-5 text-center">สิทธิ์การเข้าถึง</th>
                  {canManage && <th className="p-4 sm:p-5 text-center">การจัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffList.length > 0 ? (
                  staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 sm:p-5">
                        <div className="font-bold text-gray-800 text-sm">{staff.name}</div>
                      </td>
                      <td className="p-4 sm:p-5">
                        <div className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                          <Mail size={14} className="text-gray-400" /> {staff.email}
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          staff.role === 'ADMIN' ? 'bg-[#376B64]/10 text-[#376B64]' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Shield size={12} className="mr-1" /> {staff.role === 'ADMIN' ? 'SUPER ADMIN' : 'NITI'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="p-4 sm:p-5 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => handleResetPassword(staff.id, staff.name, staff.role)}
                              className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100" 
                              title="ตั้งรหัสผ่านใหม่"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(staff.id, staff.name)}
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100" 
                              title="ลบบัญชี"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="py-12 text-center text-gray-400 font-bold">
                      {isLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลผู้ใช้งาน'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}