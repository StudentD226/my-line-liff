"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  DollarSign, Home, AlertTriangle, Search, 
  Calendar, User, Phone, Loader2, AlertCircle, 
  ArrowUpDown, ChevronDown, CheckCircle 
} from "lucide-react";
import Swal from "sweetalert2";

export default function DebtTrackerPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("debt-desc"); 
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🌟 (ข้อ 3) ระบบจำลองสิทธิ์ผู้ใช้งาน (RBAC)
  // TODO: ในอนาคตลูกพี่สามารถดึงค่านี้มาจาก Session หรือ Context ได้เลยครับ
  const [userRole, setUserRole] = useState<"SUPERADMIN" | "ADMIN" | "VIEWER">("SUPERADMIN");
  
  // เช็คสิทธิ์การส่งแจ้งเตือน (Superadmin ทำได้ทุกอย่าง นิติทำได้บางอย่าง)
  const canNotify = userRole === "SUPERADMIN" || userRole === "ADMIN";

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

  // 🌟 (ข้อ 1 & 5) ปรับปุ่มตกลงอยู่ซ้าย สี #376B64 และใช้คำทางการ
  const handleNotifyDebt = async (item: any) => {
    const result = await Swal.fire({
      title: 'ยืนยันการส่งแจ้งเตือน?',
      html: `ต้องการส่งข้อความแจ้งเตือนยอดค้างชำระไปยังบ้านเลขที่ <b>${item.houseNumber}</b> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: false, // 🌟 ปุ่มตกลงอยู่ซ้ายเสมอ
      confirmButtonColor: '#376B64', 
      cancelButtonColor: '#94a3b8', 
      confirmButtonText: 'ยืนยันการส่ง',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-6', cancelButton: 'rounded-xl font-bold px-6' }
    });

    if (result.isConfirmed) {
      await processNotification([item]);
    }
  };

  const handleBulkNotify = async () => {
    const itemsToNotify = debts.filter(d => selectedIds.includes(d.id));
    
    const result = await Swal.fire({
      title: 'ยืนยันการส่งแจ้งเตือนแบบกลุ่ม?',
      html: `ระบบจะดำเนินการส่งแจ้งเตือนไปยังบ้านพักจำนวน <b>${itemsToNotify.length} หลัง</b> ยืนยันหรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: false, // 🌟 ปุ่มตกลงอยู่ซ้ายเสมอ
      confirmButtonColor: '#376B64', 
      cancelButtonColor: '#94a3b8', 
      confirmButtonText: `ยืนยันการส่ง ${itemsToNotify.length} รายการ`,
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-6', cancelButton: 'rounded-xl font-bold px-6' }
    });

    if (result.isConfirmed) {
      await processNotification(itemsToNotify);
      setSelectedIds([]); 
    }
  };

  const processNotification = async (items: any[]) => {
    Swal.fire({
      title: 'กำลังดำเนินการ...',
      text: `ส่งข้อความแล้ว 0 / ${items.length} รายการ`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); },
      customClass: { popup: 'rounded-[2rem]' }
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const res = await fetch("/api/admin-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: item.latestInvoiceId,
            type: "OVERDUE"
          }),
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
      Swal.update({ text: `ส่งข้อความแล้ว ${i + 1} / ${items.length} รายการ` });
    }

    if (failCount === 0) {
      Swal.fire({
        icon: 'success',
        title: 'ดำเนินการสำเร็จ',
        text: `จัดส่งข้อความแจ้งเตือนครบทั้ง ${successCount} รายการเรียบร้อยแล้ว`,
        confirmButtonColor: '#376B64',
        reverseButtons: false,
        confirmButtonText: 'ตกลง',
        customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-8' }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'ดำเนินการสำเร็จบางส่วน',
        text: `จัดส่งสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`,
        confirmButtonColor: '#376B64',
        reverseButtons: false,
        confirmButtonText: 'ตกลง',
        customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-8' }
      });
    }
  };

  // 🌟 (ข้อ 2) ใช้ useMemo จัดการคำนวณ เพื่อให้เว็บไม่ต้องคิดใหม่ซ้ำซ้อนตอนพิมพ์ค้นหา เร็วขึ้นแน่นอน!
  const totalAmountToCollect = useMemo(() => debts.reduce((sum, item) => sum + item.totalOwed, 0), [debts]);
  const totalHousesInDebt = useMemo(() => debts.length, [debts]);

  const filteredDebts = useMemo(() => {
    return debts.filter((item) =>
      item.houseNumber.includes(searchTerm) || (item.ownerName && item.ownerName.includes(searchTerm))
    );
  }, [debts, searchTerm]);

  const sortedDebts = useMemo(() => {
    return [...filteredDebts].sort((a, b) => {
      if (sortBy === "debt-desc") return b.totalOwed - a.totalOwed;
      if (sortBy === "debt-asc") return a.totalOwed - b.totalOwed;
      if (sortBy === "month-desc") return b.overdueCount - a.overdueCount;
      if (sortBy === "house-asc") return a.houseNumber.localeCompare(b.houseNumber, 'th');
      return 0;
    });
  }, [filteredDebts, sortBy]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedDebts.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  }, [sortedDebts]);

  const handleSelectOne = useCallback((e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="text-[#376B64] animate-spin mb-4" size={40} />
        <div className="text-[#376B64] font-bold text-lg">กำลังโหลดข้อมูลบัญชี...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen w-full relative">
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนรายการค้างชำระ</p>
            <p className="text-3xl font-black text-amber-500">
              {totalHousesInDebt} <span className="text-base font-medium text-slate-500">ยูนิต</span>
            </p>
          </div>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Home size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {selectedIds.length === 0 && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between transition-all">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาเลขที่บ้าน หรือชื่อผู้พักอาศัย..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#376B64] outline-none transition-all font-medium bg-slate-50"
            />
          </div>

          <div className="relative flex items-center w-full sm:w-auto">
            <ArrowUpDown size={16} className="absolute left-4 text-slate-400 pointer-events-none" />
            {/* 🌟 (ข้อ 7,9) ยกเลิก UI ดั้งเดิม (appearance-none) แล้วใส่ลูกศร ChevronDown เอง */}
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl pl-11 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-[#376B64] cursor-pointer appearance-none font-medium"
            >
              <option value="debt-desc">เรียงตามยอดค้าง (มากไปน้อย)</option>
              <option value="debt-asc">เรียงตามยอดค้าง (น้อยไปมาก)</option>
              <option value="month-desc">จำนวนเดือน (มากไปน้อย)</option>
              <option value="house-asc">เลขที่ยูนิต (ก - ฮ)</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all">
        
        {/* แถบ Contextual สำหรับการทำงานแบบกลุ่ม */}
        {selectedIds.length > 0 && (
          <div className="bg-[#111827] px-4 sm:px-6 py-3.5 flex flex-wrap gap-4 items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="bg-[#376B64] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                {selectedIds.length}
              </div>
              <span className="text-white font-bold text-sm sm:text-base">รายการที่เลือก</span>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button 
                onClick={() => setSelectedIds([])} 
                className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-medium transition-colors border border-slate-700"
              >
                ยกเลิกการเลือก
              </button>
              {/* 🌟 (ข้อ 3) ถ้าเป็น Viewer จะไม่เห็นปุ่มนี้ */}
              {canNotify && (
                <button 
                  onClick={handleBulkNotify} 
                  className="px-4 py-2 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-[#376B64]/30"
                >
                  <AlertCircle size={16} /> 
                  <span className="hidden sm:inline-block">แจ้งเตือนรายการที่เลือก</span>
                  <span className="sm:hidden">แจ้งเตือน</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 sm:p-5 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 cursor-pointer accent-[#376B64] rounded border-slate-300"
                    checked={sortedDebts.length > 0 && selectedIds.length === sortedDebts.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 sm:p-5">บ้านเลขที่</th>
                <th className="p-4 sm:p-5 text-center">จำนวนรอบบิลที่ค้าง</th>
                <th className="p-4 sm:p-5 text-right">ยอดค้างชำระสุทธิ</th>
                <th className="p-4 sm:p-5 text-center">รอบบิลล่าสุดที่ชำระ</th>
                <th className="p-4 sm:p-5 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
              {sortedDebts.length > 0 ? (
                sortedDebts.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(item.id) ? 'bg-[#376B64]/5' : ''}`}>
                    <td className="p-4 sm:p-5 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 cursor-pointer accent-[#376B64] rounded border-slate-300"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => handleSelectOne(e, item.id)}
                      />
                    </td>
                    <td className="p-4 sm:p-5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg w-max mb-1">
                          {item.houseNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          <User size={12} className="text-slate-400" /> {item.ownerName !== "-" ? item.ownerName : "ยังไม่ได้ระบุชื่อ"}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} className="text-slate-400" /> {item.phone !== "-" ? item.phone : "ไม่มีข้อมูลติดต่อ"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                      <div className="relative inline-block group">
                        {/* 🌟 (ข้อ 5) เอาอิโมจิออก เปลี่ยนมาใช้ไอคอน Lucide แทน */}
                        <span className={`flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          item.overdueCount >= 3 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          <AlertCircle size={14} strokeWidth={2.5} /> ค้างชำระ {item.overdueCount} รอบบิล
                        </span>
                        
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max min-w-[140px] p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl z-50 text-center leading-relaxed font-medium">
                          {item.overdueMonths && item.overdueMonths.length > 0 ? (
                            item.overdueMonths.map((m: string, i: number) => (
                              <div key={i} className="py-1 border-b border-slate-700 last:border-0">{m}</div>
                            ))
                          ) : (
                            "ไม่ระบุรอบบิล"
                          )}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-right whitespace-nowrap font-black text-rose-600 text-base">
                      {item.totalOwed.toLocaleString()} <span className="text-xs font-medium text-slate-400">บาท</span>
                    </td>
                    <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                      <span className="text-slate-600 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1.5 w-max mx-auto shadow-sm">
                        <Calendar size={14} />
                        {item.lastPaidMonth}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                      {/* 🌟 (ข้อ 3) สิทธิ์ Viewer จะไม่เห็นปุ่มแจ้งเตือนรายบุคคล */}
                      {canNotify ? (
                        <button 
                          onClick={() => handleNotifyDebt(item)}
                          className="flex items-center justify-center gap-1.5 mx-auto px-4 py-2 bg-[#376B64]/10 text-[#376B64] hover:bg-[#376B64] hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                        >
                          <AlertCircle size={14} strokeWidth={2.5} />
                          แจ้งเตือน
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">ไม่มีสิทธิ์จัดการ</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    {/* 🌟 (ข้อ 5) ถอดอิโมจิปาร์ตี้ออก ใช้ความทางการ */}
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle className="text-emerald-500 mb-3" size={40} strokeWidth={2} />
                      <p className="text-slate-700 font-bold text-base">ไม่พบข้อมูลบัญชีลูกหนี้ค้างชำระ</p>
                      <p className="text-slate-400 text-sm mt-1">ยอดเยี่ยมมาก! ไม่มีลูกบ้านที่ค้างชำระในขณะนี้</p>
                    </div>
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