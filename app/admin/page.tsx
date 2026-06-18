"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, Calendar, Loader2 
} from "lucide-react";

const COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", 
  "#EF4444", "#06B6D4", "#F97316", "#84CC16", "#6366F1", "#D946EF"
];

export default function AdminDashboardHome() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - i);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resCat = await fetch("/api/financial/categories", { cache: 'no-store' });
      const resultCat = await resCat.json();
      if (resultCat.success) setCategories(resultCat.data || []);

      const resTx = await fetch(`/api/financial/transactions?year=${selectedYear}`, { cache: 'no-store' });
      const resultTx = await resTx.json();
      if (resultTx.success) {
        setTransactions(resultTx.data || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(tx => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      else if (tx.type === 'EXPENSE') totalExpense += tx.amount;
    });
    return {
      totalIncome,
      totalExpense,
      remaining: totalIncome - totalExpense
    };
  }, [transactions]);

  const pieData = useMemo(() => {
    return categories
      .filter(c => c.type === 'EXPENSE')
      .map(cat => {
        const total = transactions
          .filter(tx => tx.type === 'EXPENSE' && tx.category?.name === cat.name)
          .reduce((sum, tx) => sum + tx.amount, 0);
        return { name: cat.name, value: total };
      })
      .filter(item => item.value > 0);
  }, [categories, transactions]);

  const totalExpenseForPie = pieData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="text-[#1A534B] animate-spin mb-4" size={40} />
        <div className="text-[#1A534B] font-bold text-lg">กำลังโหลดข้อมูลภาพรวม...</div>
      </div>
    );
  }

  return (
    /* 🌟 คุม Padding ให้กระชับบนมือถือ (p-4) และกางออกบนจอใหญ่ (lg:p-10) */
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen font-sans w-full overflow-x-hidden">
      
      {/* Header Section: จัดเป็นแนวตั้งบนมือถือ และแนวนอนบนจอใหญ่ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 w-full">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ภาพรวมระบบ (Dashboard)</h1>
          <p className="text-sm text-gray-500 mt-1">สรุปข้อมูลการเงินทั้งหมดประจำปี พ.ศ. {selectedYear + 543}</p>
        </div>
        
        {/* Dropdown เลือกปีงบประมาณ: ยืดเต็มจอในมือถือเพื่อกดง่าย */}
        <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 w-full sm:w-auto overflow-hidden">
          <Calendar className="text-[#1A534B] shrink-0" size={20} />
          <span className="text-sm font-bold text-gray-600 shrink-0">เลือกปีงบประมาณ:</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 text-[#1A534B] text-sm rounded-lg focus:ring-2 focus:ring-[#1A534B] outline-none block p-2 font-bold cursor-pointer flex-1 sm:flex-initial"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>พ.ศ. {year + 543}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Grid: สแตกลงมาเป็นแนวตั้งบนมือถือ (grid-cols-1) และแบ่งฝั่งบนจอคอม (lg:grid-cols-3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 w-full">
        
        {/* ฝั่งการ์ดตัวเลขสรุป */}
        <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6 w-full">
          {/* รายรับรวม */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">รายรับรวมทั้งหมด</h3>
              <div className="p-2 bg-emerald-50 rounded-lg shrink-0"><TrendingUp className="text-emerald-500 shrink-0" size={20} /></div>
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 truncate">
              {summary.totalIncome.toLocaleString()} <span className="text-xs sm:text-sm text-gray-500 font-normal">บาท</span>
            </p>
          </div>
          
          {/* รายจ่ายรวม */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">รายจ่ายรวมทั้งหมด</h3>
              <div className="p-2 bg-red-50 rounded-lg shrink-0"><TrendingDown className="text-red-500 shrink-0" size={20} /></div>
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800 truncate">
              {summary.totalExpense.toLocaleString()} <span className="text-xs sm:text-sm text-gray-500 font-normal">บาท</span>
            </p>
          </div>

          {/* ยอดคงเหลือสุทธิ */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">ยอดคงเหลือสุทธิ</h3>
              <div className="p-2 bg-[#1A534B]/10 rounded-lg shrink-0"><Wallet className="text-[#1A534B] shrink-0" size={20} /></div>
            </div>
            <p className={`text-2xl sm:text-3xl md:text-4xl font-extrabold truncate ${summary.remaining >= 0 ? 'text-[#1A534B]' : 'text-red-500'}`}>
              {summary.remaining.toLocaleString()} <span className="text-xs sm:text-sm text-gray-500 font-normal">บาท</span>
            </p>
          </div>
        </div>

        {/* ฝั่งกราฟวงกลม: คุมความสูงและสัดส่วนให้ยืดหยุ่นตามจออัตโนมัติ */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col w-full overflow-hidden">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center text-sm sm:text-base">สัดส่วนรายจ่ายตามหมวดหมู่ (ปี พ.ศ. {selectedYear + 543})</h3>
          <div className="flex-1 min-h-[280px] sm:min-h-[320px] flex items-center justify-center relative w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius="40%" outerRadius="70%" paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => {
                      const percent = ((Number(value) / totalExpenseForPie) * 100).toFixed(1);
                      return [`${Number(value || 0).toLocaleString()} บาท (${percent}%)`, 'ยอดเงิน'];
                    }} 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  {/* ปรับฟอนต์ตัวอธิบายกราฟให้เล็กลงบนจอมือถือป้องกันตัวหนังสือเบียดตัวล้นกรอบ */}
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', pt: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 font-bold text-sm text-center py-10">ยังไม่มีข้อมูลรายจ่ายในปีนี้</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}