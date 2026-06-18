"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, Calendar, FileText, Loader2, ArrowUpDown, ChevronLeft, ChevronRight 
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

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); 

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
    setCurrentPage(1); 
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

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...transactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'category') {
          aValue = a.category?.name || ''; 
          bValue = b.category?.name || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [transactions, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / rowsPerPage));
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * rowsPerPage, 
    currentPage * rowsPerPage
  );

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
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0 w-full">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ภาพรวมระบบ (Dashboard)</h1>
          <p className="text-sm text-gray-500 mt-1">สรุปข้อมูลการเงินทั้งหมดประจำปี พ.ศ. {selectedYear + 543}</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 w-full sm:w-auto overflow-hidden">
          <Calendar className="text-[#1A534B] shrink-0" size={20} />
          <span className="text-sm font-bold text-gray-600 shrink-0">เลือกปีงบประมาณ:</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 text-[#1A534B] text-sm rounded-lg focus:ring-2 focus:ring-[#1A534B] outline-none block p-2 font-bold cursor-pointer w-full sm:w-auto"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>พ.ศ. {year + 543}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        
        <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">รายรับรวมทั้งหมด</h3>
              <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="text-emerald-500 shrink-0" size={20} /></div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-800 truncate">{summary.totalIncome.toLocaleString()} <span className="text-xs sm:text-sm text-gray-500 font-normal">บาท</span></p>
          </div>
          
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">รายจ่ายรวมทั้งหมด</h3>
              <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="text-red-500 shrink-0" size={20} /></div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-800 truncate">{summary.totalExpense.toLocaleString()} <span className="text-xs sm:text-sm text-gray-500 font-normal">บาท</span></p>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">ยอดคงเหลือสุทธิ</h3>
              <div className="p-2 bg-[#1A534B]/10 rounded-lg"><Wallet className="text-[#1A534B] shrink-0" size={20} /></div>
            </div>
            <p className={`text-3xl sm:text-4xl font-extrabold truncate ${summary.remaining >= 0 ? 'text-[#1A534B]' : 'text-red-500'}`}>
              {summary.remaining.toLocaleString()} <span className="text-sm sm:text-base text-gray-500 font-normal">บาท</span>
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center text-sm sm:text-base">สัดส่วนรายจ่ายตามหมวดหมู่ (ปี พ.ศ. {selectedYear + 543})</h3>
          <div className="flex-1 min-h-[250px] sm:min-h-[300px] flex items-center justify-center relative w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius="40%" outerRadius="75%" paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => {
                      const percent = ((Number(value) / totalExpenseForPie) * 100).toFixed(1);
                      return [`${Number(value || 0).toLocaleString()} บาท (${percent}%)`, 'ยอดเงิน'];
                    }} 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 font-bold text-sm text-center">ยังไม่มีข้อมูลรายจ่ายในปีนี้</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col w-full">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-3">
          <h3 className="font-bold text-gray-800 flex items-center text-sm sm:text-base"><FileText className="mr-2 text-[#1A534B] shrink-0" size={20}/> ประวัติรายการบัญชีทั้งหมดของปีนี้</h3>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm w-full lg:w-auto">
            <span className="text-gray-500 font-medium shrink-0">แสดง:</span>
            <select 
              value={rowsPerPage} 
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#1A534B] font-bold text-gray-700 bg-white"
            >
              <option value={10}>10 รายการ</option>
              <option value={20}>20 รายการ</option>
              <option value={50}>50 รายการ</option>
              <option value={100}>100 รายการ</option>
            </select>
            <span className="text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap">รวม {transactions.length} รายการ</span>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar flex-1 w-full">
          <table className="w-full text-sm text-left relative min-w-[800px]">
            <thead className="bg-white text-gray-500 sticky top-0 z-10 border-b border-gray-100">
              <tr>
                <th className="px-4 sm:px-6 py-4 font-bold whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('date')}>
                  <div className="flex items-center space-x-1"><span>วันที่</span><ArrowUpDown size={14} className={`shrink-0 ${sortConfig?.key === 'date' ? 'text-[#1A534B]' : ''}`} /></div>
                </th>
                <th className="px-4 sm:px-6 py-4 font-bold whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('title')}>
                  <div className="flex items-center space-x-1"><span>รายการ</span><ArrowUpDown size={14} className={`shrink-0 ${sortConfig?.key === 'title' ? 'text-[#1A534B]' : ''}`} /></div>
                </th>
                <th className="px-4 sm:px-6 py-4 font-bold whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('category')}>
                  <div className="flex items-center space-x-1"><span>หมวดหมู่</span><ArrowUpDown size={14} className={`shrink-0 ${sortConfig?.key === 'category' ? 'text-[#1A534B]' : ''}`} /></div>
                </th>
                <th className="px-4 sm:px-6 py-4 font-bold whitespace-nowrap text-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('type')}>
                  <div className="flex items-center justify-center space-x-1"><span>ประเภท</span><ArrowUpDown size={14} className={`shrink-0 ${sortConfig?.key === 'type' ? 'text-[#1A534B]' : ''}`} /></div>
                </th>
                <th className="px-4 sm:px-6 py-4 font-bold whitespace-nowrap text-right cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('amount')}>
                  <div className="flex items-center justify-end space-x-1"><span>จำนวนเงิน</span><ArrowUpDown size={14} className={`shrink-0 ${sortConfig?.key === 'amount' ? 'text-[#1A534B]' : ''}`} /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{new Date(tx.date).toLocaleDateString('th-TH')}</td>
                    <td className="px-4 sm:px-6 py-4">
                      {/* 🌟 ลบ Tag และ Icon ออก เหลือแต่ชื่อรายการเพียวๆ */}
                      <p className="font-bold text-gray-800 whitespace-nowrap">{tx.title}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{tx.category?.name}</td>
                    <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {tx.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td className={`px-4 sm:px-6 py-4 text-right font-bold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold bg-white">ไม่มีรายการบัญชีในปีนี้</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between bg-white rounded-b-2xl gap-3">
            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
              หน้า <span className="font-bold text-gray-800">{currentPage}</span> จาก <span className="font-bold text-gray-800">{totalPages}</span>
            </span>
            <div className="flex space-x-2 shrink-0">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-xl flex items-center transition-colors ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-gray-100 hover:text-[#1A534B]'}`}
              >
                <ChevronLeft size={20} className="shrink-0" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`p-2 rounded-xl flex items-center transition-colors ${currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-gray-100 hover:text-[#1A534B]'}`}
              >
                <ChevronRight size={20} className="shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}