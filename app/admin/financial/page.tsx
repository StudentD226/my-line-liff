"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, Plus, Info, Upload, 
  ArrowUpDown, X, CheckCircle, AlertCircle, FileText, Calendar, Tag,
  Edit, Trash2, AlertTriangle, Settings, Save, Loader2
} from "lucide-react";

const COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", 
  "#EF4444", "#06B6D4", "#F97316", "#84CC16", "#6366F1", "#D946EF"
];
const fullThaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="relative flex items-center group cursor-help ml-2">
    <Info size={16} className="text-gray-400 hover:text-[#1A534B] transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50 text-center">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
    </div>
  </div>
);

export default function FinancialDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [yearlyChartData, setYearlyChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, remaining: 0, totalTransactions: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [alert, setAlert] = useState<{ show: boolean; message: string; type: "success" | "error" | "warning" }>({ show: false, message: "", type: "success" });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null);
  
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    type: "EXPENSE", title: "", categoryId: "", newCategoryName: "", amount: "",
    date: new Date().toISOString().split('T')[0], description: "", receiptUrl: "" 
  });

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const showAlert = (message: string, type: "success" | "error" | "warning" = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "success" }), 4000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resTx = await fetch(`/api/financial/transactions?month=${selectedMonth}&year=${selectedYear}`, { cache: 'no-store' });
      const resultTx = await resTx.json();
      if (resultTx.success) {
        setSummary({
          totalIncome: resultTx.summary?.totalIncome || 0,
          totalExpense: resultTx.summary?.totalExpense || 0,
          remaining: (resultTx.summary?.totalIncome || 0) - (resultTx.summary?.totalExpense || 0),
          totalTransactions: resultTx.data?.length || 0
        });
        setData(resultTx.data || []);
      }

      const resSummary = await fetch(`/api/financial/summary?year=${selectedYear}`, { cache: 'no-store' });
      const resultSummary = await resSummary.json();
      if (resultSummary.success) setYearlyChartData(resultSummary.data || []);

      const resCat = await fetch("/api/financial/categories", { cache: 'no-store' });
      const resultCat = await resCat.json();
      if (resultCat.success) setCategories(resultCat.data || []);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      showAlert("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === 'category') {
          aValue = a.category?.name || ''; bValue = b.category?.name || '';
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const resetAndCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ type: "EXPENSE", title: "", categoryId: "", newCategoryName: "", amount: "", date: new Date().toISOString().split('T')[0], description: "", receiptUrl: "" });
  };

  const handleEditClick = (tx: any) => {
    let titleParts = tx.title.split(' - ');
    setEditingId(tx.id);
    setFormData({
      type: tx.type,
      title: titleParts[0],
      categoryId: tx.categoryId,
      newCategoryName: "",
      amount: tx.amount.toString(),
      date: new Date(tx.date).toISOString().split('T')[0],
      description: titleParts[1] || "",
      receiptUrl: tx.receiptUrl || ""
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return showAlert("ขนาดไฟล์ต้องไม่เกิน 10MB", "warning");
    }

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('type', formData.type); 
    uploadData.append('date', formData.date); 

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });
      const data = await res.json();
      
      if (data.success) {
        setFormData({ ...formData, receiptUrl: data.url }); 
        showAlert("อัปโหลดรูปภาพสำเร็จ!", "success");
      } else {
        showAlert(data.error || "อัปโหลดล้มเหลว", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("ระบบขัดข้องในการอัปโหลด", "error");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isUploading) return;

    if (!formData.title || !formData.amount || (!formData.categoryId && !formData.newCategoryName)) {
      return showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
    }

    setIsSubmitting(true);
    try {
      let finalCategoryId = formData.categoryId;

      if (formData.categoryId === "NEW") {
        const catRes = await fetch("/api/financial/categories", { 
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formData.newCategoryName, type: formData.type })
        });
        const catData = await catRes.json();
        if (catData.success) finalCategoryId = catData.data.id;
        else throw new Error("สร้างหมวดหมู่ไม่สำเร็จ");
      }

      const payload = {
        type: formData.type, categoryId: finalCategoryId, title: formData.title,
        amount: parseFloat(formData.amount), date: formData.date,
        description: formData.description, receiptUrl: formData.receiptUrl
      };

      let txRes;
      if (editingId) {
        txRes = await fetch(`/api/financial/transactions/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        txRes = await fetch("/api/financial/transactions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const txData = await txRes.json();
      if (txData.success) {
        showAlert(editingId ? "อัปเดตข้อมูลสำเร็จ!" : "บันทึกข้อมูลเรียบร้อยแล้ว!", "success");
        resetAndCloseModal();
        fetchData(); 
      } else {
        showAlert("เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("ระบบขัดข้อง กรุณาลองใหม่", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/financial/transactions/${deletingId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showAlert("ลบรายการเรียบร้อยแล้ว!", "success");
        setIsDeleteModalOpen(false);
        setDeletingId(null);
        fetchData(); 
      } else {
        showAlert("ลบรายการล้มเหลว", "error");
      }
    } catch (error) {
      showAlert("ระบบขัดข้อง", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/financial/categories/${categoryToDelete}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        showAlert(errorData?.error || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", "error");
        setCategoryToDelete(null); 
        return;
      }
      const data = await res.json();
      if (data.success) {
        showAlert("ลบหมวดหมู่เรียบร้อยแล้ว", "success");
        setCategoryToDelete(null); 
        fetchData(); 
      } else {
        showAlert(data.error || "ลบหมวดหมู่ล้มเหลว", "error");
        setCategoryToDelete(null);
      }
    } catch (error) {
      console.error(error);
      showAlert("ระบบขัดข้อง ติดต่อเซิร์ฟเวอร์ไม่ได้", "error");
      setCategoryToDelete(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategory) return;
    try {
      const res = await fetch(`/api/financial/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategory.name })
      });
      const data = await res.json();
      if (data.success) {
        showAlert("เปลี่ยนชื่อหมวดหมู่เรียบร้อยแล้ว", "success");
        setEditingCategory(null);
        fetchData();
      } else {
        showAlert("แก้ไขหมวดหมู่ล้มเหลว", "error");
      }
    } catch (error) {
      showAlert("ระบบขัดข้อง", "error");
    }
  };

  const pieData = categories.filter(c => c.type === 'EXPENSE').map(cat => {
    const total = data.filter(tx => tx.type === 'EXPENSE' && tx.category?.name === cat.name).reduce((sum, tx) => sum + tx.amount, 0);
    return { name: cat.name, value: total };
  }).filter(item => item.value > 0);

  const totalExpenseForPie = pieData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading && data.length === 0 && yearlyChartData.length === 0) 
    return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="text-[#1A534B] animate-pulse font-bold text-xl">กำลังประมวลผลบัญชี...</div></div>;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen font-sans">
      
      <div className={`fixed top-6 right-6 z-[100] transition-all duration-300 transform ${alert.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div className={`flex items-center space-x-3 p-4 rounded-xl shadow-xl border-l-4 ${alert.type === 'success' ? 'bg-white border-emerald-500 text-gray-800' : alert.type === 'error' ? 'bg-white border-red-500 text-gray-800' : 'bg-white border-orange-500 text-gray-800'}`}>
          {alert.type === 'success' && <CheckCircle className="text-emerald-500" size={24} />}
          {alert.type === 'error' && <X className="text-red-500" size={24} />}
          {alert.type === 'warning' && <AlertCircle className="text-orange-500" size={24} />}
          <span className="font-bold text-sm">{alert.message}</span>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-down p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="font-bold text-xl text-gray-800 mb-2">ยืนยันการลบรายการ?</h2>
            <p className="text-gray-500 text-sm mb-6">คุณกำลังจะลบรายการบัญชีนี้ ข้อมูลยอดเงินจะถูกคำนวณใหม่ และไม่สามารถกู้คืนได้</p>
            <div className="flex space-x-3">
              <button onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">ยกเลิก</button>
              <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-md">
                {isSubmitting ? 'กำลังลบ...' : 'ลบทิ้ง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-down p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="font-bold text-xl text-gray-800 mb-2">ยืนยันการลบหมวดหมู่?</h2>
            <p className="text-gray-500 text-sm mb-6">หากหมวดหมู่นี้ถูกนำไปใช้บันทึกบัญชีแล้ว จะไม่สามารถลบได้ครับ</p>
            <div className="flex space-x-3">
              <button onClick={() => setCategoryToDelete(null)} disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">ยกเลิก</button>
              <button onClick={confirmDeleteCategory} disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-md">
                {isSubmitting ? 'กำลังลบ...' : 'ลบทิ้ง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryManagerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-down">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="font-bold text-xl text-gray-800">จัดการหมวดหมู่ ({formData.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'})</h2>
              <button onClick={() => setIsCategoryManagerOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {categories.filter(c => c.type === formData.type).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {editingCategory?.id === cat.id ? (
                      <div className="flex-1 flex items-center space-x-2 mr-2">
                        <input 
                          type="text" 
                          value={editingCategory?.name || ""} 
                          onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#1A534B]"
                          autoFocus
                        />
                        <button onClick={handleSaveCategoryEdit} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200" title="บันทึก"><Save size={16} /></button>
                        <button onClick={() => setEditingCategory(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300" title="ยกเลิก"><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-gray-700">{cat.name}</span>
                        <div className="flex items-center space-x-1">
                          <button onClick={() => setEditingCategory({ id: cat.id, name: cat.name })} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="แก้ไข">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => setCategoryToDelete(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="ลบ">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {categories.filter(c => c.type === formData.type).length === 0 && (
                  <p className="text-center text-gray-400 font-bold py-4">ไม่มีหมวดหมู่</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-down">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="font-bold text-xl text-gray-800">{editingId ? 'แก้ไขรายการบัญชี' : 'เพิ่มรายการบัญชี'}</h2>
              <button onClick={resetAndCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmitTransaction} className="p-6 space-y-5">
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button type="button" onClick={() => setFormData({...formData, type: 'INCOME', categoryId: ""})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  รายรับ
                </button>
                <button type="button" onClick={() => setFormData({...formData, type: 'EXPENSE', categoryId: ""})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  รายจ่าย
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อรายการ <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="เช่น ซ่อมไฟถนน" className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A534B] outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนเงิน (บาท) <span className="text-red-500">*</span></label>
                    <input type="number" required min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A534B] outline-none transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">วันที่ <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A534B] outline-none transition-all text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-bold text-gray-700">หมวดหมู่ <span className="text-red-500">*</span></label>
                    <button type="button" onClick={() => setIsCategoryManagerOpen(true)} className="text-xs font-bold text-[#1A534B] flex items-center hover:underline">
                      <Settings size={12} className="mr-1" /> จัดการ
                    </button>
                  </div>
                  <div className="relative mb-2">
                    <Tag className="absolute left-3 top-3 text-gray-400" size={18} />
                    <select required value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A534B] outline-none transition-all text-sm appearance-none bg-white">
                      <option value="" disabled>เลือกหมวดหมู่</option>
                      {categories.filter(c => c.type === formData.type).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      <option value="NEW" className="font-bold text-[#1A534B]">+ สร้างหมวดหมู่ใหม่...</option>
                    </select>
                  </div>
                  {formData.categoryId === "NEW" && (
                    <input type="text" required value={formData.newCategoryName} onChange={(e) => setFormData({...formData, newCategoryName: e.target.value})} placeholder="พิมพ์ชื่อหมวดหมู่ใหม่" className="w-full px-4 py-2 border border-dashed border-[#1A534B] rounded-lg focus:ring-1 focus:ring-[#1A534B] outline-none transition-all text-sm bg-[#1A534B]/5" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">หมายเหตุเพิ่มเติม</label>
                  <textarea rows={2} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1A534B] outline-none transition-all text-sm resize-none" placeholder="รายละเอียดอื่นๆ (ถ้ามี)"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">หลักฐาน (บิล/สลิป)</label>
                  {formData.receiptUrl ? (
                    <div className="relative w-full h-32 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center group">
                      <img src={formData.receiptUrl} alt="Receipt" className="max-w-full max-h-full object-contain" />
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, receiptUrl: ""})} 
                        className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-full shadow-md hover:bg-red-50 transition-colors"
                        title="ลบรูปนี้"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center w-full h-24 px-4 transition bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-[#1A534B] hover:bg-gray-100 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="flex flex-col items-center space-y-2">
                        {isUploading ? (
                          <Loader2 className="text-[#1A534B] animate-spin" size={24} />
                        ) : (
                          <Upload className="text-gray-400" size={20} />
                        )}
                        <span className="text-xs text-gray-500 font-medium">
                          {isUploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่ออัปโหลดรูปภาพ (ไม่เกิน 10MB)'}
                        </span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={resetAndCloseModal} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">ยกเลิก</button>
                <button type="submit" disabled={isSubmitting || isUploading} className={`flex-1 px-4 py-2 text-white font-bold rounded-lg transition-colors shadow-md ${(isSubmitting || isUploading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1A534B] hover:bg-[#14423b]'}`}>
                  {isSubmitting ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-800">สรุปรายงานการเงิน</h1>
            <InfoTooltip text="ยอดรวมคิดจากรอบบิลวันที่ 27 ของเดือนก่อนหน้า ถึงวันที่ 26 ของเดือนที่เลือก" />
          </div>
          <p className="text-sm text-gray-500 mt-1">ภาพรวมรายรับรายจ่ายของหมู่บ้าน</p>
        </div>
        
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#1A534B] outline-none block p-2.5 font-bold shadow-sm cursor-pointer">
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>รอบบิล {fullThaiMonths[i+1]} {selectedYear + 543}</option>
            ))}
          </select>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#1A534B] hover:bg-[#14423b] text-white font-bold py-2.5 px-5 rounded-lg flex items-center space-x-2 shadow-md transition-colors whitespace-nowrap">
            <Plus size={18} />
            <span>เพิ่มรายการ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-bold flex items-center">รายรับรวม <InfoTooltip text="รวมรายรับทั้งหมด (ค่าส่วนกลาง + รายรับอื่นๆ)" /></h3>
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="text-emerald-500" size={20} /></div>
          </div>
          <p className="text-3xl font-extrabold text-gray-800">{summary.totalIncome.toLocaleString()} <span className="text-sm text-gray-500 font-normal">บาท</span></p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-bold flex items-center">รายจ่ายรวม</h3>
            <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="text-red-500" size={20} /></div>
          </div>
          <p className="text-3xl font-extrabold text-gray-800">{summary.totalExpense.toLocaleString()} <span className="text-sm text-gray-500 font-normal">บาท</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-bold flex items-center">คงเหลือสุทธิ</h3>
            <div className="p-2 bg-[#1A534B]/10 rounded-lg"><Wallet className="text-[#1A534B]" size={20} /></div>
          </div>
          <p className={`text-3xl font-extrabold ${summary.remaining >= 0 ? 'text-[#1A534B]' : 'text-red-500'}`}>
            {summary.remaining.toLocaleString()} <span className="text-sm text-gray-500 font-normal">บาท</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center">สถิติรายรับ - รายจ่าย รายปี <InfoTooltip text={`ข้อมูลสรุปรวมตั้งแต่ ม.ค. - ธ.ค. ปี ${selectedYear + 543}`} /></h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} width={40} />
                <RechartsTooltip cursor={{fill: '#F3F4F6'}} formatter={(value: any) => [`${Number(value || 0).toLocaleString()} บาท`]} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="รายรับ" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="รายจ่าย" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center">สัดส่วนรายจ่ายรอบบิลปัจจุบัน <InfoTooltip text={`วิเคราะห์รายจ่ายแยกตามหมวดหมู่ ของรอบบิล ${fullThaiMonths[selectedMonth]}`} /></h3>
          <div className="flex items-center justify-center h-64 relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => {
                      const percent = ((Number(value) / totalExpenseForPie) * 100).toFixed(1);
                      return [`${Number(value || 0).toLocaleString()} บาท (${percent}%)`, 'ยอดเงิน'];
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 font-bold">ไม่มีข้อมูลรายจ่ายในรอบบิลนี้</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center">รายการบัญชีรอบบิลนี้ <InfoTooltip text="กดที่หัวตารางเพื่อจัดเรียงลำดับข้อมูล" /></h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-bold">{summary.totalTransactions} รายการ</span>
        </div>
        
        <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => requestSort('date')}>
                  <div className="flex items-center space-x-1"><span>วันที่</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => requestSort('title')}>
                  <div className="flex items-center space-x-1"><span>รายการ</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => requestSort('category')}>
                  <div className="flex items-center space-x-1"><span>หมวดหมู่</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap text-center" onClick={() => requestSort('type')}>
                  <div className="flex items-center justify-center space-x-1"><span>ประเภท</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap text-right" onClick={() => requestSort('amount')}>
                  <div className="flex items-center justify-end space-x-1"><span>จำนวนเงิน</span><ArrowUpDown size={14} /></div>
                </th>
                <th className="px-6 py-4 font-bold text-center whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedData.length > 0 ? (
                sortedData.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-gray-600 font-medium">{new Date(tx.date).toLocaleDateString('th-TH')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-800">{tx.title}</p>
                        {tx.receiptUrl && (
                          <a href={tx.receiptUrl} target="_blank" rel="noreferrer" title="ดูหลักฐานบิล/สลิป" className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded transition-colors">
                            <FileText size={14} />
                          </a>
                        )}
                      </div>
                      {tx.isAuto && <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A534B]/10 text-[#1A534B]">ดึงอัตโนมัติจากบิลค่าส่วนกลาง</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{tx.category?.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {tx.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!tx.isAuto ? (
                        <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(tx)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="แก้ไขรายการ">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => { setDeletingId(tx.id); setIsDeleteModalOpen(true); }} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="ลบรายการ">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium opacity-50 block">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-bold bg-white">ไม่มีรายการบัญชีในรอบบิลนี้</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}