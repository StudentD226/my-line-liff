'use client';

import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Wrench, CheckCircle2, Plus, Zap, Droplets, 
  Send, Clock, Image as ImageIcon, CheckCircle, MoreHorizontal, AlertCircle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Swal from 'sweetalert2';

// --- ข้อมูลจำลอง (เดี๋ยวเราค่อยมาเขียนดึงจาก Database ของจริง) ---
const initialNews = [
  { id: '1', title: 'การไฟฟ้าจะเข้าซ่อมบำรุงหม้อแปลง เฟส 2', type: 'MAINTENANCE', tag: '⚡ แจ้งซ่อมบำรุง', color: 'text-orange-700 bg-orange-100', date: 'วันนี้ 09:00', lineStatus: 'PUSHED' },
  { id: '2', title: 'ขอเชิญลูกบ้านร่วมงานทำบุญหมู่บ้านประจำปี', type: 'EVENT', tag: '🎉 กิจกรรม', color: 'text-blue-700 bg-blue-100', date: 'เมื่อวาน 15:30', lineStatus: 'PUBLISHED' },
  { id: '3', title: 'งดใช้สระว่ายน้ำชั่วคราวเพื่อทำความสะอาด', type: 'MAINTENANCE', tag: '⚡ แจ้งซ่อมบำรุง', color: 'text-orange-700 bg-orange-100', date: '12 ต.ค. 2566', lineStatus: 'DRAFT' },
];

const initialTickets = [
  { id: '101', houseNo: '26', issue: 'ท่อน้ำประปาแตกหน้าบ้าน น้ำไหลนอง', time: '15 นาทีที่แล้ว', status: 'NEW' },
  { id: '102', houseNo: '88/4', issue: 'ไฟถนนหน้าบ้านกระพริบ', time: '1 ชม. ที่แล้ว', status: 'NEW' },
  { id: '103', houseNo: '9/1', issue: 'กิ่งไม้ใหญ่ร่วงขวางถนน', time: '2 ชม. ที่แล้ว', status: 'IN_PROGRESS' },
  { id: '104', houseNo: '45/2', issue: 'เก็บขยะไม่หมด', time: 'เมื่อวาน', status: 'RESOLVED' },
];

