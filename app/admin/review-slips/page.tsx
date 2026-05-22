'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, SearchX, CheckCircle, XCircle, ZoomIn, 
  Clock, Home, CalendarDays, Wallet, ShieldAlert, Check, Image as ImageIcon
} from 'lucide-react';

export default function AdminInvoiceReview() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingInvoices();
  }, []);

  const fetchPendingInvoices = async () => {
    try {
      const res = await fetch('/api/admin/review-slips');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error("Fetch Invoices Error:", error);
      Swal.fire({ 
        icon: 'error', 
        title: 'ดึงข้อมูลล้มเหลว', 
        text: 'ไม่สามารถโหลดข้อมูลสลิปได้', 
        customClass: { popup: 'rounded-3xl' } 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    let reason = '';

    if (newStatus === 'REJECTED') {
      const { value, isConfirmed } = await Swal.fire({
        title: 'ปฏิเสธสลิป',
        text: 'กรุณาระบุเหตุผลเพื่อให้ลูกบ้านทราบ',
        icon: 'warning',
        input: 'select',
        inputOptions: {
          'ยอดเงินไม่ถูกต้อง': 'ยอดเงินไม่ถูกต้อง',
          'รูปสลิปเบลอ/อ่านไม่ออก': 'รูปสลิปเบลอ/อ่านไม่ออก',
          'สลิปซ้ำ/เคยใช้งานแล้ว': 'สลิปซ้ำ/เคยใช้งานแล้ว',
          'โอนผิดบัญชี': 'โอนผิดบัญชี',
          'วันที่/เวลาโอนไม่สอดคล้อง': 'วันที่/เวลาโอนไม่สอดคล้อง',
          'อื่นๆ': 'อื่นๆ (กรุณาติดต่อแอดมิน)'
        },
        inputPlaceholder: 'เลือกเหตุผล...',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'ยืนยันการปฏิเสธ',
        cancelButtonText: 'ยกเลิก',
        customClass: { 
          popup: 'rounded-[2rem]', 
          confirmButton: 'rounded-xl font-bold px-6', 
          cancelButton: 'rounded-xl font-bold px-6' 
        }
      });

      if (!isConfirmed) return;
      reason = value;
    } else {
      const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันยอดเงิน?',
        text: 'ตรวจสอบความถูกต้องของสลิปเรียบร้อยแล้วใช่หรือไม่',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0f766e',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'ใช่, ยืนยันยอดนี้',
        cancelButtonText: 'ยกเลิก',
        customClass: { 
          popup: 'rounded-[2rem]', 
          confirmButton: 'rounded-xl font-bold px-6', 
          cancelButton: 'rounded-xl font-bold px-6' 
        }
      });

      if (!isConfirmed) return;
    }
    
    setProcessingId(invoiceId);
    try {
      const res = await fetch('/api/admin/review-slips', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, status: newStatus, note: reason })
      });
      
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'อัปเดตสำเร็จ',
          text: newStatus === 'PAID' ? 'ยืนยันการชำระเงินเรียบร้อยแล้ว' : 'ปฏิเสธสลิปเรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' }
        });
        fetchPendingInvoices();
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: data.error, customClass: { popup: 'rounded-[2rem]' } });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'ระบบขัดข้อง', text: 'กรุณาลองใหม่อีกครั้ง', customClass: { popup: 'rounded-[2rem]' } });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
        <p className="text-teal-600 font-bold tracking-wide animate-pulse">กำลังโหลดข้อมูลสลิป...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 relative">
      
      {/* 🌟 Header แอดมิน */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-12 pb-12 text-white shadow-lg rounded-b-[2.5rem]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-teal-400" size={32} /> ระบบตรวจสลิป
            </h1>
            <p className="text-sm text-slate-300 mt-2 font-medium flex items-center gap-2">
              รายการรอตรวจสอบทั้งหมด <span className="px-3 py-0.5 bg-teal-500/20 text-teal-300 rounded-full font-bold">{invoices.length} รายการ</span>
            </p>
          </div>
          <Link href="/admin/invoices" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all px-5 py-2.5 rounded-xl backdrop-blur-md border border-white/10 text-sm font-bold active:scale-95 shadow-sm">
            <ArrowLeft size={18} /> กลับหน้ารวมบิล
          </Link>
        </div>
      </div>

      {/* 🌟 Content Area */}
      <div className="p-4 md:p-6 space-y-6 -mt-8 relative z-10 max-w-6xl mx-auto">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 flex flex-col items-center justify-center text-center shadow-sm border border-slate-100 min-h-[50vh] animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle size={48} strokeWidth={2} />
            </div>
            <p className="text-2xl font-black text-slate-800 mb-2 tracking-tight">ไม่มีสลิปรอตรวจสอบ</p>
            <p className="text-slate-500 font-medium">ยอดเยี่ยมมาก! คุณดำเนินการตรวจสอบสลิปครบหมดแล้ว</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
                
                {/* Card Header */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="bg-amber-100 text-amber-700 text-[11px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                      <Clock size={12} strokeWidth={3} /> รอตรวจสอบ
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">REF: {invoice.invoiceNo}</span>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col sm:flex-row gap-6 flex-1">
                  
                  {/* Left: Info */}
                  <div className="flex-1 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-100 shadow-sm">
                        <Home size={26} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">บ้านเลขที่</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{invoice.house?.houseNo || 'ไม่ระบุ'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <CalendarDays size={18} />
                          <span className="text-xs font-bold uppercase tracking-wide">ประจำเดือน</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">{invoice.billingMonth}/{invoice.billingYear + 543}</span>
                      </div>

                      <div className="flex justify-between items-center bg-teal-50 p-4 rounded-2xl border border-teal-100/50">
                        <div className="flex items-center gap-2.5 text-teal-700">
                          <Wallet size={18} />
                          <span className="text-xs font-bold uppercase tracking-wide">ยอดแจ้งโอน</span>
                        </div>
                        <span className="text-base font-black text-teal-700">{(invoice.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">วันที่และเวลาที่โอน</p>
                        <p className="text-sm font-bold text-slate-700">{invoice.transferDate} • <span className="text-slate-500">{invoice.transferTime} น.</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Slip Image */}
                  <div className="w-full sm:w-[150px] flex-shrink-0 flex flex-col gap-2">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest text-center sm:text-left mb-1">หลักฐานการโอน</p>
                    {invoice.slipUrl ? (
                      <div 
                        onClick={() => setZoomedImage(invoice.slipUrl)}
                        className="w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm cursor-zoom-in relative bg-slate-50"
                      >
                        <img src={invoice.slipUrl} alt="Slip" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-all duration-300 flex items-center justify-center backdrop-blur-[0px] group-hover:backdrop-blur-[2px]">
                          <ZoomIn className="text-white w-10 h-10 drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-50 group-hover:scale-100" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-[3/4] bg-slate-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-400">
                        <ImageIcon size={32} className="mb-2 opacity-40" />
                        <p className="text-xs font-bold">ไม่มีรูปสลิป</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer (Actions) */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 gap-3 mt-auto">
                  <button 
                    onClick={() => handleUpdateStatus(invoice.id, 'REJECTED')}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-rose-600 bg-white border-2 border-rose-100 hover:bg-rose-50 hover:border-rose-200 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <XCircle size={18} strokeWidth={2.5} /> ปฏิเสธสลิป
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"
                  >
                    {processingId === invoice.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Check size={18} strokeWidth={3} />
                    )}
                    ยืนยันยอดเงิน
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🌟 Lightbox Modal สำหรับซูมดูรูปสลิป */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-2xl w-full flex items-center justify-center animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage} 
              alt="Zoomed Slip" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
            />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-12 h-12 bg-white text-slate-800 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
            >
              <XCircle size={28} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}