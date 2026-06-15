'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Settings, Trash2, Plus, Edit, RefreshCw, Send, AlertCircle, Clock, Search, Filter, CheckCircle2, Receipt, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';

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

export default function AdminInvoicesPage() {
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

  useEffect(() => { fetchInvoices(); }, []);

  // ==========================================
  // Fetch
  // ==========================================
  const fetchInvoices = async () => {
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
      Toast.fire({ icon: 'error', title: 'ไม่สามารถดึงข้อมูลบิลได้' });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Filter
  // ==========================================
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

  const availableYears = Array.from(new Set(invoices.map(inv => inv.billingYear))).sort((a, b) => b - a);

  // ==========================================
  // Select
  // ==========================================
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    else setSelectedInvoices([]);
  };

  const handleSelectOne = (id: string) => {
    if (selectedInvoices.includes(id)) setSelectedInvoices(selectedInvoices.filter(i => i !== id));
    else setSelectedInvoices([...selectedInvoices, id]);
  };

  // ==========================================
  // Create Bill
  // ==========================================
  const handleCreateBillChoice = () => {
    Swal.fire({
      title: 'สร้างบิลใหม่',
      text: 'คุณต้องการสร้างบิลรูปแบบใด?',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      showCloseButton: true,
      confirmButtonText: 'สร้างให้ทุกบ้าน',
      denyButtonText: 'เลือกเฉพาะบ้าน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#376B64',
      denyButtonColor: '#2A524C',
      cancelButtonColor: '#9ca3af',
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
          title: 'ระบุบ้านเลขที่',
          input: 'text',
          inputPlaceholder: 'เช่น 123/4',
          showCancelButton: true,
          showCloseButton: true,
          confirmButtonText: 'ถัดไป',
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: '#376B64',
          cancelButtonColor: '#9ca3af',
          customClass: {
            popup: 'rounded-[2rem] w-auto max-w-[90vw]',
            input: 'rounded-xl border-gray-200 focus:ring-[#376B64] focus:border-[#376B64]',
            confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
            cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
            actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
          },
          inputValidator: (value) => { if (!value) return 'กรุณาระบุบ้านเลขที่!'; return null; },
        }).then((res) => {
          if (res.isConfirmed && res.value) {
            setTargetHouseNo(res.value);
            setIsModalOpen(true);
          }
        });
      }
    });
  };

  const submitGenerateInvoices = async () => {
    setIsModalOpen(false);
    Swal.fire({
      title: 'กำลังสร้างบิล...',
      html: 'กรุณารอสักครู่ ระบบกำลังประมวลผล',
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
          title: 'สร้างบิลสำเร็จ!',
          text: data.message,
          showCloseButton: true,
          confirmButtonColor: '#376B64',
          confirmButtonText: 'ตกลง',
          customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
        });
        fetchInvoices();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถสร้างบิลได้',
          text: data.error || 'เกิดข้อผิดพลาดบางอย่าง',
          showCloseButton: true,
          confirmButtonColor: '#e11d48',
          confirmButtonText: 'ปิด',
          customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
        });
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'เซิร์ฟเวอร์มีปัญหา',
        text: 'ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง',
        showCloseButton: true,
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'ปิด',
        customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
      });
    }
  };

  // ==========================================
  // Delete
  // ==========================================
  const handleDelete = async (singleId?: string) => {
    const idsToDelete = singleId ? [singleId] : selectedInvoices;
    if (idsToDelete.length === 0) return;

    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณกำลังจะลบบิลจำนวน ${idsToDelete.length} รายการ การกระทำนี้ย้อนกลับไม่ได้!`,
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin/delete-invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idsToDelete }),
          }).then(r => r.json()).then(data => {
            if (data.success) {
              Toast.fire({ icon: 'success', title: `ลบเรียบร้อยแล้ว จำนวน ${data.count} ใบ` });
              setSelectedInvoices([]);
              fetchInvoices();
            } else {
              Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการลบ' });
            }
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  };

  // ==========================================
  // Notify (single)
  // ==========================================
  const handleNotify = async (invoiceId: string, type: 'SEND' | 'REMINDER' | 'OVERDUE') => {
    const titles = { SEND: 'ส่งบิลใหม่?', REMINDER: 'ส่งแจ้งเตือนล่วงหน้า?', OVERDUE: 'ส่งแจ้งเตือนเกินกำหนด?' };

    Swal.fire({
      title: titles[type],
      text: 'ข้อความจะถูกส่งเข้า LINE ของลูกบ้านทันที',
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ใช่, ส่งเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังส่ง...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId, type }),
          }).then(r => r.json()).then(data => {
            if (data.success) {
              Toast.fire({ icon: 'success', title: 'แจ้งเตือนเข้า LINE เรียบร้อย!' });
              if (type === 'OVERDUE') fetchInvoices();
            } else {
              Swal.fire({ icon: 'info', title: 'ระบบยังไม่พร้อม', text: 'ฟังก์ชันส่ง LINE แจ้งเตือนยังไม่ได้เชื่อมต่อระบบหลังบ้านครับ', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } });
            }
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการส่งข้อความ' });
        }
      }
    });
  };

  // ==========================================
  // Notify (bulk)
  // ==========================================
  const handleBulkNotify = async (type: 'SEND' | 'REMINDER' | 'OVERDUE') => {
    if (selectedInvoices.length === 0) return;
    const titles = { SEND: 'ส่งบิลทั้งหมดที่เลือก?', REMINDER: 'ส่งแจ้งเตือนล่วงหน้าทั้งหมดที่เลือก?', OVERDUE: 'ส่งทวงยอดค้างทั้งหมดที่เลือก?' };

    Swal.fire({
      title: titles[type],
      text: `ระบบจะทำการส่งข้อความแจ้งเตือนไปยังลูกบ้านจำนวน ${selectedInvoices.length} รายการ`,
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: 'ใช่, ส่งเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังส่งแจ้งเตือน...', html: 'โปรดรอสักครู่ ห้ามปิดหน้านี้', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
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
            title: 'ส่งสำเร็จ!',
            text: `แจ้งเตือนเข้า LINE จำนวน ${selectedInvoices.length} รายการเรียบร้อย!`,
            showCloseButton: true,
            confirmButtonColor: '#376B64',
            customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' },
          });
          if (type === 'OVERDUE') fetchInvoices();
        } catch {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถส่งข้อความได้ครบทุกรายการ', showCloseButton: true, confirmButtonColor: '#e11d48', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } });
        }
      }
    });
  };

  // ==========================================
  // Edit Amount
  // ==========================================
  const handleEditAmount = (inv: any) => {
    Swal.fire({
      title: `แก้ไขยอดบ้าน ${inv.house?.houseNo}`,
      html: `
        <div class="text-left mb-2 text-sm font-bold text-gray-700 mt-4">ยอดตั้งต้น (บาท)</div>
        <input id="swal-input1" class="swal2-input !m-0 !w-full !rounded-xl !border-gray-200 focus:!ring-[#376B64] focus:!border-[#376B64] mb-4" value="${inv.baseAmount}" type="number">
        <div class="text-left mb-2 text-sm font-bold text-gray-700">ค่าปรับ (บาท)</div>
        <input id="swal-input2" class="swal2-input !m-0 !w-full !rounded-xl !border-gray-200 focus:!ring-[#376B64] focus:!border-[#376B64]" value="${inv.penaltyAmount}" type="number">
      `,
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonText: 'บันทึกการแก้ไข',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9ca3af',
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
        Swal.fire({ title: 'กำลังอัปเดตยอด...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin/update-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: inv.id, baseAmount: result.value?.base, penaltyAmount: result.value?.penalty }),
          }).then(res => {
            if (res.ok) { Toast.fire({ icon: 'success', title: 'อัปเดตยอดเงินเรียบร้อยแล้ว' }); fetchInvoices(); }
            else Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการอัปเดต' });
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  };

  // ==========================================
  // Reset Status
  // ==========================================
  const handleResetInvoice = (id: string, currentStatus: string) => {
    Swal.fire({
      title: 'เปลี่ยนสถานะบิล',
      text: `สถานะปัจจุบัน: ${currentStatus}`,
      icon: 'info',
      input: 'select',
      inputOptions: {
        PENDING: 'รอชำระ (PENDING)',
        OVERDUE: 'ค้างชำระ (OVERDUE)',
        PARTIAL: 'แบ่งจ่าย (PARTIAL)',
        PAID: 'ชำระแล้ว (PAID)',
        CHECKING: 'รอตรวจสอบ (CHECKING)',
        REJECTED: 'ถูกปฏิเสธ (REJECTED)',
      },
      inputPlaceholder: 'เลือกสถานะใหม่...',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'บันทึกสถานะ',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] w-auto max-w-[90vw]',
        input: 'rounded-xl border-gray-200 py-3 cursor-pointer w-full text-sm sm:text-base',
        confirmButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto mb-2 sm:mb-0',
        cancelButton: 'rounded-xl px-4 sm:px-6 py-2.5 font-bold w-full sm:w-auto',
        actions: 'flex flex-col sm:flex-row w-full gap-2 px-4'
      },
      inputValidator: (value) => new Promise((resolve) => {
        if (value) resolve(null); else resolve('กรุณาเลือกสถานะ!');
      }),
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังอัปเดต...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          fetch('/api/admin/reset-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: id, newStatus: result.value }),
          }).then(res => {
            if (res.ok) { Toast.fire({ icon: 'success', title: `เปลี่ยนสถานะเป็น ${result.value} แล้ว` }); fetchInvoices(); }
            else Toast.fire({ icon: 'error', title: 'อัปเดตไม่สำเร็จ' });
          });
        } catch {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  };

  // ==========================================
  // Status Badge (แก้ไขลบ BgColor ออก เหลือแต่สีตัวหนังสือ)
  // ==========================================
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-emerald-600';
      case 'CHECKING': return 'text-amber-500';
      case 'REJECTED': return 'text-rose-600';
      case 'OVERDUE': return 'text-rose-600 font-extrabold';
      case 'PENDING': return 'text-[#376B64]';
      case 'PARTIAL': return 'text-orange-500 font-bold';
      default: return 'text-gray-500';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-[#376B64]">
      <RefreshCw className="animate-spin mb-4" size={40} />
      <span className="font-bold text-lg">กำลังโหลดข้อมูล...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 pb-20 w-full">

        {/* Top Action Card */}
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="text-[#376B64] shrink-0" size={32} /> ระบบจัดการบิล
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">เรียงลำดับตาม: รอบบิลเก่าที่สุด และบ้านเลขที่น้อยไปมาก</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            <Link href="/admin/settings" className="flex items-center justify-center w-full sm:w-auto px-5 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all shadow-sm">
              <Settings size={16} className="mr-2 shrink-0" /> ตั้งค่า
            </Link>
            <button
              onClick={handleCreateBillChoice}
              className="flex items-center justify-center w-full sm:w-auto px-6 py-2.5 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={18} className="mr-1 shrink-0" /> สร้างบิลใหม่
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-1/4 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาบ้านเลขที่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-medium text-slate-700"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar sm:scrollbar-hide">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-[1.25rem] px-4 py-3 min-w-max hover:border-[#376B64]/30 transition-colors">
              <Filter size={16} className="text-[#376B64] mr-2 shrink-0" />
              <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold outline-none text-slate-700 cursor-pointer w-full">
                <option value={0}>ทุกเดือน</option>
                {thaiMonths.map(m => <option key={m.num} value={m.num}>{m.full}</option>)}
              </select>
            </div>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-[1.25rem] px-4 py-3 min-w-max hover:border-[#376B64]/30 transition-colors">
              <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="bg-transparent text-sm font-bold outline-none text-slate-700 cursor-pointer w-full">
                <option value={0}>ทุกปี</option>
                {availableYears.map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-[1.25rem] px-4 py-3 min-w-max hover:border-[#376B64]/30 transition-colors">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-slate-700 cursor-pointer w-full">
                <option value="ALL">ทุกสถานะ</option>
                <option value="PENDING">รอชำระ (PENDING)</option>
                <option value="OVERDUE">ค้างชำระ (OVERDUE)</option>
                <option value="PARTIAL">แบ่งจ่าย (PARTIAL)</option>
                <option value="CHECKING">รอตรวจสอบ (CHECKING)</option>
                <option value="PAID">ชำระแล้ว (PAID)</option>
                <option value="REJECTED">ถูกปฏิเสธ (REJECTED)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative w-full">

          {selectedInvoices.length > 0 && (
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in slide-in-from-top duration-300 z-10 relative">
              <span className="text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                <span className="flex items-center justify-center bg-[#376B64] text-white w-6 h-6 rounded-full text-xs shadow-sm font-black shrink-0">{selectedInvoices.length}</span> รายการที่เลือก
              </span>
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleDelete()}
                  className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-[0.98] whitespace-nowrap"
                >
                  <Trash2 size={14} className="mr-1.5 shrink-0" /> ลบข้อมูลที่เลือก
                </button>
                <div className="h-px w-full sm:w-px sm:h-6 bg-slate-700 mx-1 my-1 sm:my-0" />
                <div className="flex flex-row w-full sm:w-auto gap-2">
                  <button onClick={() => handleBulkNotify('SEND')} className="flex-1 sm:flex-none flex justify-center items-center px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-bold rounded-xl transition active:scale-[0.98] whitespace-nowrap"><Send size={14} className="mr-1.5 shrink-0" /> ส่งบิล</button>
                  <button onClick={() => handleBulkNotify('REMINDER')} className="flex-1 sm:flex-none flex justify-center items-center px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 text-xs font-bold rounded-xl transition active:scale-[0.98] whitespace-nowrap"><Clock size={14} className="mr-1.5 shrink-0" /> ทวงล่วงหน้า</button>
                </div>
                <button onClick={() => handleBulkNotify('OVERDUE')} className="flex items-center justify-center w-full sm:w-auto px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-bold rounded-xl transition active:scale-[0.98] whitespace-nowrap"><AlertCircle size={14} className="mr-1.5 shrink-0" /> ทวงยอดค้าง</button>
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
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">บ้านเลขที่</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">ประจำเดือน</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">ยอดชำระ</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">สถานะ</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">จัดการบิล</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">แจ้งเตือนผ่าน LINE</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <Search className="mx-auto text-slate-300 mb-4" size={48} />
                      <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบบิล</h3>
                      <p className="text-slate-500 text-sm">ลองเปลี่ยนคำค้นหาหรือตัวกรองเดือน/ปี ดูสิ</p>
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

                        {/* 🌟 ลบสีพื้นหลัง ออกเหลือแต่สีตัวหนังสือ */}
                        <td className="py-4 px-2 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center font-bold">
                            <span className="text-slate-900 text-base">
                              {displayAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                            </span>

                            {/* 🌟 1. ย้ายค่าปรับขึ้นมาไว้ตรงนี้ (ใต้ยอดเงินหลัก) */}
                            {penalty > 0 && (
                              <span className="text-[11px] text-rose-500 font-medium mt-0.5 whitespace-nowrap">
                                {inv.status === 'PAID' ? '(รวมค่าปรับแล้ว)' : `(รวมค่าปรับ ${penalty.toLocaleString('th-TH')} ฿)`}
                              </span>
                            )}

                            {/* 🌟 2. ย้ายยอดคงเหลือลงมาอยู่ด้านล่างสุด */}
                            {inv.status === 'PARTIAL' && paid > 0 && (
                              <span className="text-[11px] text-orange-600 mt-1 font-black whitespace-nowrap">
                                ยอดคงเหลือ (จ่ายแล้ว {paid.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 🌟 สถานะ: ลบพื้นหลังให้เหลือแค่สีข้อความ */}
                        <td className="py-4 px-2 text-center whitespace-nowrap">
                          <span className={`text-[12px] font-black uppercase tracking-wider ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>

                        {/* 🌟 จัดการบิล: ล็อกปุ่มถ้าเป็น PAID */}
                        <td className="py-4 px-4 border-l border-slate-50 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <div className="flex bg-slate-50 p-1.5 rounded-xl gap-1.5 border border-slate-200/60 shadow-sm">

                              {/* ปุ่มแก้ไขยอด */}
                              <button
                                onClick={() => {
                                  if (inv.status === 'PAID') {
                                    Swal.fire({
                                      icon: 'error',
                                      title: 'ไม่สามารถแก้ไขได้',
                                      text: 'บิลที่ชำระเงินเรียบร้อยแล้ว ไม่สามารถแก้ไขยอดได้ครับ',
                                      customClass: { popup: 'rounded-[2rem]' }
                                    });
                                    return;
                                  }
                                  handleEditAmount(inv);
                                }}
                                className={`group relative p-2 rounded-lg transition-all shadow-sm ${inv.status === 'PAID' ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-500 hover:text-[#376B64] hover:bg-[#376B64]/10 hover:shadow'}`}
                              >
                                <Edit size={16} className="shrink-0" />
                              </button>

                              {/* ปุ่มเปลี่ยนสถานะ */}
                              <button
                                onClick={() => {
                                  if (inv.status === 'PAID') {
                                    const isSuperAdmin = false; // TODO: เปลี่ยนเป็นเช็คสิทธิ์จากระบบ Login ในอนาคต
                                    if (!isSuperAdmin) {
                                      Swal.fire({
                                        icon: 'warning',
                                        title: 'สิทธิ์ไม่เพียงพอ',
                                        text: 'เฉพาะแอดมินระดับสูงเท่านั้นที่สามารถเปลี่ยนสถานะบิลที่จ่ายแล้วได้ (ระบบ Login กำลังพัฒนา)',
                                        customClass: { popup: 'rounded-[2rem]' }
                                      });
                                      return;
                                    }
                                  }
                                  handleResetInvoice(inv.id, inv.status);
                                }}
                                className={`group relative p-2 rounded-lg transition-all shadow-sm ${inv.status === 'PAID' ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:shadow'}`}
                              >
                                <RefreshCw size={16} className="shrink-0" />
                              </button>

                              {/* ปุ่มลบ */}
                              <button
                                onClick={() => {
                                  if (inv.status === 'PAID') {
                                    Swal.fire({
                                      icon: 'error',
                                      title: 'ไม่สามารถลบได้',
                                      text: 'บิลที่มีการชำระเงินแล้ว ไม่สามารถลบออกจากระบบได้ครับ',
                                      customClass: { popup: 'rounded-[2rem]' }
                                    });
                                    return;
                                  }
                                  handleDelete(inv.id);
                                }}
                                className={`group relative p-2 rounded-lg transition-all shadow-sm ${inv.status === 'PAID' ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:shadow'}`}
                              >
                                <Trash2 size={16} className="shrink-0" />
                              </button>

                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 border-l border-slate-50 text-center whitespace-nowrap min-w-[320px]">
                          <div className="flex flex-nowrap items-center justify-center gap-1.5">
                            <button onClick={() => handleNotify(inv.id, 'SEND')} className="flex items-center px-3 py-1.5 bg-blue-50   hover:bg-blue-100   text-blue-600   rounded-xl text-[11px] font-bold transition border border-blue-100   active:scale-95 shadow-sm whitespace-nowrap"><Send size={12} className="mr-1 shrink-0" /> ส่งบิล</button>
                            <button onClick={() => handleNotify(inv.id, 'REMINDER')} className="flex items-center px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-[11px] font-bold transition border border-orange-100 active:scale-95 shadow-sm whitespace-nowrap"><Clock size={12} className="mr-1 shrink-0" /> ทวงล่วงหน้า</button>
                            <button onClick={() => handleNotify(inv.id, 'OVERDUE')} className="flex items-center px-3 py-1.5 bg-rose-50   hover:bg-rose-100   text-rose-600   rounded-xl text-[11px] font-bold transition border border-rose-100   active:scale-95 shadow-sm whitespace-nowrap"><AlertCircle size={12} className="mr-1 shrink-0" /> ทวงยอดค้าง</button>
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

      {/* Calendar Modal */}
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
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">ระบุรอบบิล</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-2 leading-relaxed">
                {targetHouseNo
                  ? <span>สร้างบิลให้บ้านเลขที่ <span className="font-bold text-[#376B64] bg-[#376B64]/10 px-2 py-0.5 rounded-md whitespace-nowrap">{targetHouseNo}</span></span>
                  : 'สร้างบิลให้ลูกบ้านทุกคนในโครงการ'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 mb-6 sm:mb-8 shadow-inner">
              <div className="flex items-center justify-between mb-4 sm:mb-5 bg-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                <button onClick={() => setSelectedYear(y => y - 1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg sm:rounded-xl text-slate-600 transition-colors hover:shadow-sm">
                  <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">ปี พ.ศ.</span>
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
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm sm:text-base">ยกเลิก</button>
              <button onClick={submitGenerateInvoices} className="flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white bg-[#376B64] hover:bg-[#2A524C] shadow-lg shadow-[#376B64]/30 transition-all active:scale-[0.98] text-sm sm:text-base">ยืนยันสร้างบิล</button>
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