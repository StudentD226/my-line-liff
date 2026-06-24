"use client";
import React, { useState, useEffect } from "react";
import { 
  DollarSign, Home, AlertTriangle, Search, 
  Calendar, User, Phone, Loader2, AlertCircle, ArrowUpDown
} from "lucide-react";
import Swal from "sweetalert2";

export default function DebtTrackerPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("debt-desc"); // 🌟 State สำหรับจัดการ Sorting

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = () => {
    setIsLoading(true);
    fetch("/api/admin/debts", { cache: 'no-store' })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setDebts(result.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        setIsLoading(false);
      });
  };

  // 🌟 ฟังก์ชันกดทวงหนี้ + SweetAlert2 (ปุ่มตกลงอยู่ขวา)
  const handleNotifyDebt = async (item: any) => {
    const result = await Swal.fire({
      title: 'ยืนยันการทวงยอดค้าง?',
      html: `ต้องการส่งแจ้งเตือนผ่าน LINE ไปยังบ้านเลขที่ <b>${item.houseNumber}</b> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444', // สีแดง
      cancelButtonColor: '#F3F4F6', // สีเทาอ่อน
      confirmButtonText: 'ตกลง, ส่งแจ้งเตือน',
      cancelButtonText: '<span style="color: #4B5563">ยกเลิก</span>',
      reverseButtons: true, // 🌟 บังคับปุ่มตกลงไปอยู่ด้านขวา
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'กำลังส่งแจ้งเตือน...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
      });

      try {
        const res = await fetch("/api/admin-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: item.latestInvoiceId, // ส่ง ID ของบิลที่ค้างล่าสุดไป
            type: "OVERDUE"           // ส่ง type ไปให้โค้ดการ์ดส้ม/แดง ทำงาน
          }),
        });

        const data = await res.json();
        
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'ส่งแจ้งเตือนสำเร็จ!',
            text: `ทวงยอดค้างบ้าน ${item.houseNumber} เรียบร้อยแล้ว`,
            confirmButtonColor: '#376B64',
          });
        } else {
          throw new Error(data.error || "ไม่สามารถส่งแจ้งเตือนได้");
        }
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err.message,
          confirmButtonColor: '#EF4444',
        });
      }
    }
  };

  const totalAmountToCollect = debts.reduce((sum, item) => sum + item.totalOwed, 0);
  const totalHousesInDebt = debts.length;

  // 🌟 ระบบค้นหา
  const filteredDebts = debts.filter((item) =>
    item.houseNumber.includes(searchTerm) || (item.ownerName && item.ownerName.includes(searchTerm))
  );

  // 🌟 ระบบ Sorting
  const sortedDebts = [...filteredDebts].sort((a, b) => {
    if (sortBy === "debt-desc") return b.totalOwed - a.totalOwed;
    if (sortBy === "debt-asc") return a.totalOwed - b.totalOwed;
    if (sortBy === "month-desc") return b.overdueCount - a.overdueCount;
    if (sortBy === "house-asc") return a.houseNumber.localeCompare(b.houseNumber, 'th');
    return 0;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="text-[#1A534B] animate-spin mb-4" size={40} />
        <div className="text-[#1A534B] font-bold text-lg">กำลังโหลดข้อมูลหนี้สิน...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="text-rose-500" size={28} />
          บัญชีลูกหนี้ค้างชำระ
        </h1>
        <p className="text-sm text-slate-500 mt-1">สรุปข้อมูลยอดค้างชำระทั้งหมดในระบบ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดเงินรวมที่ค้างชำระ</p>
            <p className="text-3xl font-black text-rose-600">
              {totalAmountToCollect.toLocaleString()} <span className="text-base font-medium text-slate-500">บาท</span>
            </p>
          </div>
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
            <DollarSign size={28} strokeWidth={2.5} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนบ้านที่ค้างชำระ</p>
            <p className="text-3xl font-black text-amber-500">
              {totalHousesInDebt} <span className="text-base font-medium text-slate-500">หลัง</span>
            </p>
          </div>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Home size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* 🌟 แถบเครื่องมือ: ค้นหา + เรียงลำดับ */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="ค้นหาเลขที่บ้าน หรือชื่อลูกบ้าน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ArrowUpDown size={16} className="text-slate-400" />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1A534B] cursor-pointer"
          >
            <option value="debt-desc">ยอดหนี้ (มากไปน้อย)</option>
            <option value="debt-asc">ยอดหนี้ (น้อยไปมาก)</option>
            <option value="month-desc">เดือนที่ค้าง (มากไปน้อย)</option>
            <option value="house-asc">เลขที่บ้าน (ก - ฮ)</option>
          </select>
        </div>
      </div>

      {/* 🌟 ตาราง (แก้ Responsive ให้เลื่อนซ้ายขวาได้ ไม่บีบคำ) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 sm:p-5">บ้านเลขที่</th>
                <th className="p-4 sm:p-5 text-center">จำนวนเดือนที่ค้าง</th>
                <th className="p-4 sm:p-5 text-right">ยอดค้างทั้งหมด</th>
                <th className="p-4 sm:p-5 text-center">เดือนล่าสุดที่จ่าย</th>
                <th className="p-4 sm:p-5 text-center">แจ้งเตือน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
              {sortedDebts.length > 0 ? (
                sortedDebts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 sm:p-5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg w-max mb-1">
                          {item.houseNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <User size={12} /> {item.ownerName !== "-" ? item.ownerName : "ยังไม่ระบุชื่อเจ้าของ"}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={12} /> {item.phone !== "-" ? item.phone : "ไม่มีเบอร์ติดต่อ"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                      <div className="relative inline-block group">
                        <span className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          item.overdueCount >= 3 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          ค้าง {item.overdueCount} เดือน ⚠️
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-right whitespace-nowrap font-black text-rose-600 text-base">
                      {item.totalOwed.toLocaleString()} <span className="text-xs font-medium text-slate-400">บาท</span>
                    </td>
                    <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                      <span className="text-slate-600 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1 w-max mx-auto">
                        <Calendar size={12} />
                        {item.lastPaidMonth}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                      {/* 🌟 ปุ่มทวงยอดค้างสีแดงแบบคลีนๆ */}
                      <button 
                        onClick={() => handleNotifyDebt(item)}
                        className="flex items-center justify-center gap-1.5 mx-auto px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-100 hover:border-rose-500 active:scale-95"
                      >
                        <AlertCircle size={14} strokeWidth={2.5} />
                        ทวงยอดค้าง
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 font-bold">
                    ไม่พบข้อมูลลูกบ้านที่ค้างชำระ 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}