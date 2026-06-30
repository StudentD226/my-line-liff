'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, AlertCircle, Clock, CheckCircle2, AlertTriangle, 
  X, Send, Wrench, Calendar, User, Home, FileText, CheckCircle, 
  Circle, MessageSquare, ImageIcon, Camera, ChevronDown, BarChart, 
  ClipboardList, History, Shield
} from 'lucide-react';
import Swal from 'sweetalert2';

// --- Types ---
type RepairStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type Category = 'ประปา' | 'ไฟฟ้า' | 'ส่วนกลาง' | 'ความปลอดภัย' | 'อื่นๆ';

type HistoryItem = {
  status: RepairStatus;
  date: string;
  note: string;
  imageUrl?: string;
};

type RepairTicket = {
  id: string;
  residentName: string;
  houseNo: string;
  title: string;
  description: string;
  category: Category;
  status: RepairStatus;
  isUrgent: boolean;
  reportedDate: string;
  expectedDate?: string;
  history: HistoryItem[];
  imageUrl?: string;
};

const STATUS_CONFIG = {
  PENDING: { label: 'รอดำเนินการ', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'text-[#376B64]', bg: 'bg-[#376B64]/10', border: 'border-[#376B64]/20', icon: Wrench },
  COMPLETED: { label: 'เสร็จสิ้น', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
};

export default function AdminRepairsManagement() {
  // 🌟 โครงสร้าง RBAC (Role-Based Access Control) 
  const [userRole, setUserRole] = useState<'NITI' | 'SUPER_ADMIN'>('SUPER_ADMIN');

  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ALL' | RepairStatus>('ALL');
  const [activeCategory, setActiveCategory] = useState<Category | 'ทั้งหมด'>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTicket, setSelectedTicket] = useState<RepairTicket | null>(null);
  const [updateForm, setUpdateForm] = useState({
    status: 'IN_PROGRESS' as RepairStatus,
    expectedDate: '',
    note: ''
  });

  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [adminImagePreview, setAdminImagePreview] = useState<string | null>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  const TABS: { id: 'ALL' | RepairStatus; label: string }[] = useMemo(() => [
    { id: 'ALL', label: 'ทั้งหมด' },
    { id: 'PENDING', label: 'รอดำเนินการ' },
    { id: 'IN_PROGRESS', label: 'กำลังดำเนินการ' },
    { id: 'COMPLETED', label: 'เสร็จสิ้น' }
  ], []);

  const CATEGORIES: (Category | 'ทั้งหมด')[] = useMemo(() => 
    ['ทั้งหมด', 'ประปา', 'ไฟฟ้า', 'ส่วนกลาง', 'ความปลอดภัย', 'อื่นๆ'], 
  []);

  const fetchRepairs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance');
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch repair tickets", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  const getAvatarText = useCallback((name: string) => name ? name.replace(/นาง|นาย|นางสาว/g, '').charAt(0) : '?', []);
  const getAvatarColor = useCallback((index: number) => {
    const colors = ['bg-orange-100 text-orange-600', 'bg-[#376B64]/10 text-[#376B64]', 'bg-emerald-100 text-emerald-600', 'bg-rose-100 text-rose-600'];
    return colors[index % colors.length];
  }, []);

  const openUpdateModal = useCallback((ticket: RepairTicket) => {
    setSelectedTicket(ticket);
    setUpdateForm({
      status: ticket.status === 'PENDING' ? 'IN_PROGRESS' : ticket.status,
      expectedDate: ticket.expectedDate || '',
      note: ''
    });
    setAdminFile(null);
    setAdminImagePreview(null);
  }, []);

  const handleAdminFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'ขนาดไฟล์เกินกำหนด', 
          text: 'รองรับไฟล์ภาพขนาดไม่เกิน 10MB', 
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' }
        });
        return;
      }
      setAdminFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAdminImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const removeAdminImage = useCallback(() => {
    setAdminFile(null);
    setAdminImagePreview(null);
    if (adminFileInputRef.current) adminFileInputRef.current.value = "";
  }, []);

  const handleSaveUpdate = useCallback(async () => {
    if (!selectedTicket) return;
    
    setIsLoading(true);
    let finalImageUrl = null;

    try {
      if (adminFile) {
        Swal.fire({
          title: 'กำลังอัปโหลดข้อมูล',
          text: 'ระบบกำลังดำเนินการบันทึกภาพประกอบ กรุณารอสักครู่',
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' },
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const formData = new FormData();
        formData.append('file', adminFile);
        
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

        if (!uploadPreset || !cloudName) {
          throw new Error('ไม่พบการตั้งค่าระบบจัดเก็บไฟล์ภาพ');
        }

        formData.append('upload_preset', uploadPreset);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        const cloudinaryData = await cloudinaryRes.json();

        if (cloudinaryData.secure_url) {
          finalImageUrl = cloudinaryData.secure_url;
        } else {
          throw new Error('ดำเนินการอัปโหลดภาพไม่สำเร็จ');
        }
      } else {
        Swal.fire({
          title: 'กำลังบันทึกข้อมูล',
          text: 'กรุณารอสักครู่',
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' },
          didOpen: () => {
            Swal.showLoading();
          }
        });
      }

      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTicket.id,
          status: updateForm.status,
          expectedDate: updateForm.expectedDate,
          note: updateForm.note,
          sendLine: true,
          updateImageUrl: finalImageUrl 
        })
      });

      const json = await res.json();

      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกและแจ้งเตือนสำเร็จ',
          text: 'ข้อมูลถูกบันทึกและส่งแจ้งเตือนไปยังผู้พักอาศัยแล้ว',
          showConfirmButton: true,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' }
        });
        setSelectedTicket(null);
        fetchRepairs(); 
      } else {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'การดำเนินการล้มเหลว', 
        text: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' }
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTicket, adminFile, updateForm, fetchRepairs]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (activeTab !== 'ALL' && t.status !== activeTab) return false;
      if (activeCategory !== 'ทั้งหมด' && t.category !== activeCategory) return false;
      if (searchQuery && !t.title.includes(searchQuery) && !t.residentName.includes(searchQuery)) return false;
      return true;
    });
  }, [tickets, activeTab, activeCategory, searchQuery]);

  if (isLoading && tickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-10 h-10 border-4 border-[#376B64] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Wrench className="text-[#376B64]" /> ระบบบริหารจัดการงานซ่อมบำรุง
            </h1>
            <p className="text-sm text-slate-500 mt-1">ติดตามสถานะและจัดการคำร้องจากผู้พักอาศัย</p>
          </div>
          {userRole === 'SUPER_ADMIN' && (
             <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
               <Shield size={14} /> ผู้ดูแลระบบสูงสุด
             </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden">
            <BarChart size={48} className="absolute top-4 right-4 text-slate-300 opacity-20" />
            <span className="text-sm font-bold text-slate-600 mb-1">คำร้องทั้งหมด</span>
            <div className="text-3xl font-black text-slate-800">{tickets.length}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-200 flex flex-col justify-center relative overflow-hidden">
            <Clock size={48} className="absolute top-4 right-4 text-orange-500 opacity-10" />
            <span className="text-sm font-bold text-slate-600 mb-1">รอดำเนินการ</span>
            <div className="text-3xl font-black text-orange-500">{tickets.filter(t => t.status === 'PENDING').length}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#376B64]/20 flex flex-col justify-center relative overflow-hidden">
            <AlertTriangle size={48} className="absolute top-4 right-4 text-[#376B64] opacity-10" />
            <span className="text-sm font-bold text-slate-600 mb-1">กำลังดำเนินการ</span>
            <div className="text-3xl font-black text-[#376B64]">{tickets.filter(t => t.status === 'IN_PROGRESS').length}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200 flex flex-col justify-center relative overflow-hidden">
            <CheckCircle2 size={48} className="absolute top-4 right-4 text-emerald-500 opacity-10" />
            <span className="text-sm font-bold text-slate-600 mb-1">เสร็จสิ้น</span>
            <div className="text-3xl font-black text-emerald-500">{tickets.filter(t => t.status === 'COMPLETED').length}</div>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          
          <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/50 pt-2 px-4 custom-scrollbar">
            {TABS.map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? 'border-[#376B64] text-[#376B64]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative w-full lg:w-64 shrink-0">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" placeholder="ค้นหาชื่อ, หัวข้อ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#376B64] font-medium transition-colors" />
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar w-full pb-1">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${activeCategory === cat ? 'bg-[#376B64] text-white border-[#376B64]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            {filteredTickets.length === 0 && !isLoading ? (
               <div className="p-10 text-center text-slate-500 font-bold flex flex-col items-center gap-2">
                 <ClipboardList size={48} className="text-slate-300 mb-2" />
                 ไม่พบข้อมูลการแจ้งซ่อมในระบบ
               </div>
            ) : (
              <>
                <table className="w-full text-left hidden md:table min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">ผู้พักอาศัย</th>
                      <th className="px-6 py-4 font-bold w-1/3">รายละเอียดคำร้อง</th>
                      <th className="px-6 py-4 font-bold">หมวดหมู่</th>
                      <th className="px-6 py-4 font-bold">สถานะ</th>
                      <th className="px-6 py-4 font-bold text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTickets.map((ticket, index) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarColor(index)}`}>{getAvatarText(ticket.residentName)}</div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{ticket.residentName}</p>
                              <p className="text-xs text-slate-500 font-medium">{ticket.houseNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 text-sm">{ticket.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 truncate max-w-[200px]">{ticket.description}</span>
                            {ticket.isUrgent && <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded"><AlertCircle size={10}/> เร่งด่วน</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{ticket.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 text-xs font-bold w-max px-2.5 py-1 rounded-full ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].color}`}>
                            {React.createElement(STATUS_CONFIG[ticket.status].icon, { size: 12 })}
                            {STATUS_CONFIG[ticket.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => openUpdateModal(ticket)} className="px-4 py-1.5 border border-[#376B64] text-[#376B64] hover:bg-[#376B64] hover:border-[#376B64] hover:text-white transition-colors rounded-xl text-xs font-bold active:scale-95">
                            จัดการสถานะ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredTickets.map(ticket => (
                    <div key={ticket.id} className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">{ticket.category}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].color}`}>
                          {React.createElement(STATUS_CONFIG[ticket.status].icon, { size: 10 })}
                          {STATUS_CONFIG[ticket.status].label}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          {ticket.title} {ticket.isUrgent && <AlertCircle size={14} className="text-rose-500" />}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ticket.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <User size={12} /> {ticket.residentName} ({ticket.houseNo})
                      </div>
                      <button onClick={() => openUpdateModal(ticket)} className="w-full py-2.5 mt-2 border border-[#376B64] text-[#376B64] rounded-xl font-bold text-xs hover:bg-[#376B64] hover:text-white transition-colors active:scale-[0.98]">
                        จัดการสถานะการซ่อม
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start md:items-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl my-4 md:my-0 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            
            {/* Left: Info & Timeline */}
            <div className="flex-1 bg-slate-50 p-6 md:p-8 border-r border-slate-200 overflow-y-auto max-h-[85vh] custom-scrollbar min-w-[50%]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <FileText className="text-slate-400" /> รหัสอ้างอิง: #{selectedTicket.id.slice(-6).toUpperCase()}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-3 py-1 rounded-full ${STATUS_CONFIG[selectedTicket.status].bg} ${STATUS_CONFIG[selectedTicket.status].color}`}>
                    {React.createElement(STATUS_CONFIG[selectedTicket.status].icon, { size: 14 })}
                    {STATUS_CONFIG[selectedTicket.status].label}
                  </span>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="md:hidden text-slate-400 hover:text-slate-600 bg-slate-200/50 rounded-full p-2 transition-colors"><X size={20}/></button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 mb-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <User size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">ผู้แจ้งเรื่อง</p>
                    <p className="text-sm font-bold text-slate-800">{selectedTicket.residentName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Home size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">บ้านเลขที่</p>
                    <p className="text-sm font-bold text-slate-800">{selectedTicket.houseNo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">วันที่บันทึกคำร้อง</p>
                    <p className="text-sm font-bold text-slate-800">{selectedTicket.reportedDate}</p>
                  </div>
                </div>
              </div>

              {selectedTicket.imageUrl && (
                <div className="mb-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><ImageIcon size={14}/> ภาพประกอบจากผู้พักอาศัย</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedTicket.imageUrl} alt="ภาพประกอบ" loading="lazy" className="w-full max-h-48 object-cover rounded-xl border border-slate-200 shadow-sm" />
                </div>
              )}

              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 mb-8">
                <h3 className="font-bold text-slate-800 text-sm mb-1">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedTicket.description}</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><History size={18} className="text-[#376B64]" /> ประวัติการดำเนินการ</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
                  {selectedTicket.history?.map((hist, i) => {
                    const isLast = i === selectedTicket.history.length - 1;
                    return (
                      <div key={i} className="relative flex items-start gap-4">
                        <div className={`absolute left-0 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white z-10 ${isLast ? 'border-[#376B64]' : 'border-slate-300'}`}>
                          {isLast ? <Circle className="w-2.5 h-2.5 fill-[#376B64] text-[#376B64]" /> : <CheckCircle className="w-3 h-3 text-slate-300" />}
                        </div>
                        <div className="pl-8 w-full">
                          <p className={`text-sm font-bold ${isLast ? 'text-slate-800' : 'text-slate-500'}`}>{STATUS_CONFIG[hist.status].label}</p>
                          <p className="text-[10px] font-bold text-slate-400 mb-1">{hist.date}</p>
                          <div className={`text-xs p-3 rounded-xl ${isLast ? 'bg-white border border-[#376B64]/20 shadow-sm text-slate-700' : 'bg-slate-100 border border-slate-200 text-slate-500'}`}>
                            {hist.note || '-'}
                            {hist.imageUrl && (
                                <div className="mt-3">
                                  <p className="text-[10px] font-bold text-[#376B64] mb-1 flex items-center gap-1"><ImageIcon size={12}/> ภาพความคืบหน้าการทำงาน</p>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={hist.imageUrl} alt="การดำเนินการ" loading="lazy" className="mt-1 w-full h-24 object-cover rounded-lg border border-slate-200" />
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {(!selectedTicket.history || selectedTicket.history.length === 0) && (
                    <p className="text-xs text-slate-400 text-center w-full block bg-slate-100 py-3 rounded-xl">ยังไม่มีประวัติการอัปเดตในระบบ</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Update Form */}
            <div className="w-full md:w-[450px] bg-white p-6 md:p-8 flex flex-col relative shrink-0">
              <button onClick={() => setSelectedTicket(null)} className="hidden md:block absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors"><X size={20}/></button>
              
              <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
                <Wrench className="text-[#376B64]" size={20} /> ฟอร์มอัปเดตสถานะ
              </h3>

              <div className="space-y-5 flex-1">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">สถานะล่าสุด</label>
                  <div className="relative">
                    <select 
                      value={updateForm.status} 
                      onChange={e => setUpdateForm({...updateForm, status: e.target.value as RepairStatus})}
                      className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#376B64] font-bold text-slate-700 appearance-none bg-slate-50 transition-colors"
                    >
                      <option value="PENDING">รอดำเนินการ</option>
                      <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                      <option value="COMPLETED">เสร็จสิ้น</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">กำหนดการ (คาดว่าจะเสร็จ)</label>
                  <input 
                    type="date" 
                    value={updateForm.expectedDate}
                    onChange={e => setUpdateForm({...updateForm, expectedDate: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#376B64] font-medium bg-slate-50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">รายละเอียดการดำเนินการ</label>
                  <textarea 
                    rows={3} 
                    placeholder="ระบุรายละเอียดเพื่อแจ้งให้ผู้พักอาศัยทราบ..."
                    value={updateForm.note}
                    onChange={e => setUpdateForm({...updateForm, note: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#376B64] font-medium resize-none bg-slate-50 transition-colors custom-scrollbar"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">แนบภาพประกอบ (ถ้ามี)</label>
                  <input type="file" accept="image/*" ref={adminFileInputRef} onChange={handleAdminFileChange} className="hidden" />
                  
                  {adminImagePreview ? (
                    <div className="relative w-full h-28 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={adminImagePreview} alt="Admin Preview" loading="lazy" className="w-full h-full object-cover" />
                      <button onClick={removeAdminImage} className="absolute top-2 right-2 bg-slate-900/60 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => adminFileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-5 flex flex-col items-center justify-center bg-slate-50 text-slate-500 hover:border-[#376B64]/50 hover:bg-[#376B64]/5 transition-all active:scale-[0.99]">
                      <Camera size={24} className="mb-2 text-slate-400" />
                      <span className="text-xs font-bold">แนบรูปภาพความคืบหน้า</span>
                      <span className="text-[10px] text-slate-400 mt-1 font-medium">(รองรับขนาดสูงสุด 10MB)</span>
                    </button>
                  )}
                </div>

                <div className="bg-[#376B64]/10 border border-[#376B64]/20 p-4 rounded-xl flex items-start gap-3 mt-4">
                  <MessageSquare className="text-[#376B64] shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-[11px] text-[#376B64] leading-relaxed font-bold">
                      ระบบจะทำการแจ้งเตือนไปยังแอปพลิเคชัน LINE ของผู้พักอาศัยโดยอัตโนมัติ
                    </p>
                  </div>
                </div>
              </div>

              {/* 🌟 จัดตำแหน่งปุ่ม: บันทึกอยู่ซ้าย ยกเลิกอยู่ขวา */}
              <div className="mt-8 flex flex-row gap-3 pt-5 border-t border-slate-100 justify-start">
                <button 
                  onClick={handleSaveUpdate} 
                  disabled={isLoading}
                  className="flex-[2] py-3.5 bg-[#376B64] hover:bg-[#2A514B] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isLoading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <><Send size={18} /> บันทึกและแจ้งเตือน</>}
                </button>
                <button 
                  onClick={() => setSelectedTicket(null)} 
                  disabled={isLoading}
                  className="flex-1 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition-transform disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}