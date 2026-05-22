"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft, Droplet, Zap, Sparkles, MoreHorizontal, MapPin, ClipboardList, MessageSquareText, Camera, Send, AlertCircle, Wrench, Info, Image as ImageIcon } from "lucide-react";
import liff from "@line/liff"; 
import Swal from "sweetalert2"; 

export default function MaintenancePage() {
  const [reportType, setReportType] = useState("REPAIR"); // สลับแจ้งซ่อม หรือ แจ้งเพื่อทราบ
  const [selectedCategory, setSelectedCategory] = useState("water");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [lineId, setLineId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const categories = [
    { id: "water", label: "ระบบน้ำ", icon: Droplet, colorClass: "text-blue-600", bgClass: "bg-blue-50", borderClass: "border-blue-200" },
    { id: "electric", label: "ระบบไฟฟ้า", icon: Zap, colorClass: "text-amber-600", bgClass: "bg-amber-50", borderClass: "border-amber-200" },
    { id: "clean", label: "ความสะอาด", icon: Sparkles, colorClass: "text-teal-600", bgClass: "bg-teal-50", borderClass: "border-teal-200" },
    { id: "other", label: "อื่นๆ", icon: MoreHorizontal, colorClass: "text-slate-600", bgClass: "bg-slate-50", borderClass: "border-slate-200" },
  ];

  const handleSubmit = async () => {
    if (!location || !title || !details) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาระบุสถานที่ หัวข้อ และรายละเอียดปัญหาให้ครบถ้วน', confirmButtonColor: '#0f766e', customClass: { popup: 'rounded-3xl' }});
      return;
    }

    if (!lineId) {
      Swal.fire({ icon: 'error', title: 'ไม่พบข้อมูลผู้ใช้', text: 'กรุณาเปิดระบบผ่านแอป LINE', confirmButtonColor: '#0f766e', customClass: { popup: 'rounded-3xl' } });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId: lineId,
          type: reportType,
          category: selectedCategory,
          location: location,
          title: title,
          description: details,
          imageUrl: null 
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({ 
          icon: 'success', 
          title: 'ส่งแจ้งเรื่องสำเร็จ!', 
          text: `นิติบุคคลได้รับเรื่องของคุณแล้ว (Ticket: ${data.ticket.ticketNo})`,
          confirmButtonColor: '#0f766e',
          customClass: { popup: 'rounded-3xl' }
        }).then(() => {
          liff.closeWindow(); 
        });
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: data.error || 'ไม่สามารถส่งข้อมูลได้', confirmButtonColor: '#0f766e', customClass: { popup: 'rounded-3xl' } });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อล้มเหลว', text: 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0f766e', customClass: { popup: 'rounded-3xl' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-teal-700 text-white p-4 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => liff.closeWindow()} className="p-2 hover:bg-white/20 rounded-xl transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold mr-10">ศูนย์รับเรื่อง</h1>
      </header>

      <main className="p-5 max-w-md mx-auto space-y-7 pb-28">
        
        {/* Toggle รูปแบบการแจ้ง */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex gap-1">
          <button 
            onClick={() => setReportType("REPAIR")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${reportType === "REPAIR" ? "bg-teal-50 text-teal-700 shadow-sm border border-teal-100" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Wrench size={18} /> แจ้งแก้ไข/ซ่อม
          </button>
          <button 
            onClick={() => setReportType("INFORM")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${reportType === "INFORM" ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Info size={18} /> แจ้งเพื่อทราบ
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-slate-700 font-bold text-sm uppercase tracking-wide">
            <AlertCircle size={18} className="mr-2 text-teal-600" /> หมวดหมู่
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center py-4 px-1 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected ? `${cat.bgClass} ${cat.borderClass} ${cat.colorClass} shadow-inner scale-95` : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  }`}
                >
                  <cat.icon size={26} className="mb-2.5" strokeWidth={isSelected ? 2.5 : 1.5} />
                  <span className={`text-[11px] ${isSelected ? "font-black" : "font-semibold"}`}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-slate-700 font-bold text-sm uppercase tracking-wide">
            <MapPin size={18} className="mr-2 text-teal-600" /> สถานที่/พิกัด
          </div>
          <input
            type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="เช่น สวนส่วนกลาง, หน้าบ้านเลขที่ 1"
            className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 bg-white"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-slate-700 font-bold text-sm uppercase tracking-wide">
            <ClipboardList size={18} className="mr-2 text-teal-600" /> หัวข้อเรื่อง
          </div>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="ระบุหัวข้อสั้นๆ ให้เข้าใจง่าย"
            className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 bg-white"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-slate-700 font-bold text-sm uppercase tracking-wide">
            <MessageSquareText size={18} className="mr-2 text-teal-600" /> รายละเอียด
          </div>
          <div className="relative">
            <textarea
              rows={4} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder="โปรดอธิบายรายละเอียดของเรื่องนี้เพิ่มเติม"
              className="w-full border-2 border-slate-200 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 bg-white resize-none"
            ></textarea>
            <div className="absolute bottom-4 right-4 text-xs text-slate-400 font-bold">
              {details.length}/500
            </div>
          </div>
        </div>

        {/* ส่วนแนบรูป ปิดไว้ก่อนตามที่คุณอภิวิชญ์ทำไว้ */}
        <div className="space-y-2 opacity-60">
          <div className="flex items-center text-gray-800 font-semibold text-sm uppercase tracking-wide">
            <Camera size={18} className="mr-2 text-teal-600" /> แนบรูปภาพ (กำลังพัฒนา)
          </div>
          <button disabled className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-8 flex flex-col items-center justify-center bg-gray-50 text-gray-500 cursor-not-allowed">
            <ImageIcon size={28} className="mb-2 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">ยังไม่เปิดใช้งานในเวอร์ชันนี้</span>
          </button>
        </div>

      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 max-w-md mx-auto">
        <button 
          onClick={handleSubmit} disabled={isSubmitting}
          className={`w-full text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-[0.98] ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}
        >
          {isSubmitting ? "กำลังส่งข้อมูล..." : <><Send size={18} className="mr-2" /> ส่งเรื่องให้นิติบุคคล</>}
        </button>
      </div>
    </div>
  );
}