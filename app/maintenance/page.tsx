"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, Droplet, Zap, MoreHorizontal, MapPin, 
  ClipboardList, MessageSquareText, Camera, Send, 
  AlertCircle, Wrench, Info, Image as ImageIcon, 
  Shield, Building, X, Clock, CheckCircle2, CheckCircle, Circle
} from "lucide-react";
import liff from "@line/liff"; 
import Swal from "sweetalert2"; 

// --- Configuration สำหรับ History ---
const STATUS_CONFIG: Record<string, any> = {
  PENDING: { label: 'รอดำเนินการ', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'text-[#376B64]', bg: 'bg-[#376B64]/10', border: 'border-[#376B64]/20', icon: Wrench },
  COMPLETED: { label: 'เสร็จสิ้น', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
};

export default function MaintenancePage() {
  // 🌟 State ควบคุมหน้าจอ (Tabs) สลับไปมา 3 หน้า
  const [activeView, setActiveView] = useState<'REPAIR' | 'INFORM' | 'HISTORY'>('REPAIR');

  // --- State สำหรับ Form ---
  const [selectedCategory, setSelectedCategory] = useState("ประปา");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [lineId, setLineId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- State สำหรับ History ---
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2009290251-UZlxLIQJ" }); 
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

  // 🌟 โหลดประวัติจาก Database ทันทีเมื่อลูกบ้านกดแท็บ 'HISTORY'
  useEffect(() => {
    if (activeView === 'HISTORY' && lineId) {
      fetchHistory(lineId);
    }
  }, [activeView, lineId]);

  const fetchHistory = async (userId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/maintenance/history?lineId=${userId}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (error) {
      console.error("Fetch History Error", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const categories = [
    { id: "ประปา", label: "ประปา", icon: Droplet, colorClass: "text-blue-600", bgClass: "bg-blue-50", borderClass: "border-blue-200" },
    { id: "ไฟฟ้า", label: "ไฟฟ้า", icon: Zap, colorClass: "text-amber-600", bgClass: "bg-amber-50", borderClass: "border-amber-200" },
    { id: "ส่วนกลาง", label: "ส่วนกลาง", icon: Building, colorClass: "text-[#376B64]", bgClass: "bg-[#376B64]/10", borderClass: "border-[#376B64]/20" },
    { id: "ความปลอดภัย", label: "ความปลอดภัย", icon: Shield, colorClass: "text-rose-600", bgClass: "bg-rose-50", borderClass: "border-rose-200" },
    { id: "อื่นๆ", label: "อื่นๆ", icon: MoreHorizontal, colorClass: "text-slate-600", bgClass: "bg-slate-50", borderClass: "border-slate-200" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({ icon: 'error', title: 'ไฟล์ใหญ่เกินไป', text: 'กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 2MB ครับ', confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' } });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!location || !title || !details) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาระบุสถานที่ หัวข้อ และรายละเอียดปัญหาให้ครบถ้วน', confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' }});
      return;
    }

    if (!lineId) {
      Swal.fire({ icon: 'error', title: 'ไม่พบข้อมูลผู้ใช้', text: 'กรุณาเปิดระบบผ่านแอป LINE', confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' } });
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = null;

    if (selectedFile) {
      setIsUploading(true);
      try {
        finalImageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'แปลงรูปภาพไม่สำเร็จ', text: 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' } });
        setIsSubmitting(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId: lineId,
          type: activeView, // ส่งค่าแท็บปัจจุบัน (REPAIR หรือ INFORM) เข้า Database
          category: selectedCategory,
          location: location,
          title: title,
          description: details,
          imageUrl: finalImageUrl 
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({ 
          icon: 'success', 
          title: 'ส่งแจ้งเรื่องสำเร็จ!', 
          text: `นิติบุคคลได้รับเรื่องของคุณแล้ว`,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' }
        }).then(() => {
          // 🌟 ส่งเสร็จปุ๊บ เคลียร์ฟอร์ม แล้วเด้งไปแท็บประวัติให้ดูอัตโนมัติ
          setTitle("");
          setDetails("");
          setLocation("");
          removeImage();
          setActiveView('HISTORY');
        });
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: data.error || 'ไม่สามารถส่งข้อมูลได้', confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' } });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อล้มเหลว', text: 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      <header className="bg-[#376B64] text-white p-3.5 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => liff.closeWindow()} className="p-1.5 hover:bg-white/20 rounded-xl transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-base font-bold mr-8">ศูนย์รับเรื่อง</h1>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        
        {/* 🌟 3 Tabs Menu สลับไปมา */}
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
            <Info size={16} /> แจ้งร้องเรียน
          </button>
          <button 
            onClick={() => setActiveView("HISTORY")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeView === "HISTORY" ? "bg-amber-50 text-amber-700 shadow-sm border border-amber-100" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Clock size={16} /> ประวัติ
          </button>
        </div>

        {/* ======================================================== */}
        {/* หน้าจอส่วนฟอร์ม (แสดงเมื่อกดแท็บ แจ้งซ่อม หรือ แจ้งเพื่อทราบ) */}
        {/* ======================================================== */}
        {(activeView === 'REPAIR' || activeView === 'INFORM') && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                <MapPin size={16} className="mr-1.5 text-[#376B64]" /> สถานที่/พิกัด
              </div>
              <input
                type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น สวนส่วนกลาง, หน้าบ้านเลขที่ 1"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 bg-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-slate-700 font-bold text-xs uppercase tracking-wide px-1">
                <ClipboardList size={16} className="mr-1.5 text-[#376B64]" /> หัวข้อเรื่อง
              </div>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="ระบุหัวข้อสั้นๆ ให้เข้าใจง่าย"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 bg-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-slate-700 font-bold text-xs uppercase tracking-wide px-1">
                <MessageSquareText size={16} className="mr-1.5 text-[#376B64]" /> รายละเอียด
              </div>
              <div className="relative">
                <textarea
                  rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)}
                  placeholder="โปรดอธิบายรายละเอียดของเรื่องนี้เพิ่มเติม"
                  className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 bg-white resize-none"
                ></textarea>
                <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-bold">
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
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={removeImage} className="absolute top-2 right-2 bg-slate-900/60 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center justify-center bg-white text-gray-500 hover:border-[#376B64]/50 hover:bg-[#376B64]/5 active:scale-[0.99] transition-all">
                  <ImageIcon size={24} className="mb-2 text-[#376B64]/70" />
                  <span className="text-xs font-semibold text-slate-700">กดเพื่อเลือกรูปจากอัลบั้ม</span>
                  <span className="text-[10px] text-slate-400 mt-1">(ไม่เกิน 2MB)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* หน้าจอส่วนประวัติ (แสดงเมื่อกดแท็บ ประวัติ) */}
        {/* ======================================================== */}
        {activeView === 'HISTORY' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isLoadingHistory ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-8 h-8 border-4 border-[#376B64] border-t-transparent rounded-full"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold">ยังไม่มีประวัติการแจ้งเรื่อง</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-400">#{ticket.ticketNo || ticket.id.slice(-6).toUpperCase()}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].color}`}>
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

      {/* 🌟 ปุ่มส่งเรื่องจะโชว์เฉพาะหน้าฟอร์ม (ถ้าอยู่หน้าประวัติจะซ่อนไป) */}
      {(activeView === 'REPAIR' || activeView === 'INFORM') && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-md border-t border-slate-100 max-w-md mx-auto shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isUploading}
            className={`w-full text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-[0.98] ${isSubmitting || isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#376B64] hover:bg-[#2a524c]'}`}
          >
            {isUploading ? (
                <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2.5"></div> กำลังจัดการรูปภาพ...</>
            ) : isSubmitting ? (
                "กำลังส่งข้อมูล..."
            ) : (
                <><Send size={18} className="mr-2" /> ส่งเรื่องให้นิติบุคคล</>
            )}
          </button>
        </div>
      )}

      {/* 🚀 MODAL: ป็อปอัปเวลาคลิกดูรายละเอียดของประวัติ */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">รายละเอียดสถานะ</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">#{selectedTicket.ticketNo || selectedTicket.id.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={18}/></button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                <h3 className="font-bold text-slate-800 text-sm mb-1">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{selectedTicket.description}</p>
                {selectedTicket.imageUrl && (
                  <img src={selectedTicket.imageUrl} alt="My Evidence" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                )}
              </div>
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm"><Clock size={16} className="text-[#376B64]" /> ความคืบหน้างาน</h3>
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
                                <p className="text-[10px] font-bold text-[#376B64] mb-1 flex items-center gap-1"><ImageIcon size={12}/> ภาพอัปเดตจากแอดมิน</p>
                                <img src={hist.imageUrl} alt="Admin Update" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
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