"use client";
import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, Clock, CheckCircle2, Wrench, AlertCircle, 
  MapPin, ClipboardList, X, CheckCircle, Circle, ImageIcon
} from "lucide-react";
import liff from "@line/liff"; 
import Swal from "sweetalert2"; 

const STATUS_CONFIG: Record<string, any> = {
  PENDING: { label: 'รอดำเนินการ', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Clock },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'text-[#376B64]', bg: 'bg-[#376B64]/10', border: 'border-[#376B64]/20', icon: Wrench },
  COMPLETED: { label: 'เสร็จสิ้น', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
};

export default function MaintenanceHistoryPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lineId, setLineId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  useEffect(() => {
    const initLiffAndFetch = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2009290251-UZlxLIQJ" }); 
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineId(profile.userId);
          fetchHistory(profile.userId);
        } else {
          // ใช้ Mock สำหรับทดสอบบนเบราว์เซอร์
          fetchHistory("mock-line-id"); 
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
        setIsLoading(false);
      }
    };
    initLiffAndFetch();
  }, []);

  const fetchHistory = async (userId: string) => {
    try {
      const res = await fetch(`/api/maintenance/history?lineId=${userId}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (error) {
      console.error("Fetch History Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#376B64] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      <header className="bg-[#376B64] text-white p-3.5 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => liff.closeWindow()} className="p-1.5 hover:bg-white/20 rounded-xl transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-base font-bold mr-8">ประวัติการแจ้งเรื่อง</h1>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {tickets.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
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
      </main>

      {/* 🚀 MODAL: ดูรายละเอียดและ Timeline (แสดงรูปของแอดมิน) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">รายละเอียดสถานะ</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">#{selectedTicket.ticketNo || selectedTicket.id.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={18}/></button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar">
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                <h3 className="font-bold text-slate-800 text-sm mb-1">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{selectedTicket.description}</p>
                
                {/* ถ้ารูปที่ลูกบ้านแนบมี ก็โชว์ */}
                {selectedTicket.imageUrl && (
                  <img src={selectedTicket.imageUrl} alt="My Evidence" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                )}
              </div>

              {/* ⏳ Timeline ความคืบหน้า */}
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
                          
                          {/* 🌟 พระเอกอยู่ตรงนี้: ถ้าระบบมีรูปที่แอดมินส่งมา (updateImageUrl) ให้โชว์ตรงนี้เลย! */}
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