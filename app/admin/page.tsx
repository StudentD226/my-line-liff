"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, Calendar, Loader2, AlertTriangle, AlertCircle, BarChart3, PieChart as PieIcon
} from "lucide-react";

const COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", 
  "#EF4444", "#06B6D4", "#F97316", "#84CC16", "#6366F1", "#D946EF"
];

export default function AdminDashboardHome() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // 🌟 State สำหรับสลับแท็บกราฟ (expense = กราฟวงกลมรายจ่าย, debt = กราฟแท่งหนี้ค้าง)
  const [activeTab, setActiveTab] = useState<"expense" | "debt">("expense");

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
      if (resultTx.success) setTransactions(resultTx.data || []);

      const resDebts = await fetch("/api/admin/debts", { cache: 'no-store' });
      const resultDebts = await resDebts.json();
      if (resultDebts.success) setDebts(resultDebts.data || []);
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
    return { totalIncome, totalExpense, remaining: totalIncome - totalExpense };
  }, [transactions]);

  const totalDebt = useMemo(() => {
    return debts.reduce((sum, item) => sum + item.totalOwed, 0);
  }, [debts]);

  const topDebtorsData = useMemo(() => {
    return [...debts]
      .sort((a, b) => b.totalOwed - a.totalOwed)
      .slice(0, 5)
      .map(item => ({
        name: `บ้าน ${item.houseNumber}`,
        amount: item.totalOwed
      }));
  }, [debts]);

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
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen font-sans w-full overflow-x-hidden">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 w-full">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ภาพรวมระบบ (Dashboard)</h1>
          <p className="text-sm text-gray-500 mt-1">สรุปข้อมูลการเงินและบัญชีหนี้สินหมู่บ้าน</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-full sm:w-auto">
          <Calendar className="text-[#1A534B] shrink-0" size={18} />
          <span className="text-sm font-bold text-gray-600 shrink-0">ปีงบประมาณ:</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 text-[#1A534B] text-sm rounded-lg p-1.5 font-bold cursor-pointer flex-1 sm:flex-initial"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>พ.ศ. {year + 543}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Grid: ล็อกความสูงและขนาดให้จบในหน้าเดียวบนจอคอมพิวเตอร์ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-stretch">
        
        {/* ฝั่งซ้าย: การ์ดตัวเลขสรุป (กางเท่าเดิม ไม่ยืดลงข้างล่าง) */}
        <div className="lg:col-span-1 flex flex-col gap-4 w-full">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-500 text-xs font-bold">รายรับรวมทั้งหมด</h3>
              <div className="p-1.5 bg-emerald-50 rounded-lg"><TrendingUp className="text-emerald-500" size={18} /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-800">
              {summary.totalIncome.toLocaleString()} <span className="text-xs text-gray-500 font-normal">บาท</span>
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-500 text-xs font-bold">รายจ่ายรวมทั้งหมด</h3>
              <div className="p-1.5 bg-red-50 rounded-lg"><TrendingDown className="text-red-500" size={18} /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-800">
              {summary.totalExpense.toLocaleString()} <span className="text-xs text-gray-500 font-normal">บาท</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-500 text-xs font-bold">ยอดคงเหลือสุทธิ</h3>
              <div className="p-1.5 bg-[#1A534B]/10 rounded-lg"><Wallet className="text-[#1A534B]" size={18} /></div>
            </div>
            <p className={`text-xl sm:text-2xl font-black ${summary.remaining >= 0 ? 'text-[#1A534B]' : 'text-red-500'}`}>
              {summary.remaining.toLocaleString()} <span className="text-xs text-gray-500 font-normal">บาท</span>
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex-1 flex flex-col justify-center bg-gradient-to-br from-white to-orange-50/20">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-500 text-xs font-bold">ยอดหนี้ค้างชำระรวม</h3>
              <div className="p-1.5 bg-orange-100 rounded-lg"><AlertTriangle className="text-orange-500" size={18} /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-orange-600">
              {totalDebt.toLocaleString()} <span className="text-xs text-gray-500 font-normal">บาท</span>
            </p>
          </div>
        </div>

        {/* 🌟 ฝั่งขวา: กล่องแสดงกราฟ (ใช้ระบบแท็บในกล่องเดิม ไม่เพิ่มพื้นที่ลงด้านล่าง) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col w-full overflow-hidden justify-between">
          
          {/* Header คอนโทรลแท็บสลับกราฟ (คุมโทนสี #376b64 สวยๆ) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-100 gap-3">
            <h3 className="font-bold text-gray-800 text-sm sm:text-base">วิเคราะห์ข้อมูลระบบ</h3>
            
            <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("expense")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none justify-center ${
                  activeTab === "expense" 
                    ? "bg-[#376B64] text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <PieIcon size={14} />
                สัดส่วนรายจ่าย
              </button>
              <button
                onClick={() => setActiveTab("debt")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none justify-center ${
                  activeTab === "debt" 
                    ? "bg-[#376B64] text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <BarChart3 size={14} />
                5 อันดับหนี้สูงสุด
              </button>
            </div>
          </div>

          {/* Area วาดกราฟ: จะสลับข้อมูลตามแท็บที่แอดมินกดเลือก */}
          <div className="flex-1 min-h-[300px] sm:min-h-[340px] flex items-center justify-center relative w-full pt-4">
            
            {/* 📊 แท็บที่ 1: กราฟวงกลมรายจ่าย */}
            {activeTab === "expense" && (
              <div className="w-full h-full animate-in fade-in duration-200">
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
                      <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 font-bold text-sm text-center py-10 w-full">ยังไม่มีข้อมูลรายจ่ายในปีนี้</p>
                )}
              </div>
            )}

            {/* 📊 แท็บที่ 2: กราฟแท่งหนี้ค้างชำระ */}
            {activeTab === "debt" && (
              <div className="w-full h-full animate-in fade-in duration-200">
                {topDebtorsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDebtorsData} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" tickFormatter={(value) => `${value.toLocaleString()}`} stroke="#94a3b8" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} fontWeight="bold" width={75} />
                      <RechartsTooltip 
                        formatter={(value: any) => [`${(value || 0).toLocaleString()} บาท`, 'ยอดค้างชำระ']}
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="amount" fill="#F43F5E" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full text-emerald-500 font-bold text-sm bg-emerald-50/50 rounded-xl p-6 border border-emerald-100">
                    <span className="text-xl mb-1">🎉</span>
                    ไม่มีข้อมูลหนี้ค้างชำระในระบบ
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}