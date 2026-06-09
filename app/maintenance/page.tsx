"use client";
import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, Droplet, Zap, MoreHorizontal, MapPin, 
  ClipboardList, MessageSquareText, Camera, Send, 
  AlertCircle, Wrench, Info, Image as ImageIcon, 
  Shield, Building 
} from "lucide-react";
import liff from "@line/liff"; 
import Swal from "sweetalert2"; 

export default function MaintenancePage() {
  const [reportType, setReportType] = useState("REPAIR"); 
  const [selectedCategory, setSelectedCategory] = useState("ประปา"); // 🌟 เปลี่ยนค่าเริ่มต้นให้ตรงกับฝั่งแอดมิน
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

  // 🌟 ปรับหมวดหมู่ให้ตรงกับ Database และ UI ของ Admin
  const categories = [
    { id: "ประปา", label: "ประปา", icon: Droplet, colorClass: "text-blue-600", bgClass: "bg-blue-50", borderClass: "border-blue-200" },
    { id: "ไฟฟ้า", label: "ไฟฟ้า", icon: Zap, colorClass: "text-amber-600", bgClass: "bg-amber-50", borderClass: "border-amber-200" },
    { id: "ส่วนกลาง", label: "ส่วนกลาง", icon: Building, colorClass: "text-[#376B64]", bgClass: "bg-[#376B64]/10", borderClass: "border-[#376B64]/20" },
    { id: "ความปลอดภัย", label: "ความปลอดภัย", icon: Shield, colorClass: "text-rose-600", bgClass: "bg-rose-50", borderClass: "border-rose-200" },
    { id: "อื่นๆ", label: "อื่นๆ", icon: MoreHorizontal, colorClass: "text-slate-600", bgClass: "bg-slate-50", borderClass: "border-slate-200" },
  ];

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

    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId: lineId,
          type: reportType,
          category: selectedCategory, // 🌟 ส่งข้อมูลภาษาไทยไปเลย ตรงฐานข้อมูลชัวร์
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
          text: `นิติบุคคลได้รับเรื่องของคุณแล้ว`,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' }
        }).then(() => {
          liff.closeWindow(); 
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-[#376B64] text-white p-3.5 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => liff.closeWindow()} className="p-1.5 hover:bg-white/20 rounded-xl transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-base font-bold mr-8">ศูนย์รับเรื่อง</h1>
      </header>

      {/* 🌟 ลด Padding และ Space-y ลงเพื่อให้ดูแน่นและสวยบนมือถือ */}
      <main className="p-4 max-w-md mx-auto space-y-4 pb-24">
        
        {/* Toggle รูปแบบการแจ้ง */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex gap-1">
          <button 
            onClick={() => setReportType("REPAIR")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${reportType === "REPAIR" ? "bg-[#376B64]/10 text-[#376B64] shadow-sm border border-[#376B64]/20" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Wrench size={16} /> แจ้งแก้ไข/ซ่อม
          </button>
          <button 
            onClick={() => setReportType("INFORM")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${reportType === "INFORM" ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Info size={16} /> แจ้งเพื่อทราบ
          </button>
        </div>

        {/* หมวดหมู่ */}
        <div className="space-y-2">
          <div className="flex items-center text-slate-700 font-bold text-xs uppercase tracking-wide px-1">
            <AlertCircle size={16} className="mr-1.5 text-[#376B64]" /> หมวดหมู่
          </div>
          {/* 🌟 เปลี่ยน Grid เป็น 3 คอลัมน์ รองรับ 5 ไอเท็มสวยๆ */}
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

        {/* ส่วนแนบรูป */}
        <div className="space-y-2 opacity-60">
          <div className="flex items-center text-gray-800 font-semibold text-xs uppercase tracking-wide px-1">
            <Camera size={16} className="mr-1.5 text-[#376B64]" /> แนบรูปภาพ (กำลังพัฒนา)
          </div>
          <button disabled className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center justify-center bg-gray-50 text-gray-500 cursor-not-allowed">
            <ImageIcon size={24} className="mb-2 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">ยังไม่เปิดใช้งานในเวอร์ชันนี้</span>
          </button>
        </div>

      </main>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-md border-t border-slate-100 max-w-md mx-auto shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
        <button 
          onClick={handleSubmit} disabled={isSubmitting}
          className={`w-full text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-[0.98] ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#376B64] hover:bg-[#2a524c]'}`}
        >
          {isSubmitting ? "กำลังส่งข้อมูล..." : <><Send size={18} className="mr-2" /> ส่งเรื่องให้นิติบุคคล</>}
        </button>
      </div>
    </div>
  );
}