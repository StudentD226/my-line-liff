'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  Settings, Trash2, Plus, Edit, RefreshCw, Send, AlertCircle, Clock, 
  Search, Filter, CheckCircle2, Receipt, X, ChevronLeft, ChevronRight, ChevronDown 
} from 'lucide-react';
import Swal from 'sweetalert2';

// --- Types & Constants ---
type Role = 'SUPERADMIN' | 'JURISTIC';

const thaiMonths = [
  { num: 1, full: 'มกราคม', short: 'ม.ค.' },
  { num: 2, full: 'กุมภาพันธ์', short: 'ก.พ.' },
  { num: 3, full: 'มีนาคม', short: 'มี.ค.' },
  { num: 4, full: 'เมษายน', short: 'เม.ย.' },
  { num: 5, full: 'พฤษภาคม', short: 'พ.ค.' },
  { num: 6, full: 'มิถุนายน', short: 'มิ.ย.' },
  { num: 7, full: 'กรกฎาคม', short: 'ก.ค.' },
  { num: 8, full: 'สิงหาคม', short: 'ส.ค.' },
  { num: 9, full: 'กันยายน', short: 'ก.ย.' },
  { num: 10, full: 'ตุลาคม', short: 'ต.ค.' },
  { num: 11, full: 'พฤศจิกายน', short: 'พ.ย.' },
  { num: 12, full: 'ธันวาคม', short: 'ธ.ค.' },
];

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

