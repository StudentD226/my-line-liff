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
      customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
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
          Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ', text: 'แจ้งเตือนลูกบ้านเข้า LINE เรียบร้อย', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-3xl' } });
          fetchRequests(); // โหลดข้อมูลใหม่ทันทีหลังอัปเดตเสร็จ
        }
      } catch (err) {
        Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
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
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <ShieldAlert className="text-teal-600" size={36} /> จัดการศูนย์รับเรื่อง
        </h1>

        <div className="grid gap-5">
          {requests.length === 0 && (
            <div className="bg-white p-10 rounded-[2rem] text-center border border-slate-100 shadow-sm">
              <p className="text-slate-500 font-bold text-lg">ยังไม่มีรายการรับเรื่อง</p>
            </div>
          )}
          {requests.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-6 hover:shadow-lg transition-all">
              
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${item.type === 'REPAIR' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.type === 'REPAIR' ? <Wrench size={14}/> : <Info size={14}/>} 
                    {item.type === 'REPAIR' ? 'แจ้งซ่อม' : 'แจ้งเพื่อทราบ'}
                  </span>
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' : item.status === 'CANCELED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status === 'PENDING' ? 'รอตรวจสอบ' : item.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : item.status === 'COMPLETED' ? 'แก้ไขเสร็จสิ้น' : 'ยกเลิก'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">#{item.ticketNo}</span>
                </div>
                
                <div>
                  <h3 className="font-black text-xl text-slate-800 mb-2">{item.title}</h3>
                  <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><Home size={16} className="text-teal-600"/> บ้านเลขที่ {item.house?.houseNo || '-'}</span>
                    <span className="text-slate-300">|</span>
                    <span>📍 {item.location}</span>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl text-sm font-medium text-slate-600 border border-slate-100 leading-relaxed">
                  {item.description}
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col gap-2">
                {item.status !== 'COMPLETED' && item.status !== 'CANCELED' && (
                  <>
                    <button onClick={() => updateStatus(item.id, 'IN_PROGRESS', item.lineId)} className="flex-1 flex items-center justify-center gap-2 py-3.5 md:px-6 bg-white border-2 border-orange-100 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-50 transition active:scale-95">
                      <Clock size={18} /> กำลังดำเนินการ
                    </button>
                    <button onClick={() => updateStatus(item.id, 'COMPLETED', item.lineId)} className="flex-1 flex items-center justify-center gap-2 py-3.5 md:px-6 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 shadow-md shadow-teal-600/20 transition active:scale-95">
                      <CheckCircle size={18} /> ปิดงาน/แก้ไขเสร็จ
                    </button>
                  </>
                )}
                {item.status === 'PENDING' && (
                  <button onClick={() => updateStatus(item.id, 'CANCELED', item.lineId)} className="flex-1 flex items-center justify-center gap-2 py-3.5 md:px-6 bg-white border-2 border-rose-100 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 transition active:scale-95">
                    <XCircle size={18} /> รับทราบ/ยกเลิก
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