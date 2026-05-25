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
  { num: 12, full: 'ธันวาคม', short: 'ธ.ค.' }
];

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
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

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/admin/all-invoices');
      if (!res.ok) return;
      const data = await res.json();

      if (data.success) {
        const sortedInvoices = data.invoices.sort((a: any, b: any) => {
          if (a.billingYear !== b.billingYear) return a.billingYear - b.billingYear;
          if (a.billingMonth !== b.billingMonth) return a.billingMonth - b.billingMonth;
          const houseA = a.house?.houseNo || "";
          const houseB = b.house?.houseNo || "";
          return houseA.localeCompare(houseB, undefined, { numeric: true, sensitivity: 'base' });
        });

        setInvoices(sortedInvoices);
        setSelectedInvoices([]);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      Toast.fire({ icon: 'error', title: 'ไม่สามารถดึงข้อมูลบิลได้' });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchHouse = inv.house?.houseNo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = filterMonth === 0 || inv.billingMonth === filterMonth;
      const matchYear = filterYear === 0 || inv.billingYear === filterYear;
      const matchStatus = filterStatus === 'ALL' || inv.status === filterStatus;
      return matchHouse && matchMonth && matchYear && matchStatus;
    });
  }, [invoices, searchTerm, filterMonth, filterYear, filterStatus]);

  const availableYears = Array.from(new Set(invoices.map(inv => inv.billingYear))).sort((a, b) => b - a);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    else setSelectedInvoices([]);
  };

  const handleSelectOne = (id: string) => {
    if (selectedInvoices.includes(id)) setSelectedInvoices(selectedInvoices.filter(invId => invId !== id));
    else setSelectedInvoices([...selectedInvoices, id]);
  };

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
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
        denyButton: 'rounded-xl px-6 py-2.5 font-bold',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold',
      }
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
            popup: 'rounded-[2rem]',
            input: 'rounded-xl border-gray-200 focus:ring-[#376B64] focus:border-[#376B64]',
            confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
            cancelButton: 'rounded-xl px-6 py-2.5 font-bold',
          },
          inputValidator: (value) => {
            if (!value) return 'กรุณาระบุบ้านเลขที่!';
            return null;
          }
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
      didOpen: () => { Swal.showLoading() },
      customClass: { popup: 'rounded-[2rem]' }
    });

    try {
      const res = await fetch('/api/admin/generate-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear, houseNo: targetHouseNo })
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
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' }
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
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' }
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เซิร์ฟเวอร์มีปัญหา',
        text: 'ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง',
        showCloseButton: true,
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'ปิด',
        customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' }
      });
    }
  };

  // 🌟 จุดที่แก้ไข: ระบบลบแบบเจาะจง (ส่ง ID)
  const handleDelete = async (singleId?: string) => {
    const isBulk = !singleId;
    const idsToDelete = isBulk ? selectedInvoices : [singleId];
    const count = idsToDelete.length;

    if (count === 0) return;

    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณกำลังจะลบบิลจำนวน ${count} รายการ การกระทำนี้ย้อนกลับไม่ได้!`,
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold',
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          // 🌟 เปลี่ยนมายิง API ตัวใหม่ที่เรารับค่า Array ของ ID ได้
          const res = await fetch('/api/admin/delete-invoices', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idsToDelete }) 
          });
          const data = await res.json();
          
          if (data.success) {
            Toast.fire({ icon: 'success', title: `ลบเรียบร้อยแล้ว จำนวน ${data.count} ใบ` });
            setSelectedInvoices([]); // ล้างค่าที่เลือกไว้
            fetchInvoices();
          } else {
            Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการลบ' });
          }
        } catch (err) {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  };

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
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold', cancelButton: 'rounded-xl px-6 py-2.5 font-bold' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังส่ง...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          const res = await fetch('/api/admin-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId, type }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            Toast.fire({ icon: 'success', title: 'แจ้งเตือนเข้า LINE เรียบร้อย!' });
            if (type === 'OVERDUE') fetchInvoices();
          } else {
            Swal.fire({ icon: 'info', title: 'ระบบยังไม่พร้อม', text: 'ฟังก์ชันส่ง LINE แจ้งเตือนยังไม่ได้เชื่อมต่อระบบหลังบ้านครับ', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } });
          }
        } catch (err) {
          Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการส่งข้อความ' });
        }
      }
    });
  };

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
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold', cancelButton: 'rounded-xl px-6 py-2.5 font-bold' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังส่งแจ้งเตือน...', html: 'โปรดรอสักครู่ ห้ามปิดหน้านี้', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          const promises = selectedInvoices.map(id =>
            fetch('/api/admin-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoiceId: id, type }),
            }).then(res => res.json())
          );
          await Promise.all(promises);

          Swal.fire({
            icon: 'success',
            title: 'ส่งสำเร็จ!',
            text: `แจ้งเตือนเข้า LINE จำนวน ${selectedInvoices.length} รายการเรียบร้อย!`,
            showCloseButton: true,
            confirmButtonColor: '#376B64',
            customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' }
          });
          if (type === 'OVERDUE') fetchInvoices();
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถส่งข้อความได้ครบทุกรายการ', showCloseButton: true, confirmButtonColor: '#e11d48', customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' } });
        }
      }
    });
  };

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
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold',
      },
      preConfirm: () => {
        return {
          base: (document.getElementById('swal-input1') as HTMLInputElement).value,
          penalty: (document.getElementById('swal-input2') as HTMLInputElement).value
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังอัปเดตยอด...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        try {
          const res = await fetch('/api/admin/update-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceId: inv.id,
              baseAmount: result.value?.base,
              penaltyAmount: result.value?.penalty
            }),
          });
          if (res.ok) {
            Toast.fire({ icon: 'success', title: 'อัปเดตยอดเงินเรียบร้อยแล้ว' });
            fetchInvoices();
          } else {
            Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการอัปเดต' });
          }
        } catch (err) {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  };

  const handleResetInvoice = (id: string, currentStatus: string) => {
    Swal.fire({
      title: 'เปลี่ยนสถานะบิล',
      text: `สถานะปัจจุบัน: ${currentStatus}`,
      icon: 'info',
      input: 'select',
      inputOptions: {
        'PENDING': 'รอชำระ (PENDING)',
        'OVERDUE': 'ค้างชำระ (OVERDUE)',
        'PARTIAL': 'แบ่งจ่าย (PARTIAL)',
        'PAID': 'ชำระแล้ว (PAID)',
        'CHECKING': 'รอตรวจสอบ (CHECKING)',
        'REJECTED': 'ถูกปฏิเสธ (REJECTED)'
      },
      inputPlaceholder: 'เลือกสถานะใหม่...',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'บันทึกสถานะ',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem]',
        input: 'rounded-xl border-gray-200 py-3 cursor-pointer',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold',
      },
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value) resolve(null);
          else resolve('กรุณาเลือกสถานะ!');
        });
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({ title: 'กำลังอัปเดต...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
          const res = await fetch('/api/admin/reset-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: id, newStatus: result.value }),
          });

          if (res.ok) {
            Toast.fire({ icon: 'success', title: `เปลี่ยนสถานะเป็น ${result.value} แล้ว` });
            fetchInvoices();
          } else {
            Toast.fire({ icon: 'error', title: 'อัปเดตไม่สำเร็จ' });
          }
        } catch (err) {
          Toast.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-100 text-emerald-700';
      case 'CHECKING': return 'bg-amber-100 text-amber-700';
      case 'REJECTED': return 'bg-rose-100 text-rose-700';
      case 'OVERDUE': return 'bg-rose-100 text-rose-700 font-extrabold';
      case 'PENDING': return 'bg-[#376B64]/10 text-[#376B64]';
      case 'PARTIAL': return 'bg-orange-100 text-orange-700 font-bold';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-[#376B64]">
      <RefreshCw className="animate-spin mb-4" size={40} />
      <span className="font-bold text-lg">กำลังโหลดข้อมูล...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Action Card */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Receipt className="text-[#376B64]" size={32} /> ระบบจัดการบิล
            </h1>
            <p className="text-sm text-gray-500 mt-2">เรียงลำดับตาม: รอบบิลเก่าที่สุด และบ้านเลขที่น้อยไปมาก</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link href="/admin/settings" className="flex items-center justify-center px-5 py-2.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-sm transition-all shadow-sm">
              <Settings size={16} className="mr-2" /> ตั้งค่า
            </Link>

            <button
              onClick={handleCreateBillChoice}
              className="flex items-center justify-center px-6 py-2.5 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={18} className="mr-1" /> สร้างบิลใหม่
            </button>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-1/4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาบ้านเลขที่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[1.25rem] focus:ring-4 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-medium text-gray-700"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-[1.25rem] px-4 py-3 min-w-max hover:border-[#376B64]/30 transition-colors">
              <Filter size={16} className="text-[#376B64] mr-2" />
              <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold outline-none text-gray-700 cursor-pointer">
                <option value={0}>ทุกเดือน</option>
                {thaiMonths.map(m => <option key={m.num} value={m.num}>{m.full}</option>)}
              </select>
            </div>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-[1.25rem] px-4 py-3 min-w-max hover:border-[#376B64]/30 transition-colors">
              <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="bg-transparent text-sm font-bold outline-none text-gray-700 cursor-pointer">
                <option value={0}>ทุกปี</option>
                {availableYears.map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-[1.25rem] px-4 py-3 min-w-max hover:border-[#376B64]/30 transition-colors">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-gray-700 cursor-pointer">
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
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative">

          {/* Bulk Actions Bar */}
          {selectedInvoices.length > 0 && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-6 py-4 border-b border-teal-100 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in z-10 relative shadow-sm">
              <span className="text-sm font-bold text-teal-800 flex items-center gap-2">
                <span className="flex items-center justify-center bg-[#376B64] text-white w-7 h-7 rounded-full text-xs shadow-sm">{selectedInvoices.length}</span> รายการที่เลือก
              </span>

              <div className="flex flex-1 items-center w-full">
                <div className="flex-1" />
                <div className="flex items-center justify-center border-l border-teal-200 px-6">
                  <button
                    onClick={() => handleDelete()}
                    className="flex items-center px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition shadow-sm hover:shadow active:scale-[0.98] whitespace-nowrap"
                  >
                    <Trash2 size={14} className="mr-1.5" /> ลบข้อมูลที่เลือก
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 border-l border-teal-200 px-4">
                  <button onClick={() => handleBulkNotify('SEND')} className="flex items-center px-4 py-2 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold rounded-xl transition shadow-sm hover:shadow active:scale-[0.98]">
                    <Send size={14} className="mr-1.5" /> ส่งบิล
                  </button>
                  <button onClick={() => handleBulkNotify('REMINDER')} className="flex items-center px-4 py-2 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold rounded-xl transition shadow-sm hover:shadow active:scale-[0.98]">
                    <Clock size={14} className="mr-1.5" /> ทวงล่วงหน้า
                  </button>
                  <button onClick={() => handleBulkNotify('OVERDUE')} className="flex items-center px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition shadow-sm hover:shadow active:scale-[0.98]">
                    <AlertCircle size={14} className="mr-1.5" /> ทวงยอดค้าง
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                      onChange={handleSelectAll}
                      checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    />
                  </th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide">บ้านเลขที่</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide">ประจำเดือน</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide">ยอดชำระ</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide">สถานะ</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-gray-100">จัดการบิล</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-gray-100">แจ้งเตือนผ่าน LINE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <Search className="mx-auto text-gray-300 mb-4" size={48} />
                      <h3 className="text-lg font-bold text-gray-700 mb-1">ไม่พบบิล</h3>
                      <p className="text-gray-500">ลองเปลี่ยนคำค้นหาหรือตัวกรองเดือน/ปี ดูสิ</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const thMonth = thaiMonths.find(m => m.num === inv.billingMonth)?.short || inv.billingMonth;
                    const isSelected = selectedInvoices.includes(inv.id);

                    return (
                      <tr key={inv.id} className={`transition-colors hover:bg-gray-50/50 ${isSelected ? 'bg-teal-50/30' : ''}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleSelectOne(inv.id)}
                          />
                        </td>
                        <td className="py-4 px-2">
                          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-sm border ${isSelected ? 'bg-teal-100 text-[#376B64] border-teal-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {inv.house?.houseNo || '-'}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-gray-700 font-bold text-sm">{thMonth} {inv.billingYear + 543}</td>
                        <td className="py-4 px-2">
                          <div className="flex flex-col font-bold">
                            <span className="text-gray-900 text-base">{Number(inv.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                            
                            {inv.status === 'PARTIAL' && (
                              <span className="text-[10px] text-orange-600 bg-orange-100 px-2 py-0.5 rounded mt-1 w-fit">ยอดคงเหลือ</span>
                            )}
                            
                            {inv.penaltyAmount > 0 && <span className="text-[11px] text-rose-500 font-medium mt-0.5">(รวมค่าปรับ {Number(inv.penaltyAmount).toLocaleString('th-TH')} ฿)</span>}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>

                        <td className="py-4 px-4 border-l border-gray-50">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="flex bg-gray-50 p-1.5 rounded-xl gap-1.5 border border-gray-200/60 shadow-sm">
                              <button onClick={() => handleEditAmount(inv)} className="group relative p-2 text-gray-500 hover:text-[#376B64] hover:bg-[#376B64]/10 hover:shadow-sm rounded-lg transition-all">
                                <Edit size={16} />
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 hidden whitespace-nowrap rounded bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white group-hover:block z-10 shadow-lg">แก้ไขยอดเงิน</span>
                              </button>
                              <button onClick={() => handleResetInvoice(inv.id, inv.status)} className="group relative p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 hover:shadow-sm rounded-lg transition-all">
                                <RefreshCw size={16} />
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 hidden whitespace-nowrap rounded bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white group-hover:block z-10 shadow-lg">เปลี่ยนสถานะ</span>
                              </button>
                              <button onClick={() => handleDelete(inv.id)} className="group relative p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 hover:shadow-sm rounded-lg transition-all">
                                <Trash2 size={16} />
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 hidden whitespace-nowrap rounded bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white group-hover:block z-10 shadow-lg">ลบบิลนี้</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 border-l border-gray-50">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button onClick={() => handleNotify(inv.id, 'SEND')} className="flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[11px] font-bold transition border border-blue-100 active:scale-95">
                              <Send size={12} className="mr-1.5" /> ส่งบิล
                            </button>
                            <button onClick={() => handleNotify(inv.id, 'REMINDER')} className="flex items-center px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-[11px] font-bold transition border border-orange-100 active:scale-95">
                              <Clock size={12} className="mr-1.5" /> ทวงล่วงหน้า
                            </button>
                            <button onClick={() => handleNotify(inv.id, 'OVERDUE')} className="flex items-center px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[11px] font-bold transition border border-rose-100 active:scale-95">
                              <AlertCircle size={12} className="mr-1.5" /> ทวงยอดค้าง
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

      {/* Custom Calendar Modal แบบสวยๆ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-gray-100 animate-in zoom-in-95 duration-200 relative">

            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2.5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8 mt-2">
              <div className="w-16 h-16 bg-[#376B64]/10 text-[#376B64] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#376B64]/20">
                <Plus size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">ระบุรอบบิล</h2>
              <p className="text-gray-500 text-sm mt-2">
                {targetHouseNo ? <span>สร้างบิลให้บ้านเลขที่ <span className="font-bold text-[#376B64] bg-[#376B64]/10 px-2 py-0.5 rounded-md">{targetHouseNo}</span></span> : 'สร้างบิลให้ลูกบ้านทุกคนในโครงการ'}
              </p>
            </div>

            <div className="bg-gray-50 p-5 rounded-3xl border border-gray-200 mb-8 shadow-inner">
              <div className="flex items-center justify-between mb-5 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
                <button onClick={() => setSelectedYear(y => y - 1)} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors hover:shadow-sm">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">ปี พ.ศ.</span>
                  <span className="font-black text-[#376B64] text-xl">{selectedYear + 543}</span>
                </div>
                <button onClick={() => setSelectedYear(y => y + 1)} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors hover:shadow-sm">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {thaiMonths.map((m) => (
                  <button
                    key={m.num}
                    onClick={() => setSelectedMonth(m.num)}
                    className={`py-3 rounded-2xl text-sm font-bold transition-all ${selectedMonth === m.num ? 'bg-[#376B64] text-white shadow-md shadow-[#376B64]/30 scale-105' : 'bg-white text-gray-600 hover:bg-[#376B64]/10 hover:text-[#376B64] border border-gray-200'}`}
                  >
                    {m.short}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">ยกเลิก</button>
              <button onClick={submitGenerateInvoices} className="flex-1 py-4 rounded-2xl font-bold text-white bg-[#376B64] hover:bg-[#2A524C] shadow-lg shadow-[#376B64]/30 transition-all active:scale-[0.98]">ยืนยันสร้างบิล</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}ฆ