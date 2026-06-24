"use client";
import React, { useState, useEffect } from "react";
import { 
  DollarSign, Home, AlertTriangle, Search, 
  Bell, Eye, Calendar, User, Phone, Loader2
} from "lucide-react";

export default function DebtTrackerPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 🌟 ของจริง: ดึงข้อมูลจาก Database ผ่าน API
  useEffect(() => {
    fetch("/api/admin/debts")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setDebts(result.data); // ยัดข้อมูลลง State
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching debts:", err);
        setIsLoading(false);
      });
  }, []);

  const totalAmountToCollect = debts.reduce((sum, item) => sum + item.totalOwed, 0);
  const totalHousesInDebt = debts.length;

  const filteredDebts = debts.filter((item) =>
    item.houseNumber.includes(searchTerm) || item.ownerName?.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="text-[#1A534B] animate-spin mb-4" size={40} />
        <div className="text-[#1A534B] font-bold text-lg">กำลังโหลดข้อมูลหนี้สินจากฐานข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="text-rose-500" size={28} />
          ระบบติดตามและทวงถามค่าส่วนกลาง
        </h1>
        <p className="text-sm text-slate-500 mt-1">จัดการ ตรวจสอบยอดค้าง และส่งแจ้งเตือนการค้างชำระรายหลัง</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยอดเงินรวมที่จะได้จากการทวง</p>
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">จำนวนบ้านที่ค้างชำระทั้งหมด</p>
            <p className="text-3xl font-black text-amber-500">
              {totalHousesInDebt} <span className="text-base font-medium text-slate-500">หลัง</span>
            </p>
          </div>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <Home size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-4 flex items-center">
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
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 sm:p-5">บ้านเลขที่</th>
                <th className="p-4 sm:p-5 text-center">จำนวนเดือนที่ค้าง</th>
                <th className="p-4 sm:p-5 text-right">ยอดค้างทั้งหมด</th>
                <th className="p-4 sm:p-5 text-center">เดือนล่าสุดที่จ่าย</th>
                <th className="p-4 sm:p-5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
              {filteredDebts.length > 0 ? (
                filteredDebts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 sm:p-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg w-max mb-1">
                          {item.houseNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <User size={12} /> {item.ownerName || "ไม่ระบุ"}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={12} /> {item.phone || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      <div className="relative inline-block group">
                        <span className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          item.overdueCount >= 3 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          ค้าง {item.overdueCount} เดือน ⚠️
                        </span>
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-white text-xs rounded-xl p-3 shadow-xl z-20 transition-all animate-fade-in">
                          <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-amber-400">รายการเดือนที่ค้าง:</p>
                          <ul className="space-y-1 list-disc list-inside text-slate-300 font-normal">
                            {item.overdueMonths.map((month: string, i: number) => (
                              <li key={i}>{month}</li>
                            ))}
                          </ul>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-right font-black text-rose-600 text-base">
                      {item.totalOwed.toLocaleString()} <span className="text-xs font-medium text-slate-400">บาท</span>
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      <span className="text-slate-600 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1 w-max mx-auto">
                        <Calendar size={12} />
                        {item.lastPaidMonth}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => alert(`แจ้งเตือนผ่าน LINE ทวงหนี้บ้าน ${item.houseNumber} เรียบร้อย`)}
                          className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-colors title='ส่งข้อความทวงหนี้'"
                        >
                          <Bell size={16} />
                        </button>
                        <button className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors title='ดูประวัติโดยละเอียด'">
                          <Eye size={16} />
                        </button>
                      </div>
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