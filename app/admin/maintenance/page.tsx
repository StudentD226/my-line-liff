'use client';
import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Clock, Wrench, Info, XCircle, Home } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AdminMaintenanceManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // 🌟 พระเอกมาแล้ว! เติม { cache: 'no-store' } เพื่อให้ตารางแจ้งซ่อมดึงข้อมูลสดใหม่เสมอ
      const res = await fetch('/api/admin/maintenance', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string, lineId: string) => {
    const { value: text, isConfirmed } = await Swal.fire({
      title: 'อัปเดตสถานะและแจ้งลูกบ้าน',
      input: 'textarea',
      inputPlaceholder: 'ระบุข้อความที่จะส่งไปใน LINE ลูกบ้าน (เว้นว่างได้)...',
      showCancelButton: true,
      confirmButtonText: 'อัปเดตสถานะ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0f766e',
      customClass: { 
        popup: 'rounded-3xl w-auto max-w-[90vw]', 
        input: 'rounded-xl border-slate-200 focus:ring-teal-600 focus:border-teal-600',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0', 
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      }
    });

    if (isConfirmed) {
      try {
        // ⚠️ ตรงนี้เป็น PATCH (ส่งข้อมูล) ไม่ต้องใส่ no-store ถูกต้องแล้วครับ!
        const res = await fetch('/api/admin/maintenance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus, adminNote: text, lineId })
        });
        
        if (res.ok) {
          Swal.fire({ 
            icon: 'success', 
            title: 'อัปเดตสำเร็จ', 
            text: 'แจ้งเตือนลูกบ้านเข้า LINE เรียบร้อย', 
            showConfirmButton: false, 
            timer: 1500, 
            customClass: { popup: 'rounded-3xl w-auto max-w-[90vw]' } 
          });
          fetchRequests(); // โหลดข้อมูลใหม่ทันทีหลังอัปเดตเสร็จ
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถอัปเดตสถานะได้',
          customClass: { popup: 'rounded-3xl w-auto max-w-[90vw]', confirmButton: 'rounded-xl font-bold px-6 py-2.5' }
        });
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600 mb-4"></div>
      <span className="text-teal-600 font-bold text-lg">กำลังโหลดข้อมูล...</span>
    </div>
  );

  return (
    /* 🌟 ปรับ Padding ให้ลดลงบนมือถือ */
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50 min-h-screen font-sans w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 w-full">
        
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-2 sm:gap-3">
          <ShieldAlert className="text-teal-600 shrink-0" size={32} /> จัดการศูนย์รับเรื่อง
        </h1>

        <div className="grid gap-4 sm:gap-5 w-full">
          {requests.length === 0 && (
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] text-center border border-slate-100 shadow-sm w-full">
              <p className="text-slate-500 font-bold text-base sm:text-lg">ยังไม่มีรายการรับเรื่อง</p>
            </div>
          )}
          {requests.map((item) => (
            <div key={item.id} className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-5 sm:gap-6 hover:shadow-lg transition-all w-full">
              
              <div className="space-y-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap ${item.type === 'REPAIR' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.type === 'REPAIR' ? <Wrench size={14} className="shrink-0" /> : <Info size={14} className="shrink-0" />} 
                    {item.type === 'REPAIR' ? 'แจ้งซ่อม' : 'แจ้งเพื่อทราบ'}
                  </span>
                  <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' : item.status === 'CANCELED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status === 'PENDING' ? 'รอตรวจสอบ' : item.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : item.status === 'COMPLETED' ? 'แก้ไขเสร็จสิ้น' : 'ยกเลิก'}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg shrink-0">#{item.ticketNo}</span>
                </div>
                
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-slate-800 mb-2 truncate">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold text-slate-500">
                    <span className="flex items-center gap-1 whitespace-nowrap"><Home size={16} className="text-teal-600 shrink-0"/> บ้านเลขที่ {item.house?.houseNo || '-'}</span>
                    <span className="text-slate-300 hidden sm:inline">|</span>
                    <span className="break-words">📍 {item.location}</span>
                  </div>
                </div>
                
                <div className="p-3 sm:p-4 bg-slate-50 rounded-2xl text-xs sm:text-sm font-medium text-slate-600 border border-slate-100 leading-relaxed break-words">
                  {item.description}
                </div>
              </div>
              
              {/* 🌟 ปรับปุ่มให้เรียงแนวตั้งบนจอมือถือเล็ก เพื่อป้องกันปุ่มบีบกันจนตัวหนังสือเบียด */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                {item.status !== 'COMPLETED' && item.status !== 'CANCELED' && (
                  <>
                    <button onClick={() => updateStatus(item.id, 'IN_PROGRESS', item.lineId)} className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 md:px-6 bg-white border-2 border-orange-100 text-orange-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-orange-50 transition active:scale-95 whitespace-nowrap w-full">
                      <Clock size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" /> กำลังดำเนินการ
                    </button>
                    <button onClick={() => updateStatus(item.id, 'COMPLETED', item.lineId)} className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 md:px-6 bg-teal-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-teal-700 shadow-md shadow-teal-600/20 transition active:scale-95 whitespace-nowrap w-full">
                      <CheckCircle size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" /> ปิดงาน/แก้ไขเสร็จ
                    </button>
                  </>
                )}
                {item.status === 'PENDING' && (
                  <button onClick={() => updateStatus(item.id, 'CANCELED', item.lineId)} className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 md:px-6 bg-white border-2 border-rose-100 text-rose-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-rose-50 transition active:scale-95 whitespace-nowrap w-full">
                    <XCircle size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" /> รับทราบ/ยกเลิก
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}