// --- Components ---
const CustomDropdown = React.memo(({ 
  value, options, onChange, placeholder, icon: Icon, className 
}: { 
  value: string | number; 
  options: { label: string, value: string | number }[]; 
  onChange: (val: string | number) => void; 
  placeholder?: string; 
  icon?: any; 
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#376B64] shrink-0" size={16} />}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left flex items-center justify-between outline-none transition-all ${Icon ? 'pl-11' : 'pl-4'} pr-10 py-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 hover:border-[#376B64]/30 focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/10 cursor-pointer`}
      >
        <span className={`block truncate ${!selectedOption ? 'text-slate-400 font-medium text-sm' : 'text-slate-700 font-bold text-sm'}`}>
          {selectedOption ? selectedOption.label : (placeholder || "เลือกรายการ")}
        </span>
        <ChevronDown size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 ${String(value) === String(opt.value) ? 'bg-[#376B64]/5 font-bold text-[#376B64]' : 'text-slate-700 font-medium'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
CustomDropdown.displayName = "CustomDropdown";

// --- Main Page ---
export default function AdminInvoicesPage() {
  const currentUserRole: Role = 'SUPERADMIN'; 
  const isSuperAdmin = currentUserRole === 'SUPERADMIN';

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [targetHouseNo, setTargetHouseNo] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/all-invoices', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      if (data.success) {
        const sorted = data.invoices.sort((a: any, b: any) => {
          if (a.billingYear !== b.billingYear) return a.billingYear - b.billingYear;
          if (a.billingMonth !== b.billingMonth) return a.billingMonth - b.billingMonth;
          const hA = a.house?.houseNo || '';
          const hB = b.house?.houseNo || '';
          return hA.localeCompare(hB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setInvoices(sorted);
        setSelectedInvoices([]);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      Toast.fire({ icon: 'error', title: 'ไม่สามารถดึงข้อมูลใบแจ้งหนี้ได้' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.invoiceNo && inv.invoiceNo.startsWith('TR-')) return false;

      const matchHouse = inv.house?.houseNo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = filterMonth === 0 || inv.billingMonth === filterMonth;
      const matchYear = filterYear === 0 || inv.billingYear === filterYear;
      const matchStatus = filterStatus === 'ALL' || inv.status === filterStatus;
      return matchHouse && matchMonth && matchYear && matchStatus;
    });
  }, [invoices, searchTerm, filterMonth, filterYear, filterStatus]);

  const availableYears = useMemo(() => {
    return Array.from(new Set(invoices.map(inv => inv.billingYear))).sort((a, b) => b - a);
  }, [invoices]);

  const monthOptions = useMemo(() => [
    { label: 'ทุกเดือน', value: 0 },
    ...thaiMonths.map(m => ({ label: m.full, value: m.num }))
  ], []);

  const yearOptions = useMemo(() => [
    { label: 'ทุกปี', value: 0 },
    ...availableYears.map(y => ({ label: `พ.ศ. ${y + 543}`, value: y }))
  ], [availableYears]);

  const statusOptions = useMemo(() => [
    { label: 'ทุกสถานะ', value: 'ALL' },
    { label: 'รอชำระ (PENDING)', value: 'PENDING' },
    { label: 'ค้างชำระ (OVERDUE)', value: 'OVERDUE' },
    { label: 'แบ่งจ่าย (PARTIAL)', value: 'PARTIAL' },
    { label: 'รอตรวจสอบ (CHECKING)', value: 'CHECKING' },
    { label: 'ชำระแล้ว (PAID)', value: 'PAID' },
    { label: 'ถูกปฏิเสธ (REJECTED)', value: 'REJECTED' },
  ], []);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    else setSelectedInvoices([]);
  }, [filteredInvoices]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleCreateBillChoice = useCallback(() => {
    Swal.fire({
      title: 'สร้างใบแจ้งหนี้ใหม่',
      text: 'กรุณาเลือกรูปแบบการสร้างใบแจ้งหนี้',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      showCloseButton: true,
      reverseButtons: false, 
      confirmButtonText: 'สร้างให้ทุกยูนิต',
      denyButtonText: 'ระบุยูนิตเป้าหมาย',
      cancelButtonText: 'ยกเลิกการทำรายการ',
      confirmButtonColor: '#376B64',
      denyButtonColor: '#475569',
      cancelButtonColor: '#9CA3AF',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        denyButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
    }).then((result) => {
      if (result.isConfirmed) {
        setTargetHouseNo(null);
        setIsModalOpen(true);
      } else if (result.isDenied) {
        Swal.fire({
          title: 'ระบุบ้านเลขที่อ้างอิง',
          input: 'text',
          inputPlaceholder: 'ตัวอย่าง: 123/4',
          showCancelButton: true,
          showCloseButton: true,
          reverseButtons: false,
          confirmButtonText: 'ดำเนินการถัดไป',
          cancelButtonText: 'ยกเลิกการทำรายการ',
          confirmButtonColor: '#376B64',
          cancelButtonColor: '#9CA3AF',
          customClass: {
            popup: 'rounded-[2rem] w-auto max-w-[90vw]',
            input: 'rounded-xl border-slate-200 focus:ring-[#376B64] focus:border-[#376B64] outline-none px-4 py-3',
            confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
            cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
            actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
          },
          inputValidator: (value) => { if (!value) return 'กรุณาระบุข้อมูลอ้างอิงให้ครบถ้วน'; return null; },
        }).then((res) => {
          if (res.isConfirmed && res.value) {
            setTargetHouseNo(res.value);
            setIsModalOpen(true);
          }
        });
      }
    });
  }, []);

  const submitGenerateInvoices = useCallback(async () => {
    setIsModalOpen(false);
    Swal.fire({
      title: 'กำลังดำเนินการสร้างใบแจ้งหนี้',
      html: 'กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-[2rem]' },
    });

    try {
      const res = await fetch('/api/admin/generate-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear, houseNo: targetHouseNo }),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'ดำเนินการสำเร็จ',
          text: data.message,
          showCloseButton: true,
          confirmButtonColor: '#376B64',
          confirmButtonText: 'รับทราบ',
          customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
        });
        fetchInvoices();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถสร้างใบแจ้งหนี้ได้',
          text: data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ',
          showCloseButton: true,
          confirmButtonColor: '#E11D48',
          confirmButtonText: 'ปิดหน้านี้',
          customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
        });
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'ระบบเกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
        showCloseButton: true,
        confirmButtonColor: '#E11D48',
        confirmButtonText: 'ปิดหน้านี้',
        customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
      });
    }
  }, [selectedMonth, selectedYear, targetHouseNo, fetchInvoices]);

  const handleDelete = useCallback(async (singleId?: string) => {
    if (!isSuperAdmin) {
      Toast.fire({ icon: 'warning', title: 'สิทธิ์ไม่เพียงพอในการลบข้อมูล' });
      return;
    }

    const idsToDelete = singleId ? [singleId] : selectedInvoices;
    if (idsToDelete.length === 0) return;

    Swal.fire({
      title: 'ยืนยันการลบข้อมูล?',
      text: `ระบบจะดำเนินการลบใบแจ้งหนี้จำนวน ${idsToDelete.length} รายการ การกระทำนี้ไม่สามารถย้อนกลับได้`,
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิกรายการ',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังดำเนินการลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin/delete-invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idsToDelete }),
          }).then(r => r.json()).then(data => {
            if (data.success) {
              Toast.fire({ icon: 'success', title: `ลบข้อมูลสำเร็จจำนวน ${data.count} รายการ` });
              setSelectedInvoices([]);
              fetchInvoices();
            } else {
              Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการลบ' });
            }
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  }, [isSuperAdmin, selectedInvoices, fetchInvoices]);

  const handleNotify = useCallback(async (invoiceId: string, type: 'SEND' | 'REMINDER' | 'OVERDUE') => {
    const titles = { SEND: 'นำส่งใบแจ้งหนี้?', REMINDER: 'ส่งการแจ้งเตือนล่วงหน้า?', OVERDUE: 'ส่งการแจ้งเตือนยอดค้างชำระ?' };

    Swal.fire({
      title: titles[type],
      text: 'ข้อมูลจะถูกนำส่งไปยังบัญชี LINE ของผู้พักอาศัยโดยตรง',
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'ยืนยันการนำส่ง',
      cancelButtonText: 'ยกเลิกรายการ',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังนำส่งข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId, type }),
          }).then(r => r.json()).then(data => {
            if (data.success) {
              Toast.fire({ icon: 'success', title: 'จัดส่งการแจ้งเตือนสำเร็จ' });
              if (type === 'OVERDUE') fetchInvoices();
            } else {
              Swal.fire({ 
                icon: 'info', 
                title: 'ระบบไม่พร้อมใช้งาน', 
                text: 'ฟังก์ชันการแจ้งเตือนยังไม่ได้ตั้งค่าการเชื่อมต่อ API', 
                showCloseButton: true, 
                confirmButtonColor: '#376B64',
                confirmButtonText: 'รับทราบ', 
                customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } 
              });
            }
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการประมวลผลเครือข่าย' });
        }
      }
    });
  }, [fetchInvoices]);

  const handleBulkNotify = useCallback(async (type: 'SEND' | 'REMINDER' | 'OVERDUE') => {
    if (selectedInvoices.length === 0) return;
    const titles = { SEND: 'นำส่งใบแจ้งหนี้ทั้งหมด?', REMINDER: 'แจ้งเตือนล่วงหน้าทั้งหมด?', OVERDUE: 'แจ้งเตือนยอดค้างชำระทั้งหมด?' };

    Swal.fire({
      title: titles[type],
      text: `ระบบจะดำเนินการส่งข้อความไปยังผู้พักอาศัยจำนวน ${selectedInvoices.length} รายการ`,
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'ยืนยันการนำส่ง',
      cancelButtonText: 'ยกเลิกรายการ',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังนำส่งข้อมูล...', html: 'กรุณารอสักครู่ ห้ามปิดหรือรีเฟรชหน้าต่างนี้', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          await Promise.all(
            selectedInvoices.map(id =>
              fetch('/api/admin-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId: id, type }),
              }).then(r => r.json())
            )
          );
          Swal.fire({
            icon: 'success',
            title: 'ดำเนินการสำเร็จ',
            text: `การแจ้งเตือนถูกนำส่งจำนวน ${selectedInvoices.length} รายการเรียบร้อยแล้ว`,
            showCloseButton: true,
            confirmButtonColor: '#376B64',
            confirmButtonText: 'รับทราบ',
            customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
          });
          if (type === 'OVERDUE') fetchInvoices();
        } catch {
          Swal.fire({ icon: 'error', title: 'พบข้อผิดพลาด', text: 'ระบบไม่สามารถส่งข้อความได้ครบทุกรายการที่ระบุ', showCloseButton: true, confirmButtonColor: '#E11D48', confirmButtonText: 'ปิดหน้านี้', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } });
        }
      }
    });
  }, [selectedInvoices, fetchInvoices]);

  const handleEditAmount = useCallback((inv: any) => {
    Swal.fire({
      title: `แก้ไขข้อมูลยูนิต ${inv.house?.houseNo}`,
      html: `
        <div class="text-left mb-2 text-sm font-bold text-slate-700 mt-4">ยอดเริ่มต้น (บาท)</div>
        <input id="swal-input1" class="swal2-input !m-0 !w-full !rounded-xl !border-slate-200 focus:!ring-[#376B64] focus:!border-[#376B64] mb-4 outline-none" value="${inv.baseAmount}" type="number">
        <div class="text-left mb-2 text-sm font-bold text-slate-700">ค่าปรับล่าช้า (บาท)</div>
        <input id="swal-input2" class="swal2-input !m-0 !w-full !rounded-xl !border-slate-200 focus:!ring-[#376B64] focus:!border-[#376B64] outline-none" value="${inv.penaltyAmount}" type="number">
      `,
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonText: 'บันทึกข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9CA3AF',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
      preConfirm: () => ({
        base: (document.getElementById('swal-input1') as HTMLInputElement).value,
        penalty: (document.getElementById('swal-input2') as HTMLInputElement).value,
      }),
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังปรับปรุงข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin/update-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: inv.id, baseAmount: result.value?.base, penaltyAmount: result.value?.penalty }),
          }).then(res => {
            if (res.ok) { Toast.fire({ icon: 'success', title: 'ปรับปรุงข้อมูลเสร็จสิ้น' }); fetchInvoices(); }
            else Toast.fire({ icon: 'error', title: 'พบปัญหาในการปรับปรุงข้อมูล' });
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  }, [fetchInvoices]);

  const handleResetInvoice = useCallback((id: string, currentStatus: string) => {
    Swal.fire({
      title: 'ปรับปรุงสถานะใบแจ้งหนี้',
      text: `สถานะอ้างอิงปัจจุบัน: ${currentStatus}`,
      icon: 'info',
      html: `
        <div class="relative text-left mt-4">
          <select id="status-select" class="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl outline-none px-4 py-3 focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/10 cursor-pointer font-bold">
            <option value="" disabled>กรุณาเลือกสถานะที่ต้องการ...</option>
            <option value="PENDING" ${currentStatus === 'PENDING' ? 'selected' : ''}>รอชำระ (PENDING)</option>
            <option value="OVERDUE" ${currentStatus === 'OVERDUE' ? 'selected' : ''}>ค้างชำระ (OVERDUE)</option>
            <option value="PARTIAL" ${currentStatus === 'PARTIAL' ? 'selected' : ''}>แบ่งจ่าย (PARTIAL)</option>
            <option value="CHECKING" ${currentStatus === 'CHECKING' ? 'selected' : ''}>รอตรวจสอบ (CHECKING)</option>
            <option value="PAID" ${currentStatus === 'PAID' ? 'selected' : ''}>ชำระแล้ว (PAID)</option>
            <option value="REJECTED" ${currentStatus === 'REJECTED' ? 'selected' : ''}>ถูกปฏิเสธ (REJECTED)</option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
      `,
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'บันทึกการเปลี่ยนแปลง',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
      preConfirm: () => {
        const val = (document.getElementById('status-select') as HTMLSelectElement).value;
        if (!val) { Swal.showValidationMessage('กรุณาเลือกสถานะอ้างอิง'); }
        return val;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({ title: 'กำลังปรับปรุงสถานะ...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin/reset-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: id, newStatus: result.value }),
          }).then(res => {
            if (res.ok) { Toast.fire({ icon: 'success', title: `สถานะถูกเปลี่ยนเป็น ${result.value} เรียบร้อย` }); fetchInvoices(); }
            else Toast.fire({ icon: 'error', title: 'ไม่สามารถปรับปรุงสถานะได้' });
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  }, [fetchInvoices]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'PAID': return 'text-emerald-600';
      case 'CHECKING': return 'text-amber-500';
      case 'REJECTED': return 'text-rose-600';
      case 'OVERDUE': return 'text-rose-600 font-extrabold';
      case 'PENDING': return 'text-[#376B64]';
      case 'PARTIAL': return 'text-orange-500 font-bold';
      default: return 'text-slate-500';
    }
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-[#376B64]">
      <RefreshCw className="animate-spin mb-4" size={40} />
      <span className="font-bold text-lg">กำลังประมวลผลข้อมูล...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 pb-20 w-full">

        {/* Top Action Card */}
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="text-[#376B64] shrink-0" size={32} /> การจัดการใบแจ้งหนี้
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">ประมวลผลและติดตามสถานะการชำระเงินของโครงการ</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            {isSuperAdmin && (
              <Link href="/admin/settings" className="flex items-center justify-center w-full sm:w-auto px-5 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all shadow-sm">
                <Settings size={16} className="mr-2 shrink-0" /> ตั้งค่าระบบ
              </Link>
            )}
            <button
              onClick={handleCreateBillChoice}
              className="flex items-center justify-center w-full sm:w-auto px-6 py-2.5 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={18} className="mr-1 shrink-0" /> สร้างใบแจ้งหนี้
            </button>
          </div>
        </div>

        {/* Search & Filter - 🌟 แก้ไขให้นำ overflow-x-auto ออกและใช้ flex-wrap เพื่อป้องกัน Dropdown ถูกจำกัดพื้นที่ */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-1/4 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาตามยูนิตอ้างอิง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-medium text-slate-700 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto pb-2 md:pb-0">
            <div className="w-40 shrink-0">
              <CustomDropdown
                icon={Filter}
                value={filterMonth}
                onChange={(v) => setFilterMonth(Number(v))}
                options={monthOptions}
              />
            </div>
            <div className="w-32 shrink-0">
              <CustomDropdown
                value={filterYear}
                onChange={(v) => setFilterYear(Number(v))}
                options={yearOptions}
              />
            </div>
            <div className="w-48 shrink-0">
              <CustomDropdown
                value={filterStatus}
                onChange={(v) => setFilterStatus(String(v))}
                options={statusOptions}
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative w-full">

          {selectedInvoices.length > 0 && (
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in slide-in-from-top duration-300 z-10 relative">
              <span className="text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                <span className="flex items-center justify-center bg-[#376B64] text-white w-6 h-6 rounded-full text-xs shadow-sm font-black shrink-0">{selectedInvoices.length}</span> รายการอ้างอิง
              </span>
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => handleDelete()}
                      className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-[0.98] whitespace-nowrap"
                    >
                      <Trash2 size={14} className="mr-1.5 shrink-0" /> ลบข้อมูลที่เลือก
                    </button>
                    <div className="h-px w-full sm:w-px sm:h-6 bg-slate-700 mx-1 my-1 sm:my-0" />
                  </>
                )}
                
                <div className="flex flex-row w-full sm:w-auto gap-2">
                  <button onClick={() => handleBulkNotify('SEND')} className="flex-1 sm:flex-none flex justify-center items-center px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-bold rounded-xl transition active:scale-[0.98] whitespace-nowrap"><Send size={14} className="mr-1.5 shrink-0" /> นำส่งใบแจ้งหนี้</button>
                  <button onClick={() => handleBulkNotify('REMINDER')} className="flex-1 sm:flex-none flex justify-center items-center px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 text-xs font-bold rounded-xl transition active:scale-[0.98] whitespace-nowrap"><Clock size={14} className="mr-1.5 shrink-0" /> แจ้งเตือนล่วงหน้า</button>
                </div>
                <button onClick={() => handleBulkNotify('OVERDUE')} className="flex items-center justify-center w-full sm:w-auto px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-bold rounded-xl transition active:scale-[0.98] whitespace-nowrap"><AlertCircle size={14} className="mr-1.5 shrink-0" /> แจ้งเตือนยอดค้างชำระ</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                      onChange={handleSelectAll}
                      checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    />
                  </th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">ยูนิตอ้างอิง</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">รอบการเรียกเก็บเงิน</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">ยอดชำระดำเนินการ</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">สถานะปัจจุบัน</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">การจัดการบัญชี</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">ระบบการแจ้งเตือน</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <Search className="mx-auto text-slate-300 mb-4" size={48} />
                      <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบข้อมูลใบแจ้งหนี้</h3>
                      <p className="text-slate-500 text-sm">ระบบไม่พบข้อมูลตามเงื่อนไขการค้นหาหรือตัวกรองที่ระบุ</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const thMonth = thaiMonths.find(m => m.num === inv.billingMonth)?.short || inv.billingMonth;
                    const isSelected = selectedInvoices.includes(inv.id);

                    const base = Number(inv.baseAmount || 0);
                    const penalty = Number(inv.penaltyAmount || 0);
                    const paid = Number(inv.paidAmount || 0);
                    const total = base + penalty;
                    const outstanding = total - paid;

                    const displayAmount = inv.status === 'PARTIAL' ? outstanding : total;

                    return (
                      <tr key={inv.id} className="transition-all duration-200 hover:bg-slate-50/50" style={{ backgroundColor: isSelected ? 'rgba(55, 107, 100, 0.05)' : '' }}>

                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleSelectOne(inv.id)}
                          />
                        </td>

                        <td className="py-4 px-2 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-sm border bg-slate-100 text-slate-700 border-slate-200">
                            {inv.house?.houseNo || '-'}
                          </div>
                        </td>

                        <td className="py-4 px-2 text-slate-700 font-bold text-sm text-center whitespace-nowrap">{thMonth} {inv.billingYear + 543}</td>

                        <td className="py-4 px-2 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center font-bold">
                            <span className="text-slate-900 text-base">
                              {displayAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                            </span>

                            {penalty > 0 && (
                              <span className="text-[11px] text-rose-500 font-medium mt-0.5 whitespace-nowrap">
                                {inv.status === 'PAID' ? '(รวมค่าปรับล่าช้า)' : `(รวมค่าปรับ ${penalty.toLocaleString('th-TH')} ฿)`}
                              </span>
                            )}

                            {inv.status === 'PARTIAL' && paid > 0 && (
                              <span className="text-[11px] text-orange-600 mt-1 font-black whitespace-nowrap">
                                ยอดค้างชำระ (ชำระบางส่วน {paid.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-2 text-center whitespace-nowrap">
                          <span className={`text-[12px] font-black uppercase tracking-wider ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>

                        <td className="py-4 px-4 border-l border-slate-50 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <div className="flex bg-slate-50 p-1.5 rounded-xl gap-1.5 border border-slate-200/60 shadow-sm">

                              <button
                                onClick={() => {
                                  if (inv.status === 'PAID') {
                                    Swal.fire({
                                      icon: 'error',
                                      title: 'ระงับการแก้ไขข้อมูล',
                                      text: 'รายการที่ดำเนินการเสร็จสิ้นแล้ว ไม่สามารถเปลี่ยนแปลงข้อมูลได้',
                                      confirmButtonColor: '#376B64',
                                      customClass: { popup: 'rounded-[2rem]' }
                                    });
                                    return;
                                  }
                                  handleEditAmount(inv);
                                }}
                                className={`group relative p-2 rounded-lg transition-all shadow-sm ${inv.status === 'PAID' ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-500 hover:text-[#376B64] hover:bg-[#376B64]/10 hover:shadow'}`}
                                title="แก้ไขข้อมูลบัญชี"
                              >
                                <Edit size={16} className="shrink-0" />
                              </button>

                              <button
                                onClick={() => {
                                  if (inv.status === 'PAID' && !isSuperAdmin) {
                                    Swal.fire({
                                      icon: 'warning',
                                      title: 'ข้อจำกัดสิทธิ์การเข้าถึง',
                                      text: 'การเปลี่ยนสถานะจากชำระเงินแล้ว สงวนสิทธิ์สำหรับผู้ดูแลระบบระดับสูงเท่านั้น',
                                      confirmButtonColor: '#376B64',
                                      customClass: { popup: 'rounded-[2rem]' }
                                    });
                                    return;
                                  }
                                  handleResetInvoice(inv.id, inv.status);
                                }}
                                className={`group relative p-2 rounded-lg transition-all shadow-sm ${(inv.status === 'PAID' && !isSuperAdmin) ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:shadow'}`}
                                title="ปรับปรุงสถานะ"
                              >
                                <RefreshCw size={16} className="shrink-0" />
                              </button>

                              {isSuperAdmin && (
                                <button
                                  onClick={() => {
                                    if (inv.status === 'PAID') {
                                      Swal.fire({
                                        icon: 'error',
                                        title: 'ระงับการลบข้อมูล',
                                        text: 'รายการที่ปิดยอดแล้วไม่สามารถนำออกจากระบบได้',
                                        confirmButtonColor: '#376B64',
                                        customClass: { popup: 'rounded-[2rem]' }
                                      });
                                      return;
                                    }
                                    handleDelete(inv.id);
                                  }}
                                  className={`group relative p-2 rounded-lg transition-all shadow-sm ${inv.status === 'PAID' ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:shadow'}`}
                                  title="ลบข้อมูลอ้างอิง"
                                >
                                  <Trash2 size={16} className="shrink-0" />
                                </button>
                              )}

                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 border-l border-slate-50 text-center whitespace-nowrap min-w-[320px]">
                          <div className="flex flex-nowrap items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleNotify(inv.id, 'SEND')} 
                              disabled={inv.status === 'PAID'}
                              className={`flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold transition border whitespace-nowrap shadow-sm ${
                                inv.status === 'PAID' 
                                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60' 
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100 active:scale-95'
                              }`}
                            >
                              <Send size={12} className="mr-1 shrink-0" /> ส่งใบแจ้งหนี้
                            </button>

                            <button 
                              onClick={() => handleNotify(inv.id, 'REMINDER')} 
                              disabled={inv.status === 'PAID'}
                              className={`flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold transition border whitespace-nowrap shadow-sm ${
                                inv.status === 'PAID' 
                                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60' 
                                : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-100 active:scale-95'
                              }`}
                            >
                              <Clock size={12} className="mr-1 shrink-0" /> ทวงถามล่วงหน้า
                            </button>

                            <button 
                              onClick={() => handleNotify(inv.id, 'OVERDUE')} 
                              disabled={inv.status === 'PAID'}
                              className={`flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold transition border whitespace-nowrap shadow-sm ${
                                inv.status === 'PAID' 
                                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60' 
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 active:scale-95'
                              }`}
                            >
                              <AlertCircle size={12} className="mr-1 shrink-0" /> แจ้งยอดค้างชำระ
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal - สร้างใบแจ้งหนี้ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-slate-100 animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto custom-scrollbar">

            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 sm:top-5 right-4 sm:right-5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 sm:p-2.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6 sm:mb-8 mt-4 sm:mt-2 pr-6 sm:pr-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#376B64]/10 text-[#376B64] rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm border border-[#376B64]/20">
                <Plus size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">กำหนดรอบประมวลผล</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-2 leading-relaxed">
                {targetHouseNo
                  ? <span>เตรียมสร้างใบแจ้งหนี้เฉพาะยูนิตอ้างอิง <span className="font-bold text-[#376B64] bg-[#376B64]/10 px-2 py-0.5 rounded-md whitespace-nowrap">{targetHouseNo}</span></span>
                  : 'ประมวลผลใบแจ้งหนี้รวมสำหรับทุกยูนิตในระบบ'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 mb-6 sm:mb-8 shadow-inner">
              <div className="flex items-center justify-between mb-4 sm:mb-5 bg-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                <button onClick={() => setSelectedYear(y => y - 1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg sm:rounded-xl text-slate-600 transition-colors hover:shadow-sm">
                  <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">รอบบิลประจำปี พ.ศ.</span>
                  <span className="font-black text-[#376B64] text-lg sm:text-xl">{selectedYear + 543}</span>
                </div>
                <button onClick={() => setSelectedYear(y => y + 1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg sm:rounded-xl text-slate-600 transition-colors hover:shadow-sm">
                  <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {thaiMonths.map((m) => (
                  <button
                    key={m.num}
                    onClick={() => setSelectedMonth(m.num)}
                    className={`py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all ${selectedMonth === m.num ? 'bg-[#376B64] text-white shadow-md shadow-[#376B64]/30 scale-105' : 'bg-white text-slate-600 hover:bg-[#376B64]/10 hover:text-[#376B64] border border-slate-200'}`}
                  >
                    {m.short}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={submitGenerateInvoices} className="flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white bg-[#376B64] hover:bg-[#2A524C] shadow-lg shadow-[#376B64]/30 transition-all active:scale-[0.98] text-sm sm:text-base">ยืนยันการสร้างใบแจ้งหนี้</button>
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm sm:text-base">ยกเลิกรายการ</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}