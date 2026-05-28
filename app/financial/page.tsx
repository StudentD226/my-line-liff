"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { 
  Calendar, FileText, Loader2, Receipt, Info, Wallet
} from "lucide-react";

const COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981", "#06B6D4", 
  "#3B82F6", "#6366F1", "#8B5CF6", "#D946EF", "#EC4899", "#F43F5E"
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
      // ดึงข้อมูลรายการ
      const resTx = await fetch(`/api/financial/transactions?month=${selectedMonth}&year=${selectedYear}`, { cache: 'no-store' });
      const resultTx = await resTx.json();
      if (resultTx.success) {
        // 🌟 กรองเอาเฉพาะ "รายจ่าย (EXPENSE)" เท่านั้น ไม่เอา INCOME มาโชว์เลย
        const expensesOnly = (resultTx.data || []).filter((tx: any) => tx.type === 'EXPENSE');
        setData(expensesOnly);
      }

      // ดึงข้อมูลกราฟรายปี
      const resSummary = await fetch(`/api/financial/summary?year=${selectedYear}`, { cache: 'no-store' });
      const resultSummary = await resSummary.json();
      if (resultSummary.success) setYearlyChartData(resultSummary.data || []);

      // ดึงข้อมูลหมวดหมู่
      const resCat = await fetch("/api/financial/categories", { cache: 'no-store' });
      const resultCat = await resCat.json();
      if (resultCat.success) setCategories(resultCat.data || []);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [selectedMonth, selectedYear]);

  // คำนวณยอดรวม "รายจ่าย" อย่างเดียว
  const totalExpense = useMemo(() => {
    return data.reduce((sum, tx) => sum + tx.amount, 0);
  }, [data]);

  // เตรียมข้อมูลกราฟวงกลม
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
    // 🌟 ใช้ max-w-md เพื่อจำลองหน้าจอมือถือให้อยู่ตรงกลาง (เหมาะสำหรับ LIFF)
    <div className="w-full max-w-md mx-auto bg-[#F8FAFC] min-h-screen font-sans pb-10">
      
      {/* 🟢 Header พื้นสีเขียวสไตล์ LIFF */}
      <div className="bg-[#1A534B] px-5 pt-8 pb-16 rounded-b-[40px] shadow-md relative z-0">
        <h1 className="text-white text-xl font-bold text-center mb-1">รายงานความโปร่งใส</h1>
        <p className="text-white/80 text-xs text-center">ตรวจสอบรายจ่ายส่วนกลางของหมู่บ้าน</p>
        
        {/* ตัวเลือก ปี และ เดือน */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))} 
            className="bg-white/10 text-white border border-white/20 text-xs rounded-full outline-none px-3 py-1.5 font-bold appearance-none text-center"
          >
            {yearOptions.map(year => (
              <option key={year} value={year} className="text-gray-800">ปี พ.ศ. {year + 543}</option>
            ))}
          </select>

          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))} 
            className="bg-white/10 text-white border border-white/20 text-xs rounded-full outline-none px-3 py-1.5 font-bold appearance-none text-center"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1} className="text-gray-800">รอบบิล {fullThaiMonths[i+1]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 -mt-10 relative z-10 space-y-4">
        
        {/* 📊 ส่วนที่ 1: กราฟวงกลม สัดส่วนรายจ่าย */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center justify-center">
            <PieChart className="w-4 h-4 mr-1 text-[#1A534B]" /> สัดส่วนรายจ่ายรอบบิลนี้
          </h3>
          <div className="h-56 w-full flex items-center justify-center relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
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
              <div className="text-gray-400 text-xs font-bold text-center">ไม่มีข้อมูลรายจ่ายในรอบบิลนี้</div>
            )}
          </div>
        </div>

        {/* 💰 ส่วนที่ 2: Hero Metric - รายจ่ายรวม (ตัวเลขใหญ่ๆ) */}
        <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl shadow-sm border border-red-100 text-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5"><Wallet size={100} /></div>
          <p className="text-red-500 font-bold text-sm mb-1 relative z-10">ยอดรวมรายจ่ายส่วนกลาง</p>
          <p className="text-4xl font-extrabold text-red-600 relative z-10 tracking-tight">
            {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-red-400 mt-1 font-medium relative z-10">บาท</p>
        </div>

        {/* 📝 ส่วนที่ 3: ประวัติรายการใช้จ่าย (แบบ Card List สำหรับมือถือ) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center">
              <FileText className="w-4 h-4 mr-1 text-[#1A534B]" /> รายการใช้จ่าย
            </h3>
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{data.length} รายการ</span>
          </div>

          <div className="space-y-3">
            {data.length > 0 ? (
              data.map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1 pr-3">
                    <p className="font-bold text-gray-800 text-sm line-clamp-1">{tx.title}</p>
                    <div className="flex items-center text-[11px] text-gray-500 mt-1 space-x-2">
                      <span className="flex items-center"><Calendar className="w-3 h-3 mr-0.5" /> {new Date(tx.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</span>
                      <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-medium">{tx.category?.name}</span>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="font-bold text-red-500 text-sm">-฿{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    {tx.receiptUrl && (
                      <a href={tx.receiptUrl} target="_blank" rel="noreferrer" className="inline-block mt-1 text-[10px] font-bold text-blue-500 hover:underline">
                        <Receipt className="w-3 h-3 inline mr-0.5" /> ดูบิล
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs font-bold bg-gray-50 rounded-xl border border-dashed border-gray-200">
                ไม่มีรายการใช้จ่ายในเดือนนี้
              </div>
            )}
          </div>
        </div>

        {/* 📈 ส่วนที่ 4: กราฟแท่งแนวโน้มรายจ่ายตลอดปี */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center justify-center text-center">
             เทรนด์รายจ่าย ปี พ.ศ. {selectedYear + 543}
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
                <RechartsTooltip 
                  cursor={{fill: '#F9FAFB'}} 
                  formatter={(value: any, name: any) => { // 🌟 แก้ไข Type ตรงนี้เรียบร้อยครับ
                    // กรองโชว์แค่คำว่า "รายจ่าย" ใน Tooltip
                    if(name === 'รายจ่าย') return [`${Number(value || 0).toLocaleString()} บาท`, 'รายจ่าย'];
                    return [];
                  }} 
                />
                {/* 🌟 ดึงข้อมูลมาเฉพาะ Bar ของรายจ่าย (สีแดง) */}
                <Bar dataKey="รายจ่าย" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2 font-medium">กราฟแสดงเฉพาะยอดเงินที่จ่ายออกไปในแต่ละเดือน</p>
        </div>

      </div>
    </div>
  );
}