export default function MainDashboard() {
  const [news, setNews] = useState(initialNews);
  const [tickets, setTickets] = useState(initialTickets);
  const [isMounted, setIsMounted] = useState(false);

  // ป้องกัน Error Hydration ของ Drag & Drop
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🌟 ฟังก์ชันจัดการเวลาลากการ์ดไปวาง
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      const updatedTickets = tickets.map(t => {
        if (t.id === draggableId) {
          return { ...t, status: destination.droppableId };
        }
        return t;
      });
      
      setTickets(updatedTickets);

      // จำลองการยิงแจ้งเตือน LINE
      if (destination.droppableId === 'IN_PROGRESS') {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'info',
          title: 'แจ้งลูกบ้านแล้ว: กำลังดำเนินการซ่อม!',
          showConfirmButton: false, timer: 3000,
          customClass: { popup: 'rounded-2xl' }
        });
      } else if (destination.droppableId === 'RESOLVED') {
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'ปิดงาน! แจ้งลูกบ้านเรียบร้อย',
          showConfirmButton: false, timer: 3000,
          customClass: { popup: 'rounded-2xl' }
        });
      }
    }
  };

  if (!isMounted) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen font-sans w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ==========================================
            1. WIDGETS (3 การ์ดสถานะด่วน)
            ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-[160px]">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="text-slate-500 font-bold text-sm">ประกาศที่กำลังทำงาน</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-slate-800">{news.length}</span>
                  <span className="text-sm font-medium text-slate-400">รายการ</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Megaphone size={24} />
              </div>
            </div>
            <button className="w-full py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 relative z-10 active:scale-95">
              <Plus size={16} /> สร้างประกาศด่วน
            </button>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-[2rem] shadow-sm border border-rose-100 flex flex-col justify-center relative overflow-hidden h-[160px]">
            <div className="absolute -right-4 -bottom-4 text-rose-500 opacity-5">
              <AlertCircle size={120} />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-rose-600 font-bold text-sm">แจ้งซ่อมรอดำเนินการ</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-6xl font-black text-rose-600 tracking-tighter">
                    {tickets.filter(t => t.status === 'NEW').length}
                  </span>
                  <span className="text-sm font-bold text-rose-400">คิวงาน</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white text-rose-500 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Wrench size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center h-[160px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-bold text-sm">ซ่อมเสร็จแล้วเดือนนี้</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-slate-800">
                    {tickets.filter(t => t.status === 'RESOLVED').length}
                  </span>
                  <span className="text-sm font-medium text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 size={14} /> เยี่ยมมาก!
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            2. NEWS FEED (ระบบข่าวประกาศ)
            ========================================== */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Megaphone className="text-indigo-600 shrink-0" size={24} /> กระดานข่าวสาร (News Feed)
            </h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 shrink-0">Template ด่วน:</span>
              <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors shrink-0 active:scale-95">
                <Zap size={14} /> ไฟดับ
              </button>
              <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shrink-0 active:scale-95">
                <Droplets size={14} /> น้ำไม่ไหล
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.map((n) => (
              <div key={n.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide ${n.color}`}>
                      {n.tag}
                    </span>
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={18}/></button>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm leading-relaxed line-clamp-2 mb-2">
                    {n.title}
                  </h3>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Clock size={12} /> {n.date}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    {n.lineStatus === 'PUSHED' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <Send size={10} /> ส่ง LINE แล้ว
                      </span>
                    ) : n.lineStatus === 'PUBLISHED' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        <CheckCircle2 size={10} /> โพสต์ลงบอร์ด
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        ฉบับร่าง
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==========================================
            3. REPAIR HELPDESK (Kanban Board ลากวางได้)
            ========================================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Wrench className="text-rose-500 shrink-0" size={24} /> ระบบรับเรื่องแจ้งซ่อม (Helpdesk)
            </h2>
            <p className="text-xs font-bold text-slate-400 hidden sm:block bg-slate-200 px-3 py-1 rounded-full">ลากการ์ดเพื่ออัปเดตสถานะ (Drag & Drop)</p>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-start">
              
              {/* คอลัมน์ที่ 1: รอดำเนินการ */}
              <Droppable droppableId="NEW">
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className={`p-3 sm:p-4 rounded-[2rem] flex flex-col gap-3 min-h-[400px] transition-colors ${snapshot.isDraggingOver ? 'bg-rose-50 border-2 border-dashed border-rose-200' : 'bg-slate-100/60 border-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-rose-500"></span> รอดำเนินการ (New)
                      </h3>
                      <span className="bg-white text-slate-500 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                        {tickets.filter(t => t.status === 'NEW').length}
                      </span>
                    </div>
                    
                    {tickets.filter(t => t.status === 'NEW').map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-2xl border ${snapshot.isDragging ? 'shadow-2xl border-rose-400 rotate-2' : 'shadow-sm border-slate-100 hover:border-rose-300'}`}
                          >
                            <div className="flex gap-3">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200">
                                <ImageIcon className="text-slate-300" size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-lg sm:text-xl font-black text-rose-600 leading-none mb-1 block truncate">🏠 {ticket.houseNo}</span>
                                <p className="text-xs font-bold text-slate-600 leading-snug line-clamp-2">{ticket.issue}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                              <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><Clock size={12}/> {ticket.time}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* คอลัมน์ที่ 2: กำลังซ่อมแซม */}
              <Droppable droppableId="IN_PROGRESS">
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className={`p-3 sm:p-4 rounded-[2rem] flex flex-col gap-3 min-h-[400px] transition-colors ${snapshot.isDraggingOver ? 'bg-amber-50 border-2 border-dashed border-amber-200' : 'bg-slate-100/60 border-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-amber-400"></span> กำลังซ่อมแซม
                      </h3>
                      <span className="bg-white text-slate-500 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                        {tickets.filter(t => t.status === 'IN_PROGRESS').length}
                      </span>
                    </div>
                    
                    {tickets.filter(t => t.status === 'IN_PROGRESS').map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-2xl border ${snapshot.isDragging ? 'shadow-2xl border-amber-400 rotate-2' : 'shadow-sm border-amber-200'}`}
                          >
                            <div className="flex gap-3">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200">
                                <ImageIcon className="text-slate-300" size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-lg sm:text-xl font-black text-amber-600 leading-none mb-1 block truncate">🏠 {ticket.houseNo}</span>
                                <p className="text-xs font-bold text-slate-600 leading-snug line-clamp-2">{ticket.issue}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Wrench size={12}/> ช่างกำลังดำเนินการ</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* คอลัมน์ที่ 3: เสร็จสิ้นแล้ว */}
              <Droppable droppableId="RESOLVED">
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className={`p-3 sm:p-4 rounded-[2rem] flex flex-col gap-3 min-h-[400px] transition-colors ${snapshot.isDraggingOver ? 'bg-emerald-50 border-2 border-dashed border-emerald-200' : 'bg-slate-100/60 border-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> เสร็จสิ้นแล้ว
                      </h3>
                      <span className="bg-white text-slate-500 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                         {tickets.filter(t => t.status === 'RESOLVED').length}
                      </span>
                    </div>

                    {tickets.filter(t => t.status === 'RESOLVED').map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-2xl border ${snapshot.isDragging ? 'shadow-2xl border-emerald-400 rotate-2 opacity-100' : 'shadow-sm border-slate-100 opacity-60 hover:opacity-100 transition-opacity'}`}
                          >
                            <div className="flex gap-3 items-center">
                               <span className="text-lg font-black text-slate-500 shrink-0">🏠 {ticket.houseNo}</span>
                               <p className="text-xs font-bold text-slate-500 truncate flex-1">{ticket.issue}</p>
                               <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

            </div>
          </DragDropContext>
        </section>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}