'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, CheckCircle, XCircle, ZoomIn, 
  Clock, Home, Wallet, ShieldAlert, Check, Image as ImageIcon, AlertCircle
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
      const res = await fetch('/api/admin/review-slips', { cache: 'no-store' });
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
        customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]' } 
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
          popup: 'rounded-[2rem] w-auto max-w-[90vw]', 
          input: 'rounded-xl border-slate-200 focus:ring-rose-500 focus:border-rose-500 text-sm sm:text-base w-full',
          confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0', 
          cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
          actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
        }
      });

      if (!isConfirmed) return;
      reason = value;
    } else {
      const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันยอดเงิน?',
        text: 'ระบบจะนำยอดนี้ไปหักลบหนี้ที่เก่าที่สุดของบ้านนี้อัตโนมัติ',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0f766e',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'ใช่, ยืนยันยอดนี้',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        customClass: { 
          popup: 'rounded-[2rem] w-auto max-w-[90vw]', 
          confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0', 
          cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
          actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
        }
      });

      if (!isConfirmed) return;
    }
    
    setProcessingId(invoiceId);
    try {
      const res = await fetch('/api/admin/review-slips', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoiceId, status: newStatus, note: reason })
      });
      
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success', title: 'อัปเดตสำเร็จ', text: newStatus === 'PAID' ? 'ยืนยันการชำระเงินเรียบร้อยแล้ว' : 'ปฏิเสธสลิปเรียบร้อยแล้ว',
          timer: 2000, showConfirmButton: false, customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]' }
        });
        fetchPendingInvoices(); 
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: data.error, customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]' } });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'ระบบขัดข้อง', text: 'กรุณาลองใหม่อีกครั้ง', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]' } });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#376B64] rounded-full animate-spin"></div>
        <p className="text-[#376B64] font-bold tracking-wide animate-pulse">กำลังโหลดข้อมูลสลิป...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 relative overflow-x-hidden">
      <div className="bg-[#376B64] px-4 sm:px-6 pt-10 pb-16 text-white shadow-md rounded-b-[2rem]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-5 w-full">
          <div className="w-full md:w-auto">
            <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 sm:gap-3">
              <ShieldAlert className="text-white shrink-0" size={28} /> ตรวจสอบสลิปโอนเงิน
            </h1>
            <p className="text-xs text-white/80 mt-1 font-medium flex items-center gap-2">
              รายการรอตรวจสอบ <span className="px-2 py-0.5 bg-white text-[#376B64] rounded-full font-bold shadow-sm">{invoices.length}</span>
            </p>
          </div>
          <Link href="/admin/invoices" className="flex items-center gap-2 bg-black/10 hover:bg-black/20 transition-all px-4 py-2 rounded-xl border border-white/20 text-xs font-bold active:scale-95 w-full sm:w-auto justify-center md:justify-start">
            <ArrowLeft size={16} /> กลับ
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 -mt-10 relative z-10 max-w-5xl mx-auto w-full">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-[1.5rem] p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-sm border border-slate-200 min-h-[30vh]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#376B64]/10 text-[#376B64] rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="sm:w-10 sm:h-10" strokeWidth={2} />
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-800 mb-1 tracking-tight">ไม่มีสลิปรอตรวจสอบ</p>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">ยอดเยี่ยม! คุณตรวจสอบครบแล้ว</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full">
                
                <div className="bg-amber-50/50 px-4 py-3 border-b border-amber-100 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <Clock size={14} strokeWidth={2.5} className="shrink-0" />
                    <span className="text-xs font-bold">รอตรวจสอบ</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate ml-2">REF: {invoice.invoiceNo.slice(-6)}</span>
                </div>

                <div className="p-4 flex flex-col gap-4 flex-1">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 shrink-0 bg-white text-[#376B64] rounded-xl flex items-center justify-center shadow-sm">
                      <Home size={20} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 font-bold mb-0.5">บ้านเลขที่</p>
                      <p className="text-lg font-black text-slate-800 leading-none truncate">{invoice.house?.houseNo || 'ไม่ระบุ'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5 text-rose-600 shrink-0">
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="text-[11px] font-bold">ยอดค้างจริงทั้งหมด</span>
                      </div>
                      <span className="text-sm font-black text-rose-600 truncate break-all">{(invoice.totalDebt || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center bg-[#EBF5FB] px-3 py-2 rounded-xl border border-blue-100 shadow-inner gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5 text-[#0369A1] shrink-0">
                        <Wallet size={14} className="shrink-0" />
                        <span className="text-[11px] font-bold">ยอดโอน (ตามสลิป)</span>
                      </div>
                      <span className="text-base font-black text-[#0369A1] truncate break-all">{(invoice.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 pt-1">
                    <div className="w-[80px] sm:w-[90px] shrink-0">
                      {invoice.slipUrl ? (
                        <div 
                          onClick={() => setZoomedImage(invoice.slipUrl)}
                          className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in relative bg-slate-50 group shadow-sm"
                        >
                          <img src={invoice.slipUrl} alt="Slip" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-[3/4] bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-dashed border-slate-300 text-slate-400">
                          <ImageIcon size={20} className="mb-1 opacity-50" />
                          <p className="text-[9px] font-bold">ไม่มีรูป</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-end pb-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold mb-0.5 truncate">แจ้งโอนเมื่อ</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 truncate">{invoice.transferDate}</p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">{invoice.transferTime} น.</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/50">
                  <button 
                    onClick={() => handleUpdateStatus(invoice.id, 'REJECTED')}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all disabled:opacity-50 shadow-sm px-1 sm:px-0"
                  >
                    <XCircle size={14} strokeWidth={2.5} className="shrink-0" /> ปฏิเสธ
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs text-white bg-[#376B64] hover:bg-[#2d5a52] active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-[#376B64]/20 px-1 sm:px-0"
                  >
                    {processingId === invoice.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div>
                    ) : (
                      <Check size={14} strokeWidth={3} className="shrink-0" />
                    )}
                    ยืนยันยอด
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-sm w-full px-2 sm:px-0" onClick={(e) => e.stopPropagation()}>
            <img src={zoomedImage} alt="Zoomed Slip" className="max-w-full max-h-[85vh] mx-auto object-contain rounded-2xl shadow-2xl" />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute top-0 right-2 sm:-top-3 sm:-right-3 w-8 h-8 bg-white text-slate-800 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center shadow-lg transition-all z-10"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}