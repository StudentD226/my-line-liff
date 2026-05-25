"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#3B82F6", "#60A5FA", "#93C5FD", "#FBBF24", "#8B5CF6", "#10B981"];

export default function FinancialDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, remaining: 0, totalTransactions: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ show: boolean; message: string; type: "success" | "warning" | "error" }>({ show: false, message: "", type: "success" });

  // 🌟 State สำหรับ Modal กรอกข้อมูล
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "INCOME",
    categoryId: "",
    newCategoryName: "", // ใช้กรณีอยากสร้างหมวดหมู่ใหม่
    amount: "",
    date: new Date().toISOString().split('T')[0], // ค่าเริ่มต้นคือวันนี้
    description: ""
  });

  const showAlert = (message: string, type: "success" | "warning" | "error" = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 🌟 พระเอกคนที่ 1: ดึงข้อมูลบัญชี (GET - ต้องห้ามจำ)
      const resTx = await fetch("/api/financial/transactions", { cache: 'no-store' });
      const resultTx = await resTx.json();
      if (resultTx.success) {
        setSummary({
          totalIncome: resultTx.summary.totalIncome || 0,
          totalExpense: resultTx.summary.totalExpense || 0,
          remaining: resultTx.summary.remaining || 0,
          totalTransactions: resultTx.data.length || 0
        });
        setData(resultTx.data || []);
      }

      // 🌟 พระเอกคนที่ 2: ดึงหมวดหมู่มาเตรียมไว้ใน Dropdown (GET - ต้องห้ามจำ)
      const resCat = await fetch("/api/financial/categories", { cache: 'no-store' });
      const resultCat = await resCat.json();
      if (resultCat.success) setCategories(resultCat.data || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 🌟 ฟังก์ชันจัดการตอนกด "บันทึก" ใน Modal
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || (!formData.categoryId && !formData.newCategoryName)) {
      return showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
    }

    try {
      let finalCategoryId = formData.categoryId;

      // 🌟 ถ้าแอดมินเลือก "สร้างหมวดหมู่ใหม่" ให้ยิง API สร้างหมวดหมู่ก่อน
      if (formData.categoryId === "NEW") {
        // ⚠️ จุดที่แก้: เอา { cache: 'no-store' } ออกไปแล้ว เพราะนี่คือการ POST ข้อมูลใหม่
        const catRes = await fetch("/api/financial/categories", { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formData.newCategoryName, type: formData.type })
        });
        const catData = await catRes.json();
        if (catData.success) finalCategoryId = catData.data.id;
        else throw new Error("สร้างหมวดหมู่ไม่สำเร็จ");
      }

      // 🌟 ยิง API บันทึกรายรับ-รายจ่าย (POST ข้อมูลใหม่)
      const txRes = await fetch("/api/financial/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          categoryId: finalCategoryId,
          amount: parseFloat(formData.amount),
          date: formData.date,
          description: formData.description
        })
      });

      const txData = await txRes.json();
      if (txData.success) {
        showAlert("บันทึกข้อมูลเรียบร้อยแล้ว!", "success");
        setIsModalOpen(false);
        setFormData({ ...formData, amount: "", description: "", categoryId: "", newCategoryName: "" }); // รีเซ็ตฟอร์ม
        fetchData(); // 🌟 โหลดกราฟและตารางใหม่ทันที (ซึ่งฟังก์ชันนี้มี cache: 'no-store' ดักไว้แล้ว)
      } else {
        showAlert("เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("ระบบขัดข้อง กรุณาลองใหม่", "error");
    }
  };

  const pieData = data.filter(tx => tx.type === 'INCOME').reduce((acc: any[], tx) => {
    const catName = tx.category?.name || 'อื่นๆ';
    const existing = acc.find((item) => item.name === catName);
    if (existing) existing.value += tx.amount;
    else acc.push({ name: catName, value: tx.amount });
    return acc;
  }, []);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="text-xl font-bold text-[#1A534B] animate-pulse">กำลังโหลดข้อมูล...</div></div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen font-sans relative">
      
      {/* Alert Component */}
      {alert.show && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center space-x-3 transition-all duration-300 z-[60] ${
          alert.type === "success" ? "bg-emerald-500 text-white" : alert.type === "warning" ? "bg-orange-500 text-white" : "bg-red-500 text-white"
        }`}>
          <span>{alert.type === "success" ? "✅" : alert.type === "warning" ? "⚠️" : "❌"}</span>
          <span className="font-bold">{alert.message}</span>
        </div>
      )}

      {/* 🌟 Modal กรอกข้อมูล */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-down">
            <div className="bg-[#1A534B] p-4 flex justify-between items-center text-white">
              <h2 className="font-bold text-lg">📝 บันทึกรายรับ - รายจ่าย</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">❌</button>
            </div>
            <form onSubmit={handleSubmitTransaction} className="p-6 space-y-4">
              
              {/* ประเภท */}
              <div className="flex space-x-4">
                <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer font-bold transition-colors ${formData.type === 'INCOME' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                  <input type="radio" name="type" value="INCOME" className="hidden" checked={formData.type === 'INCOME'} onChange={(e) => setFormData({...formData, type: e.target.value, categoryId: ""})} />
                  💰 รายรับ
                </label>
                <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer font-bold transition-colors ${formData.type === 'EXPENSE' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                  <input type="radio" name="type" value="EXPENSE" className="hidden" checked={formData.type === 'EXPENSE'} onChange={(e) => setFormData({...formData, type: e.target.value, categoryId: ""})} />
                  💸 รายจ่าย
                </label>
              </div>

              {/* หมวดหมู่ */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">หมวดหมู่</label>
                <select required value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#1A534B]">
                  <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                  {categories.filter(c => c.type === formData.type).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  <option value="NEW" className="font-bold text-[#1A534B]">+ สร้างหมวดหมู่ใหม่...</option>
                </select>
              </div>

              {/* สร้างหมวดหมู่ใหม่ (โผล่มาเมื่อเลือก NEW) */}
              {formData.categoryId === "NEW" && (
                <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg animate-fade-in-down">
                  <label className="block text-xs font-bold text-gray-500 mb-1">ตั้งชื่อหมวดหมู่ใหม่</label>
                  <input type="text" required value={formData.newCategoryName} onChange={(e) => setFormData({...formData, newCategoryName: e.target.value})} placeholder="เช่น ค่าจ้างยาม, ค่าจัดสวน" className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-[#1A534B] text-sm" />
                </div>
              )}

              {/* จำนวนเงิน & วันที่ */}
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                  <input type="number" required min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#1A534B]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">วันที่ทำรายการ</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#1A534B]" />
                </div>
              </div>

              {/* รายละเอียด */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                <textarea rows={2} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="เช่น ซ่อมปั๊มน้ำซอย 2" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#1A534B] resize-none" />
              </div>

              {/* ปุ่มบันทึก */}
              <button type="submit" className="w-full bg-[#1A534B] hover:bg-[#14423b] text-white font-bold py-3 rounded-xl transition-colors mt-2 shadow-md">
                บันทึกข้อมูล
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header และปุ่มเพิ่มรายการ */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">สรุปรายงานการเงิน</h1>
          <p className="text-sm text-gray-500 mt-1">สรุปผลการดำเนินงานของหมู่บ้านจากฐานข้อมูล</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full flex items-center space-x-2 shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">
          <span className="text-xl">+</span>
          <span>เพิ่มรายการบัญชี</span>
        </button>
      </div>

      {/* 🌟 2. การ์ดสรุปผล ดึงค่าจาก state ล้วนๆ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-2xl font-bold">↓</div>
          <div>
            <p className="text-gray-500 text-sm font-bold mb-1">รายรับรวม</p>
            <p className="text-2xl font-extrabold text-emerald-600">{summary.totalIncome.toLocaleString()} <span className="text-sm font-normal">บาท</span></p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-2xl font-bold">↑</div>
          <div>
            <p className="text-gray-500 text-sm font-bold mb-1">ยอดรายจ่าย</p>
            <p className="text-2xl font-extrabold text-red-500">{summary.totalExpense.toLocaleString()} <span className="text-sm font-normal">บาท</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center space-x-4">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 text-2xl font-bold">🧾</div>
          <div>
             <p className="text-gray-500 text-sm font-bold mb-1">ยอดคงเหลือสุทธิ</p>
             <p className="text-2xl font-extrabold text-blue-600">{summary.remaining.toLocaleString()} <span className="text-sm font-normal">บาท</span></p>
          </div>
        </div>
      </div>

      {/* 🌟 3. กราฟสัดส่วน & ตารางรายการล่าสุด */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* กราฟวงกลม */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1">
          <h3 className="font-bold text-gray-800 mb-4">สัดส่วนรายรับ (แยกตามหมวดหมู่)</h3>
          <div className="flex items-center justify-center h-64 relative">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${Number(value || 0).toLocaleString()} บาท`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <p className="text-xs text-gray-500">รวมรายรับ</p>
                  <p className="text-lg font-bold text-gray-800">{summary.totalIncome.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-400 font-bold">ยังไม่มีข้อมูลรายรับในเดือนนี้</p>
            )}
          </div>
        </div>

        {/* ตารางรายการล่าสุด */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">รายการบันทึกบัญชีล่าสุด</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{summary.totalTransactions} รายการ</span>
          </div>
          
          <div className="overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            <table className="w-full text-sm text-gray-600 text-left relative">
              <thead className="text-gray-400 border-b border-gray-100 bg-white sticky top-0">
                <tr>
                  <th className="py-3 font-bold">วันที่</th>
                  <th className="py-3 font-bold">รายการ</th>
                  <th className="py-3 font-bold">ประเภท</th>
                  <th className="py-3 font-bold text-right">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.length > 0 ? (
                  data.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3">{new Date(tx.date).toLocaleDateString('th-TH')}</td>
                      <td className="py-3 font-medium text-gray-800">
                        {tx.category?.name || "ไม่มีหมวดหมู่"}
                        {tx.description && <span className="block text-[10px] text-gray-400 font-normal">{tx.description}</span>}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 font-bold bg-gray-50/50 rounded-lg">ยังไม่มีการบันทึกรายการบัญชี</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* อนิเมชัน */}
      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}