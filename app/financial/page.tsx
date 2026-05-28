"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { 
  Calendar, FileText, Loader2, Receipt, Wallet, PieChart as PieChartIcon, TrendingDown
} from "lucide-react";

// 🌟 ปรับสีใหม่ให้ตัดกันชัดเจนขึ้น (แดง, น้ำเงิน, ส้ม, เขียว, ม่วง, ฟ้า, ชมพู)
const COLORS = [
  "#EF4444", "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4", "#EC4899"
];
const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export default function ResidentExpenseDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [yearlyChartData, setYearlyChartData] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - i);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resTx = await fetch(`/api/financial/transactions?month=${selectedMonth}&year=${selectedYear}`, { cache: 'no-store' });
      const resultTx = await resTx.json();
      if (resultTx.success) {
        const expensesOnly = (resultTx.data || []).filter((tx: any) => tx.type === 'EXPENSE');
        setData(expensesOnly);
      }

      const resCat = await fetch("/api/financial/categories", { cache: 'no-store' });
      const resultCat = await resCat.json();
      if (resultCat.success) setCategories(resultCat.data || []);

      // 🌟 แก้ปัญหากราฟหาย: ดึงข้อมูลสรุปรายปี
      const resSummary = await fetch(`/api/financial/summary?year=${selectedYear}`, { cache: 'no-store' });
      const resultSummary = await resSummary.json();
      
      // สร้างโครงสร้าง 12 เดือนรอไว้เลย กราฟจะได้วาดแกน X เสมอ
      let defaultYearData = fullThaiMonths.slice(1).map(month => ({ name: month, expense: 0 }));
      
      if (resultSummary.success && Array.isArray(resultSummary.data)) {
        defaultYearData = defaultYearData.map((item, index) => {
          const monthNum = index + 1;
          // หาข้อมูลจาก API ว่าตรงกับเดือนนี้ไหม
          const apiData = resultSummary.data.find((d: any) => d.month === monthNum || d.name === item.name);
          return {
            ...item,
            // เผื่อ API ส่งคีย์มาเป็น expense หรือ รายจ่าย ก็รับได้หมด
            expense: apiData ? (apiData.expense || apiData.รายจ่าย || 0) : 0
          };
        });
      }
      setYearlyChartData(defaultYearData);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [selectedMonth, selectedYear]);

  const totalExpense = useMemo(() => {
    return data.reduce((sum, tx) => sum + tx.amount, 0);
  }, [data]);

  const pieData = useMemo(() => {
    return categories
      .filter(c => c.type === 'EXPENSE')
      .map(cat => {
        const total = data
          .filter(tx => tx.category?.name === cat.name)
          .reduce((sum, tx) => sum + tx.amount, 0);
        return { name: cat.name, value: total };
      })
      .filter(item => item.value > 0);
  }, [categories, data]);

  if (isLoading && data.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="text-[#1A534B] animate-spin mb-4" size={40} />
        <div className="text-[#1A534B] font-bold text-sm">กำลังโหลดข้อมูลบัญชีส่วนกลาง...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#F8FAFC] min-h-screen font-sans pb-10">
      
      {/* Header Section */}
      <div className="bg-[#1A534B] px-5 pt-8 pb-16 md:pb-24 md:rounded-b-[60px] rounded-b-[40px] shadow-md relative z-0">
        <h1 className="text-white text-xl md:text-3xl font-bold text-center mb-1 md:mb-2">รายงานความโปร่งใส</h1>
        <p className="text-white/80 text-xs md:text-sm text-center">ตรวจสอบรายจ่ายส่วนกลางของหมู่บ้าน</p>
        
        <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))} 
            className="bg-white/10 text-white border border-white/20 text-xs md:text-sm rounded-full outline-none px-4 py-2 font-bold appearance-none text-center cursor-pointer hover:bg-white/20 transition"
          >
            {yearOptions.map(year => (
              <option key={year} value={year} className="text-gray-800">ปี พ.ศ. {year + 543}</option>
            ))}
          </select>

          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))} 
            className="bg-white/10 text-white border border-white/20 text-xs md:text-sm rounded-full outline-none px-4 py-2 font-bold appearance-none text-center cursor-pointer hover:bg-white/20 transition"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1} className="text-gray-800">รอบบิล {fullThaiMonths[i+1]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Wrapper */}
      <div className="px-4 md:px-8 -mt-10 md:-mt-16 relative z-10 flex flex-col gap-4 md:gap-6">
        
        {/* Top Row: Hero Metric + Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          <div className="bg-gradient-to-br from-red-50 to-white p-6 md:p-10 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center justify-center relative overflow-hidden min-h-[160px] lg:min-h-[300px]">
            <div className="absolute -right-6 -bottom-6 md:-right-10 md:-bottom-10 opacity-5 text-red-500">
              <Wallet size={150} />
            </div>
            <p className="text-red-500 font-bold text-sm md:text-lg mb-2 relative z-10">ยอดรวมรายจ่ายส่วนกลาง</p>
            <p className="text-4xl md:text-6xl font-extrabold text-red-600 relative z-10 tracking-tight">
              {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs md:text-sm text-red-400 mt-2 font-medium relative z-10">บาท</p>
          </div>

          <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm md:text-base mb-4 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 mr-2 text-[#1A534B]" /> สัดส่วนรายจ่ายรอบบิลนี้
            </h3>
            <div className="h-56 md:h-72 w-full flex items-center justify-center relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {/* 🌟 ใช้ % แทนเพื่อไม่ให้ Error บน Next.js */}
                  <PieChart>
                    <Pie data={pieData} innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => {
                        const percent = ((Number(value) / totalExpense) * 100).toFixed(1);
                        return [`${Number(value || 0).toLocaleString()} บาท (${percent}%)`, 'ยอดเงิน'];
                      }} 
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 text-xs md:text-sm font-bold text-center">ไม่มีข้อมูลรายจ่ายในรอบบิลนี้</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Transaction List + Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-sm md:text-base flex items-center">
                <FileText className="w-4 h-4 mr-2 text-[#1A534B]" /> รายการใช้จ่าย
              </h3>
              <span className="text-[10px] md:text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{data.length} รายการ</span>
            </div>

            <div className="space-y-3 max-h-[300px] md:max-h-[350px] overflow-y-auto custom-scrollbar pr-2 flex-1">
              {data.length > 0 ? (
                data.map((tx, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                    <div className="flex-1 pr-3 overflow-hidden">
                      <p className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">{tx.title}</p>
                      <div className="flex items-center text-[11px] md:text-xs text-gray-500 mt-1 md:mt-1.5 space-x-2">
                        <span className="flex items-center whitespace-nowrap"><Calendar className="w-3 h-3 mr-1" /> {new Date(tx.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</span>
                        
                        {/* 🌟 แก้ปัญหาป้ายหมวดหมู่ตกบรรทัด โดยบังคับให้ตัดคำถ้าชื่อยาวไป */}
                        <span className="bg-gray-200 px-2 py-0.5 rounded text-gray-600 font-medium inline-block max-w-[100px] sm:max-w-[150px] truncate align-middle">
                          {tx.category?.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap pl-2">
                      <p className="font-bold text-red-500 text-sm md:text-base">-฿{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      {tx.receiptUrl && (
                        <a href={tx.receiptUrl} target="_blank" rel="noreferrer" className="inline-block mt-1 text-[10px] md:text-xs font-bold text-blue-500 hover:underline">
                          <Receipt className="w-3 h-3 inline mr-1" /> ดูบิล
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs md:text-sm font-bold bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  ไม่มีรายการใช้จ่ายในเดือนนี้
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-bold text-gray-800 text-sm md:text-base mb-4 flex items-center justify-center text-center">
               <TrendingDown className="w-4 h-4 mr-2 text-[#1A534B]" /> เทรนด์รายจ่าย ปี พ.ศ. {selectedYear + 543}
            </h3>
            <div className="h-56 md:h-72 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  {/* 🌟 ใช้ dataKey="name" จากข้อมูลใหม่ที่เราจัดโครงสร้างไว้ */}
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
                  <RechartsTooltip 
                    cursor={{fill: '#F9FAFB'}} 
                    formatter={(value: any, name: any) => {
                      if(name === 'expense' || name === 'รายจ่าย') return [`${Number(value || 0).toLocaleString()} บาท`, 'รายจ่าย'];
                      return [];
                    }} 
                  />
                  {/* 🌟 ใช้ dataKey="expense" ตามข้อมูลใหม่ */}
                  <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] md:text-xs text-center text-gray-400 mt-4 font-medium">กราฟแสดงเฉพาะยอดเงินที่จ่ายออกไปในแต่ละเดือน</p>
          </div>

        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
      `}</style>
    </div>
  );
}