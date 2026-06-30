"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  ChevronLeft, Droplet, Zap, MoreHorizontal, MapPin, 
  ClipboardList, MessageSquareText, Camera, Send, 
  AlertCircle, Wrench, Info, Image as ImageIcon, 
  Shield, Building, X, Clock, CheckCircle2, CheckCircle, Circle
} from "lucide-react";
import liff from "@line/liff"; 
import Swal from "sweetalert2"; 

const STATUS_CONFIG: Record<string, any> = {
  PENDING: { label: 'รอดำเนินการ', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'text-[#376B64]', bg: 'bg-[#376B64]/10', border: 'border-[#376B64]/20', icon: Wrench },
  COMPLETED: { label: 'เสร็จสิ้น', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
};

export default function MaintenancePage() {
  const [userRole, setUserRole] = useState<'RESIDENT' | 'NITI' | 'SUPER_ADMIN'>('RESIDENT');
  const [activeView, setActiveView] = useState<'REPAIR' | 'INFORM' | 'HISTORY'>('REPAIR');

  const [selectedCategory, setSelectedCategory] = useState("ประปา");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [lineId, setLineId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const categories = useMemo(() => [
    { id: "ประปา", label: "ระบบประปา", icon: Droplet, colorClass: "text-blue-600", bgClass: "bg-blue-50", borderClass: "border-blue-200" },
    { id: "ไฟฟ้า", label: "ระบบไฟฟ้า", icon: Zap, colorClass: "text-amber-600", bgClass: "bg-amber-50", borderClass: "border-amber-200" },
    { id: "ส่วนกลาง", label: "พื้นที่ส่วนกลาง", icon: Building, colorClass: "text-[#376B64]", bgClass: "bg-[#376B64]/10", borderClass: "border-[#376B64]/20" },
    { id: "ความปลอดภัย", label: "ความปลอดภัย", icon: Shield, colorClass: "text-rose-600", bgClass: "bg-rose-50", borderClass: "border-rose-200" },
    { id: "อื่นๆ", label: "เรื่องอื่นๆ", icon: MoreHorizontal, colorClass: "text-slate-600", bgClass: "bg-slate-50", borderClass: "border-slate-200" },
  ], []);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "YOUR_LIFF_ID" }); 
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineId(profile.userId);
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
      }
    };
    initLiff();
  }, []);

  const fetchHistory = useCallback(async (userId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/maintenance?lineId=${userId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (error) {
      console.error("Fetch History Error", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'HISTORY' && lineId) {
      fetchHistory(lineId);
    }
  }, [activeView, lineId, fetchHistory]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'ขนาดไฟล์เกินกำหนด', 
          text: 'กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 10MB', 
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#376B64', 
          customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' } 
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const sendFlexMessage = async (ticketData: any) => {
    if (liff.isInClient()) {
      try {
        await liff.sendMessages([
          {
            type: "flex",
            altText: "แจ้งข้อมูลสำเร็จ",
            contents: {
              type: "bubble",
              size: "mega",
              header: {
                type: "box",
                layout: "vertical",
                backgroundColor: "#376B64",
                paddingAll: "20px",
                contents: [
                  { type: "text", text: "บันทึกข้อมูลสำเร็จ", weight: "bold", color: "#FFFFFF", size: "xl" }
                ]
              },
              body: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                paddingAll: "20px",
                contents: [
                  {
                    type: "box", layout: "horizontal",
                    contents: [
                      { type: "text", text: "รหัสอ้างอิง:", color: "#888888", size: "sm", flex: 2 },
                      { type: "text", text: ticketData.ticketNo || ticketData.id.slice(-6).toUpperCase(), color: "#333333", size: "sm", weight: "bold", flex: 4 }
                    ]
                  },
                  {
                    type: "box", layout: "horizontal",
                    contents: [
                      { type: "text", text: "หมวดหมู่:", color: "#888888", size: "sm", flex: 2 },
                      { type: "text", text: ticketData.category, color: "#333333", size: "sm", flex: 4 }
                    ]
                  },
                  {
                    type: "box", layout: "horizontal",
                    contents: [
                      { type: "text", text: "หัวข้อเรื่อง:", color: "#888888", size: "sm", flex: 2 },
                      { type: "text", text: ticketData.title, color: "#333333", size: "sm", wrap: true, flex: 4 }
                    ]
                  }
                ]
              }
            }
          }
        ]);
      } catch (error) {
        console.error("Failed to send Flex Message:", error);
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!location || !title || !details) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'ข้อมูลไม่ครบถ้วน', 
        text: 'กรุณาระบุสถานที่ หัวข้อ และรายละเอียดให้ครบถ้วนก่อนส่งข้อมูล', 
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#376B64', 
        customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' }
      });
      return;
    }

    if (!lineId) {
      Swal.fire({ 
        icon: 'error', 
        title: 'ไม่พบข้อมูลยืนยันตัวตน', 
        text: 'กรุณาเข้าใช้งานระบบผ่านแอปพลิเคชัน LINE', 
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#376B64', 
        customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' } 
      });
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = null;

    try {
      if (selectedFile) {
        Swal.fire({
          title: 'กำลังอัปโหลดข้อมูล',
          text: 'กรุณารอสักครู่ ระบบกำลังดำเนินการบันทึกไฟล์ภาพประกอบ',
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' },
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

        if (!uploadPreset || !cloudName) {
          throw new Error('ไม่พบการตั้งค่าตัวแปรสำหรับอัปโหลดไฟล์ในระบบ');
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
          throw new Error('ไม่สามารถอัปโหลดไฟล์ภาพได้');
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

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId: lineId,
          type: activeView, 
          category: selectedCategory,
          location: location,
          title: title,
          description: details,
          imageUrl: finalImageUrl 
        })
      });

      const data = await response.json();

      if (data.success && data.ticket) {
        await sendFlexMessage(data.ticket);

        Swal.fire({ 
          icon: 'success', 
          title: 'ส่งข้อมูลสำเร็จ', 
          text: 'ระบบได้รับข้อมูลการแจ้งเรื่องของท่านเรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' }
        }).then(() => {
          
          const newTicketData = {
            id: data.ticket.id,
            ticketNo: data.ticket.ticketNo,
            title: data.ticket.title,
            description: data.ticket.description,
            category: data.ticket.category,
            status: data.ticket.status,
            reportedDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
            imageUrl: data.ticket.imageUrl,
            history: [
              {
                status: "PENDING",
                date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }),
                note: "ระบบรับคำร้องอัตโนมัติ"
              }
            ]
          };

          setTickets(prevTickets => [newTicketData, ...prevTickets]);
          setTitle("");
          setDetails("");
          setLocation("");
          removeImage();
          setActiveView('HISTORY'); 
        });
      } else {
        Swal.fire({ 
          icon: 'error', 
          title: 'เกิดข้อผิดพลาดทางระบบ', 
          text: data.error || 'ไม่สามารถดำเนินการส่งข้อมูลได้', 
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#376B64', 
          customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' } 
        });
      }
    } catch (error: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'การดำเนินการล้มเหลว', 
        text: error.message || 'กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตและลองใหม่อีกครั้ง', 
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#376B64', 
        customClass: { popup: 'rounded-[2rem]', actions: 'w-full !justify-start px-4', confirmButton: 'mr-auto' } 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [location, title, details, lineId, selectedFile, activeView, selectedCategory, removeImage]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      <header className="bg-[#376B64] text-white p-3.5 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => liff.closeWindow()} className="p-1.5 hover:bg-white/20 rounded-xl transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-base font-bold mr-8">ศูนย์รับเรื่อง</h1>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex gap-1">
          <button 
            onClick={() => setActiveView("REPAIR")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeView === "REPAIR" ? "bg-[#376B64]/10 text-[#376B64] shadow-sm border border-[#376B64]/20" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Wrench size={16} /> แจ้งซ่อม
          </button>
          <button 
            onClick={() => setActiveView("INFORM")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeView === "INFORM" ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Info size={16} /> แจ้งเพื่อทราบ
          </button>
          <button 
            onClick={() => setActiveView("HISTORY")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeView === "HISTORY" ? "bg-amber-50 text-amber-700 shadow-sm border border-amber-100" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Clock size={16} /> ประวัติ
          </button>
        </div>

        {(activeView === 'REPAIR' || activeView === 'INFORM') && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {userRole === 'SUPER_ADMIN' && (
              <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-2">
                <Shield size={16} /> โหมดสำหรับผู้ดูแลระบบสูงสุด
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center text-slate-700 font-bold text-xs uppercase tracking-wide px-1">
                <AlertCircle size={16} className="mr-1.5 text-[#376B64]" /> หมวดหมู่
              </div>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl border-2 transition-all duration-200 ${
                        isSelected ? `${cat.bgClass} ${cat.borderClass} ${cat.colorClass} shadow-inner scale-95` : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      }`}
                    >
                      <cat.icon size={22} className="mb-1.5" strokeWidth={isSelected ? 2.5 : 1.5} />
                      <span className={`text-[10px] ${isSelected ? "font-black" : "font-semibold"}`}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-slate-700 font-bold text-xs uppercase tracking-wide px-1">
                <MapPin size={16} className="mr-1.5 text-[#376B64]" /> สถานที่และพิกัด
              </div>
              <input
                type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="ระบุสถานที่ เช่น สวนส่วนกลาง, หน้าบ้านเลขที่..."
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-slate-700 font-bold text-xs uppercase tracking-wide px-1">
                <ClipboardList size={16} className="mr-1.5 text-[#376B64]" /> หัวข้อเรื่อง
              </div>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="ระบุหัวข้อเรื่องที่ต้องการแจ้ง (โดยสังเขป)"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-slate-700 font-bold text-xs uppercase tracking-wide px-1">
                <MessageSquareText size={16} className="mr-1.5 text-[#376B64]" /> รายละเอียด
              </div>
              <div className="relative">
                <textarea
                  rows={4} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)}
                  placeholder="โปรดอธิบายรายละเอียดเพิ่มเติม เพื่อให้นิติบุคคลตรวจสอบได้อย่างถูกต้อง"
                  className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 bg-white resize-none transition-all custom-scrollbar"
                ></textarea>
                <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-bold bg-white/80 px-1 rounded">
                  {details.length}/500
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-gray-800 font-semibold text-xs uppercase tracking-wide px-1">
                <Camera size={16} className="mr-1.5 text-[#376B64]" /> แนบรูปภาพประกอบ
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              {imagePreview ? (
                <div className="relative w-full aspect-[20/13] rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" loading="lazy" className="w-full h-full object-cover" />
                  <button onClick={removeImage} className="absolute top-2 right-2 bg-slate-900/60 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center justify-center bg-white text-gray-500 hover:border-[#376B64]/50 hover:bg-[#376B64]/5 active:scale-[0.99] transition-all">
                  <ImageIcon size={24} className="mb-2 text-[#376B64]/70" />
                  <span className="text-xs font-semibold text-slate-700">กดเพื่อถ่ายภาพ หรือเลือกรูปจากอุปกรณ์</span>
                  <span className="text-[10px] text-slate-400 mt-1">(รองรับขนาดสูงสุด 10MB)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {activeView === 'HISTORY' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isLoadingHistory ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-8 h-8 border-4 border-[#376B64] border-t-transparent rounded-full"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold text-sm">ยังไม่มีประวัติการแจ้งเรื่องในระบบ</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400">รหัสอ้างอิง: #{ticket.ticketNo || ticket.id.slice(-6).toUpperCase()}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].color}`}>
                       {React.createElement(STATUS_CONFIG[ticket.status].icon, { size: 12 })}
                      {STATUS_CONFIG[ticket.status].label}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{ticket.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>
                  <div className="mt-3 flex justify-between items-center text-[10px] font-medium text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {ticket.category}</span>
                    <span>{ticket.reportedDate}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {(activeView === 'REPAIR' || activeView === 'INFORM') && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-md border-t border-slate-100 max-w-md mx-auto shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className={`w-full text-white font-black py-3.5 px-5 rounded-xl flex items-center justify-start shadow-lg transition-all active:scale-[0.98] ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#376B64] hover:bg-[#2a524c]'}`}
          >
            {isSubmitting ? (
              <span className="flex items-center"><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-3"></div> กำลังดำเนินการ...</span>
            ) : (
              <span className="flex items-center"><Send size={18} className="mr-3" /> ยืนยันการส่งข้อมูล</span>
            )}
          </button>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">รายละเอียดสถานะ</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">รหัสอ้างอิง: #{selectedTicket.ticketNo || selectedTicket.id.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full text-slate-500"><X size={18}/></button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                <h3 className="font-bold text-slate-800 text-sm mb-1">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{selectedTicket.description}</p>
                {selectedTicket.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={selectedTicket.imageUrl} loading="lazy" alt="หลักฐานการแจ้งเรื่อง" className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-sm" />
                )}
              </div>
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm"><Clock size={16} className="text-[#376B64]" /> ความคืบหน้าการดำเนินงาน</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                {selectedTicket.history?.map((hist: any, i: number) => {
                  const isLast = i === selectedTicket.history.length - 1;
                  return (
                    <div key={i} className="relative flex items-start gap-4">
                      <div className={`absolute left-0 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white z-10 ${isLast ? 'border-[#376B64]' : 'border-slate-300'}`}>
                        {isLast ? <Circle className="w-2.5 h-2.5 fill-[#376B64] text-[#376B64]" /> : <CheckCircle className="w-3 h-3 text-slate-300" />}
                      </div>
                      <div className="pl-8 w-full">
                        <p className={`text-sm font-bold ${isLast ? 'text-slate-800' : 'text-slate-500'}`}>{STATUS_CONFIG[hist.status]?.label || hist.status}</p>
                        <p className="text-[10px] font-bold text-slate-400 mb-1">{hist.date}</p>
                        <div className={`text-xs p-3 rounded-xl ${isLast ? 'bg-[#376B64]/5 border border-[#376B64]/20 text-slate-700' : 'bg-slate-50 border border-slate-100 text-slate-500'}`}>
                          {hist.note || '-'}
                          {hist.imageUrl && (
                              <div className="mt-3">
                                <p className="text-[10px] font-bold text-[#376B64] mb-1 flex items-center gap-1"><ImageIcon size={12}/> ภาพความคืบหน้าจากนิติบุคคล</p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={hist.imageUrl} loading="lazy" alt="ภาพความคืบหน้า" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                              </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}