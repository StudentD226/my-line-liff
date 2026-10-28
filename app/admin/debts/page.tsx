"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  DollarSign, Home, AlertTriangle, Search, 
  Calendar, User, Phone, Loader2, AlertCircle, 
  ArrowUpDown, ChevronDown, CheckCircle, CheckCircle2,
  Eye, X, ChevronRight, ShieldCheck, CreditCard, Sparkles
} from "lucide-react";
import Swal from "sweetalert2";
import { useAdminRole } from "@/lib/admin-role";
import { defaultSwalConfig } from "@/lib/swal-helper";

type MainTabType = "DEBTS" | "ADVANCES";
type DetailModalMode = "DEBT" | "ADVANCE";

export default function DebtTrackerPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // แท็บหลัก: "DEBTS" (ลูกหนี้ค้างชำระ) หรือ "ADVANCES" (ชำระล่วงหน้า)
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>("DEBTS");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortByDebts, setSortByDebts] = useState("debt-desc");
  const [sortByAdvances, setSortByAdvances] = useState("adv-amount-desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // State สำหรับ Modal แสดงรายละเอียดรอบบิล (รองรับทั้งดูหนี้ค้าง และดูชำระล่วงหน้า)
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<any | null>(null);
  const [detailModalMode, setDetailModalMode] = useState<DetailModalMode>("DEBT");
  const [detailYearFilter, setDetailYearFilter] = useState<string>("ALL");
  const [detailSearch, setDetailSearch] = useState<string>("");

  const { isSuperAdmin, isAdmin } = useAdminRole();
  const canNotify = isAdmin || isSuperAdmin;

  useEffect(() => {
    fetchDebts();
  }, []);

  // ปิด Modal เมื่อกดปุ่ม Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedItemForDetail(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchDebts = () => {
    setIsLoading(true);
    fetch("/api/admin/debts", { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setDebts(result.debts || result.data || []);
          setAdvances(result.advances || []);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching debts & advances:", err);
        setIsLoading(false);
      });
  };

  const openDetailModal = (item: any, mode: DetailModalMode) => {
    setSelectedItemForDetail(item);
    setDetailModalMode(mode);
    setDetailYearFilter("ALL");
    setDetailSearch("");
  };

  // จัดการส่งแจ้งเตือนยอดค้างชำระ
  const handleNotifyDebt = async (item: any) => {
    const result = await Swal.fire({
      ...defaultSwalConfig,
      title: "ยืนยันการส่งแจ้งเตือน?",
      html: `ต้องการส่งข้อความแจ้งเตือนยอดค้างชำระไปยังบ้านเลขที่ <b>${item.houseNumber}</b> ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยันการส่ง",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      await processNotification([item]);
    }
  };

  const handleBulkNotify = async () => {
    const itemsToNotify = debts.filter((d) => selectedIds.includes(d.id));
    
    const result = await Swal.fire({
      ...defaultSwalConfig,
      title: "ยืนยันการส่งแจ้งเตือนแบบกลุ่ม?",
      html: `ระบบจะดำเนินการส่งแจ้งเตือนไปยังบ้านพักจำนวน <b>${itemsToNotify.length} หลัง</b> ยืนยันหรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `ยืนยันการส่ง ${itemsToNotify.length} รายการ`,
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      await processNotification(itemsToNotify);
      setSelectedIds([]); 
    }
  };

  const processNotification = async (items: any[]) => {
    Swal.fire({
      title: "กำลังดำเนินการ...",
      text: `ส่งข้อความแล้ว 0 / ${items.length} รายการ`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); },
      customClass: { popup: "rounded-[2rem]" }
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
        icon: "success",
        title: "ดำเนินการสำเร็จ",
        text: `จัดส่งข้อความแจ้งเตือนครบทั้ง ${successCount} รายการเรียบร้อยแล้ว`,
        confirmButtonColor: "#376B64",
        reverseButtons: false,
        confirmButtonText: "ตกลง",
        customClass: { popup: "rounded-[2rem]", confirmButton: "rounded-xl font-bold px-8" }
      });
    } else {
      Swal.fire({
        icon: "warning",
        title: "ดำเนินการสำเร็จบางส่วน",
        text: `จัดส่งสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`,
        confirmButtonColor: "#376B64",
        reverseButtons: false,
        confirmButtonText: "ตกลง",
        customClass: { popup: "rounded-[2rem]", confirmButton: "rounded-xl font-bold px-8" }
      });
    }
  };

  // สรุปยอดหนี้ค้างชำระ (Tab 1: Debts)
  const totalAmountToCollect = useMemo(() => debts.reduce((sum, item) => sum + item.totalOwed, 0), [debts]);
  const totalHousesInDebt = useMemo(() => debts.length, [debts]);

  // สรุปยอดชำระล่วงหน้า (Tab 2: Advances)
  const totalAdvanceAmount = useMemo(() => advances.reduce((sum, item) => sum + item.totalAdvanceAmount, 0), [advances]);
  const totalAdvanceHouses = useMemo(() => advances.length, [advances]);
  const totalAdvanceCycles = useMemo(() => advances.reduce((sum, item) => sum + item.advanceCount, 0), [advances]);

  // คัดกรองและเรียงลำดับรายการค้างชำระ
  const filteredDebts = useMemo(() => {
    return debts.filter((item) =>
      item.houseNumber.includes(searchTerm) || (item.ownerName && item.ownerName.includes(searchTerm))
    );
  }, [debts, searchTerm]);

  const sortedDebts = useMemo(() => {
    return [...filteredDebts].sort((a, b) => {
      if (sortByDebts === "debt-desc") return b.totalOwed - a.totalOwed;
      if (sortByDebts === "debt-asc") return a.totalOwed - b.totalOwed;
      if (sortByDebts === "month-desc") return b.overdueCount - a.overdueCount;
      if (sortByDebts === "house-asc") return a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true, sensitivity: "base" });
      return 0;
    });
  }, [filteredDebts, sortByDebts]);

  // คัดกรองและเรียงลำดับรายการชำระล่วงหน้า
  const filteredAdvances = useMemo(() => {
    return advances.filter((item) =>
      item.houseNumber.includes(searchTerm) || (item.ownerName && item.ownerName.includes(searchTerm))
    );
  }, [advances, searchTerm]);

  const sortedAdvances = useMemo(() => {
    return [...filteredAdvances].sort((a, b) => {
      if (sortByAdvances === "adv-amount-desc") return b.totalAdvanceAmount - a.totalAdvanceAmount;
      if (sortByAdvances === "adv-amount-asc") return a.totalAdvanceAmount - b.totalAdvanceAmount;
      if (sortByAdvances === "adv-count-desc") return b.advanceCount - a.advanceCount;
      if (sortByAdvances === "house-asc") return a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true, sensitivity: "base" });
      return 0;
    });
  }, [filteredAdvances, sortByAdvances]);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedDebts.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  }, [sortedDebts]);

  const handleSelectOne = useCallback((e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  }, []);

  // รายการรอบบิลของบ้านที่เลือกดูใน Modal (รองรับทั้งหนี้ค้างและชำระล่วงหน้า)
  const detailItems = useMemo(() => {
    if (!selectedItemForDetail) return [];

    if (detailModalMode === "DEBT") {
      if (selectedItemForDetail.overdueDetails && selectedItemForDetail.overdueDetails.length > 0) {
        return selectedItemForDetail.overdueDetails;
      }
      const rawMonths: string[] = selectedItemForDetail.overdueMonths || [];
      return rawMonths.map((m: string, idx: number) => {
        const parts = m.trim().split(" ");
        const monthName = parts[0] || m;
        const yearThai = parts[1] ? parseInt(parts[1], 10) : 0;
        return {
          id: `m-debt-${idx}`,
          invoiceNo: "-",
          billingMonth: 0,
          billingYear: yearThai ? yearThai - 543 : 0,
          yearThai: yearThai || 0,
          monthName,
          monthLabel: m,
          baseAmount: 0,
          penaltyAmount: 0,
          totalAmount: 0,
          paidAmount: 0,
          outstandingAmount: 0,
          amount: 0,
          status: "OVERDUE",
          dueDate: null,
        };
      });
    } else {
      // ADVANCE Mode
      if (selectedItemForDetail.advanceDetails && selectedItemForDetail.advanceDetails.length > 0) {
        return selectedItemForDetail.advanceDetails;
      }
      const rawMonths: string[] = selectedItemForDetail.advanceMonths || [];
      return rawMonths.map((m: string, idx: number) => {
        const parts = m.trim().split(" ");
        const monthName = parts[0] || m;
        const yearThai = parts[1] ? parseInt(parts[1], 10) : 0;
        return {
          id: `m-adv-${idx}`,
          invoiceNo: "-",
          billingMonth: 0,
          billingYear: yearThai ? yearThai - 543 : 0,
          yearThai: yearThai || 0,
          monthName,
          monthLabel: m,
          baseAmount: 0,
          penaltyAmount: 0,
          totalAmount: 0,
          paidAmount: 0,
          outstandingAmount: 0,
          amount: 0,
          status: "PAID",
          dueDate: null,
        };
      });
    }
  }, [selectedItemForDetail, detailModalMode]);

  const detailAvailableYears = useMemo(() => {
    const years = Array.from(
      new Set(detailItems.map((item: any) => item.yearThai).filter(Boolean))
    ).sort((a: any, b: any) => b - a);
    return years;
  }, [detailItems]);

  const filteredDetailItems = useMemo(() => {
    let list = detailItems;
    if (detailYearFilter !== "ALL") {
      list = list.filter((item: any) => String(item.yearThai) === String(detailYearFilter));
    }
    if (detailSearch.trim()) {
      const q = detailSearch.trim().toLowerCase();
      list = list.filter((item: any) =>
        (item.monthLabel && item.monthLabel.toLowerCase().includes(q)) ||
        (item.monthName && item.monthName.toLowerCase().includes(q)) ||
        (item.invoiceNo && item.invoiceNo.toLowerCase().includes(q))
      );
    }
    return list;
  }, [detailItems, detailYearFilter, detailSearch]);

  const groupedDetailByYear = useMemo(() => {
    const groups: { [key: string]: { year: any; items: any[]; totalAmount: number } } = {};
    filteredDetailItems.forEach((item: any) => {
      const key = item.yearThai ? `ปี พ.ศ. ${item.yearThai}` : "รอบบิล";
      if (!groups[key]) {
        groups[key] = {
          year: item.yearThai,
          items: [],
          totalAmount: 0,
        };
      }
      groups[key].items.push(item);
      const val = detailModalMode === "DEBT" 
        ? (item.outstandingAmount || item.amount || 0)
        : (item.paidAmount || item.amount || 0);
      groups[key].totalAmount += val;
    });
    return groups;
  }, [filteredDetailItems, detailModalMode]);

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
      {/* ส่วนหัวหน้าเว็บ */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {activeMainTab === "DEBTS" ? (
            <>
              <AlertTriangle className="text-rose-500" size={28} />
              <span>บัญชีลูกหนี้ค้างชำระ</span>
            </>
          ) : (
            <>
              <ShieldCheck className="text-[#376B64]" size={28} />
              <span>บัญชีผู้ชำระล่วงหน้า</span>
            </>
          )}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {activeMainTab === "DEBTS" 
            ? "สรุปข้อมูลยอดค้างชำระและรายการหนี้สินทั้งหมดในระบบ" 
            : "สรุปรายชื่อบ้านพักที่ได้ชำระเงินค่าส่วนกลางล่วงหน้าในระบบ"}
        </p>
      </div>

      {/* แถบเลือกแท็บหลัก (Main Tabs) */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 sm:gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveMainTab("DEBTS");
            setSearchTerm("");
          }}
          className={`pb-3 px-2 sm:px-3 text-sm sm:text-base font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === "DEBTS"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <AlertTriangle size={18} className={activeMainTab === "DEBTS" ? "text-rose-500" : "text-slate-400"} />
          <span>ลูกหนี้ค้างชำระ</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
            activeMainTab === "DEBTS" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
          }`}>
            {debts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab("ADVANCES");
            setSearchTerm("");
            setSelectedIds([]);
          }}
          className={`pb-3 px-2 sm:px-3 text-sm sm:text-base font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeMainTab === "ADVANCES"
              ? "border-[#376B64] text-[#376B64]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <CheckCircle size={18} className={activeMainTab === "ADVANCES" ? "text-[#376B64]" : "text-slate-400"} />
          <span>ชำระล่วงหน้า</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
            activeMainTab === "ADVANCES" ? "bg-[#376B64]/15 text-[#376B64]" : "bg-slate-100 text-slate-500"
          }`}>
            {advances.length}
          </span>
        </button>
      </div>

      {/* การ์ดสถิติภาพรวม (KPI Stat Cards) */}
      {activeMainTab === "DEBTS" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-in fade-in duration-200">
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดเงินชำระล่วงหน้ารวม</p>
              <p className="text-3xl font-black text-[#376B64]">
                {totalAdvanceAmount.toLocaleString()} <span className="text-base font-medium text-slate-500">บาท</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-[#376B64]/10 rounded-2xl flex items-center justify-center text-[#376B64]">
              <CreditCard size={28} strokeWidth={2.5} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนบ้านที่ชำระล่วงหน้า</p>
              <p className="text-3xl font-black text-teal-600">
                {totalAdvanceHouses} <span className="text-base font-medium text-slate-500">ยูนิต</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
              <Home size={28} strokeWidth={2.5} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนรอบบิลล่วงหน้ารวม</p>
              <p className="text-3xl font-black text-indigo-600">
                {totalAdvanceCycles} <span className="text-base font-medium text-slate-500">รอบบิล</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
              <Calendar size={28} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      )}

      {/* แถบค้นหาและเรียงลำดับ */}
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
            {activeMainTab === "DEBTS" ? (
              <select 
                value={sortByDebts} 
                onChange={(e) => setSortByDebts(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl pl-11 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-[#376B64] cursor-pointer appearance-none font-medium"
              >
                <option value="debt-desc">เรียงตามยอดค้าง (มากไปน้อย)</option>
                <option value="debt-asc">เรียงตามยอดค้าง (น้อยไปมาก)</option>
                <option value="month-desc">จำนวนเดือน (มากไปน้อย)</option>
                <option value="house-asc">เลขที่ยูนิต (ก - ฮ)</option>
              </select>
            ) : (
              <select 
                value={sortByAdvances} 
                onChange={(e) => setSortByAdvances(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl pl-11 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-[#376B64] cursor-pointer appearance-none font-medium"
              >
                <option value="adv-amount-desc">เรียงตามยอดล่วงหน้า (มากไปน้อย)</option>
                <option value="adv-amount-asc">เรียงตามยอดล่วงหน้า (น้อยไปมาก)</option>
                <option value="adv-count-desc">จำนวนรอบบิล (มากไปน้อย)</option>
                <option value="house-asc">เลขที่ยูนิต (ก - ฮ)</option>
              </select>
            )}
            <ChevronDown size={16} className="absolute right-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* ตารางแสดงผล */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all">
        
        {/* แถบ Contextual สำหรับการทำงานแบบกลุ่ม (เฉพาะแท็บหนี้ค้าง) */}
        {activeMainTab === "DEBTS" && selectedIds.length > 0 && (
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
          {activeMainTab === "DEBTS" ? (
            /* ======================================================== */
            /* 1. ตารางลูกหนี้ค้างชำระ (Debts Table)                      */
            /* ======================================================== */
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
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(item.id) ? "bg-[#376B64]/5" : ""}`}>
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
                          <button
                            type="button"
                            onClick={() => openDetailModal(item, "DEBT")}
                            className="text-left group/hno inline-flex items-center gap-1.5 w-max"
                            title="คลิกเพื่อดูรายละเอียดรอบบิลค้างชำระ"
                          >
                            <span className="text-base font-black text-slate-900 bg-slate-100 group-hover/hno:bg-[#376B64]/10 group-hover/hno:text-[#376B64] px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1.5">
                              {item.houseNumber}
                              <Eye size={12} className="opacity-0 group-hover/hno:opacity-100 text-[#376B64] transition-opacity" />
                            </span>
                          </button>
                          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                            <User size={12} className="text-slate-400" /> {item.ownerName !== "-" ? item.ownerName : "ยังไม่ได้ระบุชื่อ"}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone size={12} className="text-slate-400" /> {item.phone !== "-" ? item.phone : "ไม่มีข้อมูลติดต่อ"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetailModal(item, "DEBT")}
                          className={`inline-flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 group ${
                            item.overdueCount >= 3 
                              ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-300" 
                              : "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                          }`}
                          title="คลิกเพื่อดูรอบบิลที่ค้างชำระทั้งหมด"
                        >
                          <AlertCircle size={14} strokeWidth={2.5} />
                          <span>ค้างชำระ {item.overdueCount} รอบบิล</span>
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform opacity-70" />
                        </button>
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
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            type="button"
                            onClick={() => openDetailModal(item, "DEBT")}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                            title="ดูรายละเอียดรอบบิลที่ค้างชำระ"
                          >
                            <Eye size={14} className="text-slate-500" />
                            <span>ดูรอบบิล</span>
                          </button>
                          {canNotify && (
                            <button 
                              type="button"
                              onClick={() => handleNotifyDebt(item)}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#376B64]/10 text-[#376B64] hover:bg-[#376B64] hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                              title="ส่งแจ้งเตือนยอดค้างชำระ"
                            >
                              <AlertCircle size={14} strokeWidth={2.5} />
                              <span>แจ้งเตือน</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
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
          ) : (
            /* ======================================================== */
            /* 2. ตารางผู้ชำระล่วงหน้า (Advances Table)                 */
            /* ======================================================== */
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 sm:p-5">บ้านเลขที่</th>
                  <th className="p-4 sm:p-5 text-center">จำนวนรอบบิลที่ชำระล่วงหน้า</th>
                  <th className="p-4 sm:p-5 text-right">ยอดชำระล่วงหน้ารวม</th>
                  <th className="p-4 sm:p-5 text-center">คุ้มครองถึงรอบบิล</th>
                  <th className="p-4 sm:p-5 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
                {sortedAdvances.length > 0 ? (
                  sortedAdvances.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 sm:p-5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => openDetailModal(item, "ADVANCE")}
                            className="text-left group/hno inline-flex items-center gap-1.5 w-max"
                            title="คลิกเพื่อดูรายละเอียดรอบบิลชำระล่วงหน้า"
                          >
                            <span className="text-base font-black text-slate-900 bg-slate-100 group-hover/hno:bg-[#376B64]/10 group-hover/hno:text-[#376B64] px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1.5">
                              {item.houseNumber}
                              <Eye size={12} className="opacity-0 group-hover/hno:opacity-100 text-[#376B64] transition-opacity" />
                            </span>
                          </button>
                          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                            <User size={12} className="text-slate-400" /> {item.ownerName !== "-" ? item.ownerName : "ยังไม่ได้ระบุชื่อ"}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone size={12} className="text-slate-400" /> {item.phone !== "-" ? item.phone : "ไม่มีข้อมูลติดต่อ"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDetailModal(item, "ADVANCE")}
                          className="inline-flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 group"
                          title="คลิกเพื่อดูรอบบิลที่ชำระล่วงหน้าทั้งหมด"
                        >
                          <CheckCircle2 size={14} strokeWidth={2.5} className="text-emerald-600" />
                          <span>ชำระล่วงหน้า {item.advanceCount} รอบบิล</span>
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform opacity-70" />
                        </button>
                      </td>
                      <td className="p-4 sm:p-5 text-right whitespace-nowrap font-black text-[#376B64] text-base">
                        {item.totalAdvanceAmount.toLocaleString()} <span className="text-xs font-medium text-slate-400">บาท</span>
                      </td>
                      <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                        <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-indigo-100 flex items-center justify-center gap-1.5 w-max mx-auto shadow-sm">
                          <Calendar size={14} className="text-indigo-500" />
                          {item.coveredUntil}
                        </span>
                      </td>
                      <td className="p-4 sm:p-5 text-center whitespace-nowrap">
                        <button 
                          type="button"
                          onClick={() => openDetailModal(item, "ADVANCE")}
                          className="flex items-center justify-center gap-1.5 mx-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                          title="ดูรายละเอียดรอบบิลที่ชำระล่วงหน้า"
                        >
                          <Eye size={14} className="text-slate-500" />
                          <span>ดูรอบบิล</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Sparkles className="text-amber-500 mb-3" size={40} strokeWidth={2} />
                        <p className="text-slate-700 font-bold text-base">ไม่พบข้อมูลผู้ชำระล่วงหน้า</p>
                        <p className="text-slate-400 text-sm mt-1">ยังไม่มีลูกบ้านที่ชำระค่าส่วนกลางล่วงหน้าในระบบ</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal รายละเอียดรอบบิล (รองรับทั้งลูกหนี้ค้างชำระ และผู้ชำระล่วงหน้า) */}
      {selectedItemForDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedItemForDetail(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                  detailModalMode === "DEBT"
                    ? "bg-rose-50 border-rose-100 text-rose-500"
                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                }`}>
                  {detailModalMode === "DEBT" ? (
                    <AlertCircle size={22} strokeWidth={2.5} />
                  ) : (
                    <CheckCircle2 size={22} strokeWidth={2.5} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {detailModalMode === "DEBT" ? "รายละเอียดรอบบิลค้างชำระ" : "รายละเอียดรอบบิลชำระล่วงหน้า"}
                    </h2>
                    <span className="text-xs font-black text-[#376B64] bg-[#376B64]/10 border border-[#376B64]/20 px-2.5 py-0.5 rounded-lg">
                      บ้านเลขที่ {selectedItemForDetail.houseNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                    <span className="flex items-center gap-1">
                      <User size={13} className="text-slate-400" />
                      {selectedItemForDetail.ownerName !== "-" ? selectedItemForDetail.ownerName : "ยังไม่ได้ระบุชื่อ"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <Phone size={13} className="text-slate-400" />
                      {selectedItemForDetail.phone !== "-" ? selectedItemForDetail.phone : "ไม่มีข้อมูลติดต่อ"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForDetail(null)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-xl transition-colors border border-slate-200/60 shadow-sm shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              {/* Summary Stats Row */}
              {detailModalMode === "DEBT" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-rose-50/60 border border-rose-100 p-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block mb-0.5">ยอดค้างชำระสุทธิ</span>
                    <p className="text-xl font-black text-rose-600">
                      {selectedItemForDetail.totalOwed.toLocaleString()} <span className="text-xs font-semibold text-slate-500">บาท</span>
                    </p>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-100 p-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">จำนวนรอบบิลที่ค้าง</span>
                    <p className="text-xl font-black text-amber-600">
                      {selectedItemForDetail.overdueCount} <span className="text-xs font-semibold text-slate-500">รอบบิล</span>
                    </p>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">รอบบิลล่าสุดที่ชำระ</span>
                    <p className="text-sm font-bold text-emerald-800 flex items-center gap-1.5 mt-1 truncate">
                      <Calendar size={14} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{selectedItemForDetail.lastPaidMonth}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">ยอดชำระล่วงหน้ารวม</span>
                    <p className="text-xl font-black text-[#376B64]">
                      {selectedItemForDetail.totalAdvanceAmount.toLocaleString()} <span className="text-xs font-semibold text-slate-500">บาท</span>
                    </p>
                  </div>

                  <div className="bg-teal-50/60 border border-teal-100 p-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block mb-0.5">จำนวนรอบบิลล่วงหน้า</span>
                    <p className="text-xl font-black text-teal-700">
                      {selectedItemForDetail.advanceCount} <span className="text-xs font-semibold text-slate-500">รอบบิล</span>
                    </p>
                  </div>

                  <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5">คุ้มครองถึงรอบบิล</span>
                    <p className="text-sm font-bold text-indigo-800 flex items-center gap-1.5 mt-1 truncate">
                      <Calendar size={14} className="shrink-0 text-indigo-600" />
                      <span className="truncate">{selectedItemForDetail.coveredUntil}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1">
                {/* Year Filter Tabs */}
                {detailAvailableYears.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setDetailYearFilter("ALL")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        detailYearFilter === "ALL"
                          ? "bg-[#376B64] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      ทั้งหมด ({detailItems.length})
                    </button>
                    {detailAvailableYears.map((yr: any) => {
                      const countInYear = detailItems.filter((i: any) => i.yearThai === yr).length;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setDetailYearFilter(String(yr))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            detailYearFilter === String(yr)
                              ? "bg-[#376B64] text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          ปี {yr} ({countInYear})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search in modal */}
                <div className="relative w-full sm:w-56 ml-auto">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    placeholder="ค้นหาเดือน หรือปี..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#376B64] outline-none font-medium"
                  />
                  {detailSearch && (
                    <button
                      type="button"
                      onClick={() => setDetailSearch("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Grouped Months List */}
              <div className="space-y-4">
                {Object.keys(groupedDetailByYear).length > 0 ? (
                  Object.entries(groupedDetailByYear).map(([groupKey, groupData]: [string, any]) => (
                    <div 
                      key={groupKey} 
                      className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70"
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-[#376B64]" />
                          <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{groupKey}</span>
                          <span className="text-[10px] font-bold bg-[#376B64]/10 text-[#376B64] px-2 py-0.5 rounded-full">
                            {groupData.items.length} รอบบิล
                          </span>
                        </div>
                        {groupData.totalAmount > 0 && (
                          <span className={`text-xs font-bold ${detailModalMode === "DEBT" ? "text-rose-600" : "text-[#376B64]"}`}>
                            รวม {groupData.totalAmount.toLocaleString()} บาท
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {groupData.items.map((item: any, idx: number) => {
                          const displayAmount = detailModalMode === "DEBT" 
                            ? (item.outstandingAmount || item.amount || 0)
                            : (item.paidAmount || item.amount || 0);

                          return (
                            <div
                              key={item.id || idx}
                              className={`bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow transition-all group ${
                                detailModalMode === "DEBT" ? "hover:border-rose-200" : "hover:border-emerald-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-slate-800 text-xs truncate">
                                  {item.monthName || item.monthLabel}
                                </span>
                                <span 
                                  className={`w-2 h-2 rounded-full shrink-0 ${detailModalMode === "DEBT" ? "bg-rose-500" : "bg-emerald-500"}`} 
                                  title={detailModalMode === "DEBT" ? "ค้างชำระ" : "ชำระแล้ว"} 
                                />
                              </div>
                              <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-slate-50">
                                {displayAmount > 0 ? (
                                  <span className={`text-xs font-black ${detailModalMode === "DEBT" ? "text-rose-600" : "text-[#376B64]"}`}>
                                    {displayAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">บ.</span>
                                  </span>
                                ) : (
                                  <span className={`text-[11px] font-semibold ${detailModalMode === "DEBT" ? "text-rose-600" : "text-emerald-600"}`}>
                                    {detailModalMode === "DEBT" ? "ค้างชำระ" : "ชำระแล้ว"}
                                  </span>
                                )}
                                {item.invoiceNo && item.invoiceNo !== "-" && (
                                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-[65px]" title={item.invoiceNo}>
                                    {item.invoiceNo}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-500">ไม่พบข้อมูลรอบบิลที่ตรงกับเงื่อนไขค้นหา</p>
                    <button
                      type="button"
                      onClick={() => { setDetailYearFilter("ALL"); setDetailSearch(""); }}
                      className="mt-2 text-xs text-[#376B64] font-bold hover:underline"
                    >
                      ล้างตัวกรอง
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                แสดง <b className="text-slate-800">{filteredDetailItems.length}</b> จากทั้งหมด <b className="text-slate-800">
                  {detailModalMode === "DEBT" ? selectedItemForDetail.overdueCount : selectedItemForDetail.advanceCount}
                </b> รอบบิล
              </span>

              <div className="flex items-center gap-2">
                {detailModalMode === "DEBT" && canNotify && (
                  <button
                    type="button"
                    onClick={() => handleNotifyDebt(selectedItemForDetail)}
                    className="px-4 py-2 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#376B64]/20 active:scale-95"
                  >
                    <AlertCircle size={15} />
                    <span>แจ้งเตือนบ้านนี้</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedItemForDetail(null)}
                  className="px-4 py-2 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
