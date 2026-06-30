'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, CheckCircle, XCircle, ZoomIn, 
  Clock, Home, Wallet, ShieldAlert, Check, Image as ImageIcon, AlertCircle,
  ChevronDown, X, History
} from 'lucide-react';

// --- Components ---
// 🌟 Custom Dropdown กำจัด Native OS Select อย่างสมบูรณ์
const CustomDropdown = ({ value, options, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex items-center justify-between px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#376B64]/20 focus:border-[#376B64] transition-all"
      >
        <span className={`block truncate text-sm font-bold ${!selectedOption ? 'text-slate-400' : 'text-slate-700'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
          {options.map((opt: any, idx: number) => (
            <button
              key={idx}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-50 ${value === opt.value ? 'bg-[#376B64]/10 font-bold text-[#376B64]' : 'text-slate-700 font-medium'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Page ---
export default function AdminInvoiceReview() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN';

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Modal States
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const REJECT_OPTIONS = useMemo(() => [
    { label: 'จำนวนเงินไม่ถูกต้องตามยอดเรียกเก็บ', value: 'จำนวนเงินไม่ถูกต้องตามยอดเรียกเก็บ' },
    { label: 'ภาพหลักฐานไม่ชัดเจนหรือไม่สามารถตรวจสอบได้', value: 'ภาพหลักฐานไม่ชัดเจนหรือไม่สามารถตรวจสอบได้' },
    { label: 'หลักฐานการโอนเงินซ้ำซ้อนในระบบ', value: 'หลักฐานการโอนเงินซ้ำซ้อนในระบบ' },
    { label: 'บัญชีปลายทางไม่ถูกต้อง', value: 'บัญชีปลายทางไม่ถูกต้อง' },
    { label: 'วันและเวลาดำเนินการไม่สอดคล้องกับหลักฐาน', value: 'วันและเวลาดำเนินการไม่สอดคล้องกับหลักฐาน' },
    { label: 'เหตุผลอื่นๆ (กรุณาติดต่อผู้ดูแลระบบ)', value: 'เหตุผลอื่นๆ (กรุณาติดต่อผู้ดูแลระบบ)' }
  ], []);

  const fetchPendingInvoices = useCallback(async () => {
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
        title: 'เกิดข้อผิดพลาดในการดึงข้อมูล', 
        text: 'ระบบไม่สามารถประมวลผลข้อมูลหลักฐานการโอนเงินได้ในขณะนี้',
        showCloseButton: true,
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPendingInvoices(); }, [fetchPendingInvoices]);

  const submitUpdateStatus = useCallback(async (invoiceId: string, newStatus: string, reason: string = '') => {
    setProcessingId(invoiceId);
    setRejectModalOpen(false);
    setApproveModalOpen(false);
    
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
          title: 'ดำเนินการเสร็จสิ้น', 
          text: newStatus === 'PAID' ? 'ระบบได้ทำการบันทึกและปรับยอดชำระเงินเรียบร้อยแล้ว' : 'ระบบได้ทำการปฏิเสธรายการและแจ้งผู้พักอาศัยเรียบร้อยแล้ว',
          timer: 2500, 
          showCloseButton: true,
          showConfirmButton: false, 
          customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]' }
        });
        fetchPendingInvoices(); 
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'ระบบขัดข้อง', 
        text: error.message || 'กรุณาลองดำเนินการใหม่อีกครั้ง',
        showCloseButton: true,
        confirmButtonColor: '#E11D48',
        customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } 
      });
    } finally {
      setProcessingId(null);
      setTargetInvoiceId(null);
      setRejectReason('');
    }
  }, [fetchPendingInvoices]);

  const openApproveModal = useCallback((id: string) => {
    setTargetInvoiceId(id);
    setApproveModalOpen(true);
  }, []);

  const openRejectModal = useCallback((id: string) => {
    setTargetInvoiceId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#376B64] rounded-full animate-spin"></div>
        <p className="text-[#376B64] font-bold tracking-wide animate-pulse">กำลังประมวลผลข้อมูลหลักฐาน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 relative overflow-x-hidden">
      
      <div className="bg-[#376B64] px-4 sm:px-6 pt-10 pb-16 text-white shadow-md rounded-b-[2rem]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-5 w-full">
          <div className="w-full md:w-auto">
            <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 sm:gap-3">
              <ShieldAlert className="text-white shrink-0" size={28} /> การตรวจสอบหลักฐานการชำระเงิน
            </h1>
            <p className="text-xs text-white/80 mt-1 font-medium flex items-center gap-2">
              รายการรอดำเนินการ <span className="px-2 py-0.5 bg-white text-[#376B64] rounded-full font-bold shadow-sm">{invoices.length}</span>
            </p>
          </div>
          
          <div className="flex flex-row items-center gap-2 w-full md:w-auto">
            {/* 🌟 แสดงปุ่มนี้เฉพาะ SuperAdmin เพื่อรองรับ RBAC Requirement 3 */}
            {isSuperAdmin && (
              <button className="flex-1 sm:flex-none items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-all px-4 py-2.5 rounded-xl border border-white/20 text-xs font-bold active:scale-95 flex">
                <History size={16} /> ประวัติระบบ
              </button>
            )}
            <Link href="/admin/invoices" className="flex-1 sm:flex-none items-center justify-center gap-2 bg-black/20 hover:bg-black/30 transition-all px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold active:scale-95 flex">
              <ArrowLeft size={16} /> ย้อนกลับ
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 -mt-10 relative z-10 max-w-5xl mx-auto w-full">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-[1.5rem] p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-sm border border-slate-200 min-h-[30vh]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#376B64]/10 text-[#376B64] rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="sm:w-10 sm:h-10" strokeWidth={2} />
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-800 mb-1 tracking-tight">ไม่มีหลักฐานรอดำเนินการ</p>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">การดำเนินการเสร็จสิ้น ระบบไม่พบรายการสลิปที่รอการตรวจสอบ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full hover:shadow-md transition-shadow">
                
                <div className="bg-amber-50/50 px-4 py-3 border-b border-amber-100 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <Clock size={14} strokeWidth={2.5} className="shrink-0" />
                    <span className="text-xs font-bold">รอการตรวจสอบ</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate ml-2">เลขอ้างอิง: {invoice.invoiceNo.slice(-6)}</span>
                </div>

                <div className="p-4 flex flex-col gap-4 flex-1">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 shrink-0 bg-white text-[#376B64] rounded-xl flex items-center justify-center shadow-sm">
                      <Home size={20} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 font-bold mb-0.5">หน่วยอ้างอิง</p>
                      <p className="text-lg font-black text-slate-800 leading-none truncate">{invoice.house?.houseNo || 'ไม่ระบุข้อมูล'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center bg-rose-50 px-3 py-2.5 rounded-xl border border-rose-100 gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5 text-rose-600 shrink-0">
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="text-[11px] font-bold">ยอดหนี้ค้างชำระสะสม</span>
                      </div>
                      <span className="text-sm font-black text-rose-600 truncate break-all">{(invoice.totalDebt || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center bg-[#EBF5FB] px-3 py-2.5 rounded-xl border border-blue-100 shadow-inner gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5 text-[#0369A1] shrink-0">
                        <Wallet size={14} className="shrink-0" />
                        <span className="text-[11px] font-bold">ยอดดำเนินการ (หลักฐาน)</span>
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
                          <img src={invoice.slipUrl} alt="Document" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-[3/4] bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-dashed border-slate-300 text-slate-400">
                          <ImageIcon size={20} className="mb-1 opacity-50" />
                          <p className="text-[9px] font-bold">ไม่พบเอกสาร</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-end pb-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold mb-0.5 truncate">วันที่ระบุการโอน</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 truncate">{invoice.transferDate}</p>
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">เวลา {invoice.transferTime} น.</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/50">
                  <button 
                    onClick={() => openRejectModal(invoice.id)}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 active:scale-95 transition-all disabled:opacity-50 shadow-sm px-1 sm:px-0"
                  >
                    <XCircle size={14} strokeWidth={2.5} className="shrink-0" /> ปฏิเสธรายการ
                  </button>
                  <button 
                    onClick={() => openApproveModal(invoice.id)}
                    disabled={processingId !== null}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs text-white bg-[#376B64] hover:bg-[#2A524C] active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-[#376B64]/20 px-1 sm:px-0"
                  >
                    {processingId === invoice.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></div>
                    ) : (
                      <Check size={14} strokeWidth={3} className="shrink-0" />
                    )}
                    ยืนยันตรวจสอบ
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🌟 Modal 1: ปฏิเสธสลิป (Custom UI ไม่พึ่ง Native OS) */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200 border border-slate-100">
            <button onClick={() => setRejectModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10">
              <X size={20} />
            </button>
            <div className="p-6 md:p-8">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-5 mx-auto">
                <XCircle size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-black text-slate-800 text-center mb-2">ปฏิเสธรายการแจ้งชำระเงิน</h2>
              <p className="text-sm text-slate-500 text-center mb-6">กรุณาระบุสาเหตุการปฏิเสธเพื่อแจ้งให้ผู้พักอาศัยทราบ</p>
              
              <CustomDropdown 
                value={rejectReason} 
                options={REJECT_OPTIONS} 
                onChange={setRejectReason} 
                placeholder="คลิกเพื่อเลือกสาเหตุ..." 
              />

              <div className="flex gap-3 mt-8">
                {/* 🌟 ปุ่มยืนยันอยู่ซ้ายเสมอ */}
                <button 
                  onClick={() => submitUpdateStatus(targetInvoiceId!, 'REJECTED', rejectReason)}
                  disabled={!rejectReason}
                  className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ยืนยันการปฏิเสธ
                </button>
                {/* 🌟 ปุ่มยกเลิกอยู่ขวาเสมอ */}
                <button 
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                >
                  ยกเลิกรายการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal 2: ยืนยันสลิป */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200 border border-slate-100">
            <button onClick={() => setApproveModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10">
              <X size={20} />
            </button>
            <div className="p-6 md:p-8">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5 mx-auto">
                <CheckCircle size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-black text-slate-800 text-center mb-2">ยืนยันความถูกต้องของยอดชำระ</h2>
              <p className="text-sm text-slate-500 text-center mb-8">ระบบจะดำเนินการหักยอดชำระนี้กับรายการค้างชำระที่เก่าที่สุดโดยอัตโนมัติ</p>
              
              <div className="flex gap-3">
                {/* 🌟 ปุ่มยืนยันอยู่ซ้ายเสมอ ใช้สีธีมหลัก */}
                <button 
                  onClick={() => submitUpdateStatus(targetInvoiceId!, 'PAID')}
                  className="flex-1 py-3.5 bg-[#376B64] hover:bg-[#2A524C] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] text-sm"
                >
                  ยืนยันการตรวจสอบ
                </button>
                {/* 🌟 ปุ่มยกเลิกอยู่ขวาเสมอ */}
                <button 
                  onClick={() => setApproveModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                >
                  ยกเลิกรายการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-sm w-full px-2 sm:px-0" onClick={(e) => e.stopPropagation()}>
            <img src={zoomedImage} alt="Zoomed Document" className="max-w-full max-h-[85vh] mx-auto object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 sm:-top-4 sm:-right-4 w-10 h-10 bg-white text-slate-800 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center shadow-xl transition-all z-10"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}