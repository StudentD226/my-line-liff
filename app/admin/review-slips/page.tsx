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
        text: 'ระบบจะนำยอดนี้ไปหักลบหนี้ที่เก่าที่สุดของบ้านนี้อัตโนมัติ',
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
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#376B64] rounded-full animate-spin"></div>
        <p className="text-[#376B64] font-bold tracking-wide animate-pulse">กำลังโหลดข้อมูลสลิป...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 relative">
      
      {/* 🌟 Header สว่าง คลีนๆ เอาสีดำทึบออก */}
      <div className="bg-[#376B64] px-6 pt-10 pb-16 text-white shadow-md rounded-b-[2rem]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-white" size={32} /> ระบบตรวจสลิป
            </h1>
            <p className="text-sm text-white/80 mt-2 font-medium flex items-center gap-2">
              รายการรอตรวจสอบทั้งหมด <span className="px-3 py-0.5 bg-white text-[#376B64] rounded-full font-bold shadow-sm">{invoices.length} รายการ</span>
            </p>
          </div>
          <Link href="/admin/invoices" className="flex items-center gap-2 bg-black/10 hover:bg-black/20 transition-all px-5 py-2.5 rounded-xl border border-white/20 text-sm font-bold active:scale-95">
            <ArrowLeft size={18} /> กลับหน้ารวมบิล
          </Link>
        </div>
      </div>

      {/* 🌟 Content Area */}
      <div className="p-4 md:p-6 space-y-6 -mt-10 relative z-10 max-w-6xl mx-auto">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 flex flex-col items-center justify-center text-center shadow-sm border border-slate-200 min-h-[40vh]">
            <div className="w-24 h-24 bg-[#376B64]/10 text-[#376B64] rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={48} strokeWidth={2} />
            </div>
            <p className="text-2xl font-black text-slate-800 mb-2 tracking-tight">ไม่มีสลิปรอตรวจสอบ</p>
            <p className="text-slate-500 font-medium">ยอดเยี่ยมมาก! คุณดำเนินการตรวจสอบสลิปครบหมดแล้ว</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                
                {/* Card Header */}
                <div className="bg-amber-50/50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Clock size={16} strokeWidth={2.5} />
                    <span className="text-sm font-bold">รอตรวจสอบ</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">REF: {invoice.invoiceNo}</span>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col sm:flex-row gap-6 flex-1">
                  
                  {/* Left: Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-slate-50 text-[#376B64] rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-200">
                        <Home size={26} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-0.5">บ้านเลขที่</p>
                        <p className="text-3xl font-black text-slate-800 leading-none">{invoice.house?.houseNo || 'ไม่ระบุ'}</p>
                      </div>
                    </div>
                    
                    {/* 🌟 แสดงเปรียบเทียบยอดโอน vs ยอดหนี้จริง */}
                    <div className="space-y-3 pt-3">
                      <div className="flex justify-between items-center bg-[#EBF5FB] p-4 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 text-[#0369A1]">
                          <Wallet size={18} />
                          <span className="text-xs font-bold">ยอดแจ้งโอน (สลิป)</span>
                        </div>
                        <span className="text-lg font-black text-[#0369A1]">{(invoice.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                      </div>

                      <div className="flex justify-between items-center bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <div className="flex items-center gap-2 text-rose-600">
                          <AlertCircle size={18} />
                          <span className="text-xs font-bold">ยอดค้างจริงทั้งหมด</span>
                        </div>
                        <span className="text-lg font-black text-rose-600">{(invoice.totalDebt || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-slate-500 font-bold mb-1">วันที่และเวลาที่โอน (ตามที่ลูกบ้านระบุ)</p>
                      <p className="text-sm font-bold text-slate-800">{invoice.transferDate} • {invoice.transferTime} น.</p>
                    </div>
                  </div>

                  {/* Right: Slip Image */}
                  <div className="w-full sm:w-[160px] flex-shrink-0 flex flex-col gap-2">
                    <p className="text-xs text-slate-500 font-bold text-center sm:text-left mb-1">หลักฐานการโอน</p>
                    {invoice.slipUrl ? (
                      <div 
                        onClick={() => setZoomedImage(invoice.slipUrl)}
                        className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 cursor-zoom-in relative bg-slate-50 group"
                      >
                        <img src={invoice.slipUrl} alt="Slip" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-[3/4] bg-slate-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-400">
                        <ImageIcon size={32} className="mb-2 opacity-40" />
                        <p className="text-xs font-bold">ไม่มีสลิป</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer (Actions) */}
                <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleUpdateStatus(invoice.id, 'REJECTED')}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <XCircle size={18} strokeWidth={2.5} /> ปฏิเสธสลิป
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-[#376B64] hover:bg-[#2d5a52] active:scale-95 transition-all disabled:opacity-50"
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

      {/* 🌟 Lightbox Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={zoomedImage} alt="Zoomed Slip" className="max-w-full max-h-[90vh] mx-auto object-contain rounded-xl" />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white text-slate-800 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}