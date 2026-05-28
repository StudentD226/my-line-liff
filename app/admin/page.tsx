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

  // 🌟 State สำหรับระบบ Table (Sorter & Pagination)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // จำนวนรายการต่อหน้า

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resCat = await fetch("/api/financial/categories", { cache: 'no-store' });
      const resultCat = await resCat.json();
      if (resultCat.success) setCategories(resultCat.data || []);

      const currentYear = new Date().getFullYear();
      const resTx = await fetch(`/api/financial/transactions?year=${currentYear}`, { cache: 'no-store' });
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
  }, []);

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

  // 🌟 ระบบจัดเรียงข้อมูล (Sorter)
  const sortedTransactions = useMemo(() => {
    let sortableItems = [...transactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // จัดการกรณีจัดเรียงตามหมวดหมู่ (ดึง name มาเทียบ)
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

  // ฟังก์ชันกดสลับการจัดเรียง
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    setCurrentPage(1); // เวลากดเรียงใหม่ ให้กลับไปหน้า 1 เสมอ
  };

  // 🌟 ระบบแบ่งหน้า (Pagination)
  const totalPages = Math.ceil(sortedTransactions.length / rowsPerPage);
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * rowsPerPage, 
    currentPage * rowsPerPage
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="text-[#1A534B] animate-spin mb-4" size={40} />
        <div className="text-[#1A534B] font-bold text-lg">กำลังโหลดข้อมูลภาพรวม...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen font-sans">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ (Dashboard)</h1>
        <p className="text-sm text-gray-500 mt-1">สรุปข้อมูลการเงินทั้งหมดประจำปี {new Date().getFullYear() + 543}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* ฝั่งซ้าย: สรุปตัวเลข */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">รายรับรวมทั้งหมด</h3>
              <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="text-emerald-500" size={20} /></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-800">{summary.totalIncome.toLocaleString()} <span className="text-sm text-gray-500 font-normal">บาท</span></p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">รายจ่ายรวมทั้งหมด</h3>
              <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="text-red-500" size={20} /></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-800">{summary.totalExpense.toLocaleString()} <span className="text-sm text-gray-500 font-normal">บาท</span></p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-bold flex items-center">ยอดคงเหลือสุทธิ</h3>
              <div className="p-2 bg-[#1A534B]/10 rounded-lg"><Wallet className="text-[#1A534B]" size={20} /></div>
            </div>
            <p className={`text-4xl font-extrabold ${summary.remaining >= 0 ? 'text-[#1A534B]' : 'text-red-500'}`}>
              {summary.remaining.toLocaleString()} <span className="text-base text-gray-500 font-normal">บาท</span>
            </p>
          </div>
        </div>

        {/* ฝั่งขวา: กราฟวงกลม */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center">สัดส่วนรายจ่ายตามหมวดหมู่</h3>
          <div className="flex-1 min-h-[300px] flex items-center justify-center relative w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => {
                      const percent = ((Number(value) / totalExpenseForPie) * 100).toFixed(1);
                      return [`${Number(value || 0).toLocaleString()} บาท (${percent}%)`, 'ยอดเงิน'];
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 font-bold">ยังไม่มีข้อมูลรายจ่าย</p>
            )}
          </div>
        </div>
      </div>

      {/* 📝 ด้านล่าง: ตารางรายการบัญชีพร้อม Sorter & Pagination */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 space-y-3 sm:space-y-0">
          <h3 className="font-bold text-gray-800 flex items-center"><FileText className="mr-2 text-[#1A534B]" size={20}/> ประวัติรายการบัญชีทั้งหมด</h3>
          
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-gray-500 font-medium">แสดง:</span>
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
            <span className="text-gray-500 font-medium">รวม {transactions.length} รายการ</span>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-white text-gray-500 sticky top-0 z-10 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('date')}>
                  <div className="flex items-center space-x-1"><span>วันที่</span><ArrowUpDown size={14} className={sortConfig?.key === 'date' ? 'text-[#1A534B]' : ''} /></div>
                </th>
                <th className="px-6 py-4 font-bold whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('title')}>
                  <div className="flex items-center space-x-1"><span>รายการ</span><ArrowUpDown size={14} className={sortConfig?.key === 'title' ? 'text-[#1A534B]' : ''} /></div>
                </th>
                <th className="px-6 py-4 font-bold whitespace-nowrap cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('category')}>
                  <div className="flex items-center space-x-1"><span>หมวดหมู่</span><ArrowUpDown size={14} className={sortConfig?.key === 'category' ? 'text-[#1A534B]' : ''} /></div>
                </th>
                <th className="px-6 py-4 font-bold whitespace-nowrap text-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('type')}>
                  <div className="flex items-center justify-center space-x-1"><span>ประเภท</span><ArrowUpDown size={14} className={sortConfig?.key === 'type' ? 'text-[#1A534B]' : ''} /></div>
                </th>
                <th className="px-6 py-4 font-bold whitespace-nowrap text-right cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => requestSort('amount')}>
                  <div className="flex items-center justify-end space-x-1"><span>จำนวนเงิน</span><ArrowUpDown size={14} className={sortConfig?.key === 'amount' ? 'text-[#1A534B]' : ''} /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{new Date(tx.date).toLocaleDateString('th-TH')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-800">{tx.title}</p>
                        {tx.receiptUrl && (
                          <a href={tx.receiptUrl} target="_blank" rel="noreferrer" title="ดูหลักฐาน" className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded transition-colors">
                            <FileText size={14} />
                          </a>
                        )}
                      </div>
                      {tx.isAuto && <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A534B]/10 text-[#1A534B]">ดึงอัตโนมัติจากบิลค่าส่วนกลาง</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{tx.category?.name}</td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {tx.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold bg-white">ไม่มีรายการบัญชี</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 🌟 ส่วนควบคุมการเปลี่ยนหน้า (Pagination Controls) */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-sm text-gray-500 font-medium">
              หน้า <span className="font-bold text-gray-800">{currentPage}</span> จาก <span className="font-bold text-gray-800">{totalPages}</span>
            </span>
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg flex items-center transition-colors ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-gray-100 hover:text-[#1A534B]'}`}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg flex items-center transition-colors ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-gray-100 hover:text-[#1A534B]'}`}
              >
                <ChevronRight size={20} />
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