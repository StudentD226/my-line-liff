'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit, Trash2, Image as ImageIcon, 
  Calendar, Eye, MessageCircle, X, Send, AlertCircle, Pin, FileText,
  CheckCircle, Clock, Save
} from 'lucide-react';
import Swal from 'sweetalert2';

// --- Type สำหรับรับข้อมูลจาก Database ---
export type NewsItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  date: string;
  recipients: number;
  status: 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';
  views: number;
  isPinned: boolean;
};

export default function AdminNewsManagement() {
  // 🌟 State แบบรอรับข้อมูลจาก Database (ค่าเริ่มต้นเป็น Array ว่าง)
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ทุกหมวด');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', category: 'ทั่วไป', content: '', image: '', sendLine: true, publishNow: true 
  });

  // 🌟 ฟังก์ชันจำลองการดึงข้อมูลจาก Database (เตรียมเชื่อม API)
  const fetchNewsFromDB = async () => {
    setIsLoading(true);
    try {
      // 🚧 ตรงนี้เตรียมเปลี่ยนเป็น fetch('/api/admin/news') ของจริง
      // สมมติว่าดึงข้อมูลมาได้ตามนี้:
      const dummyData: NewsItem[] = [
        { id: '1', title: 'ประกาศงดจ่ายน้ำชั่วคราว ประจำเดือนมิถุนายน', category: 'บำรุงรักษา', content: 'ทางหมู่บ้านจะดำเนินการ...', date: '8 มิ.ย. 2567', recipients: 348, status: 'PUBLISHED', views: 312, isPinned: true },
        { id: '2', title: 'ประกาศเร่งด่วน: ไฟดับซอย 3-5', category: 'ด่วน', content: 'การไฟฟ้าแจ้งดับไฟ...', date: '7 มิ.ย. 2567', recipients: 348, status: 'PUBLISHED', views: 289, isPinned: false },
        { id: '3', title: 'เชิญร่วมงานลอยกระทง ณ สวนหย่อม', category: 'กิจกรรม', content: 'ขอเชิญลูกบ้าน...', date: '10 มิ.ย. 09:00', recipients: 348, status: 'SCHEDULED', views: 0, isPinned: false },
        { id: '4', title: 'ระเบียบจอดรถภายในหมู่บ้าน', category: 'ทั่วไป', content: 'ระเบียบการจอด...', date: '-', recipients: 0, status: 'DRAFT', views: 0, isPinned: false },
      ];
      setNews(dummyData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsFromDB();
  }, []);

  const TABS = [
    { id: 'ALL', label: 'ทั้งหมด', count: news.length },
    { id: 'PUBLISHED', label: 'เผยแพร่', count: news.filter(n => n.status === 'PUBLISHED').length },
    { id: 'DRAFT', label: 'ร่าง', count: news.filter(n => n.status === 'DRAFT').length },
    { id: 'SCHEDULED', label: 'ตั้งเวลา', count: news.filter(n => n.status === 'SCHEDULED').length },
  ];

  const CATEGORIES = ['ทุกหมวด', 'บำรุงรักษา', 'ด่วน', 'กิจกรรม', 'ทั่วไป'];

  const filteredNews = news.filter(n => {
    if (activeTab !== 'ALL' && n.status !== activeTab) return false;
    if (activeCategory !== 'ทุกหมวด' && n.category !== activeCategory) return false;
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'บำรุงรักษา': return 'bg-emerald-100 text-emerald-700';
      case 'ด่วน': return 'bg-rose-100 text-rose-700';
      case 'กิจกรรม': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PUBLISHED': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-max"><CheckCircle size={12}/> เผยแพร่</span>;
      case 'SCHEDULED': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1 w-max"><Clock size={12}/> ตั้งเวลา</span>;
      case 'DRAFT': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 flex items-center gap-1 w-max"><FileText size={12}/> ร่าง</span>;
      default: return null;
    }
  };

  const handleOpenModal = (editData: NewsItem | null = null) => {
    if (editData) {
      setEditingId(editData.id);
      setFormData({ 
        title: editData.title, category: editData.category, content: editData.content, 
        image: '', sendLine: true, publishNow: editData.status === 'PUBLISHED' 
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', category: 'ทั่วไป', content: '', image: '', sendLine: true, publishNow: true });
    }
    setIsModalOpen(true);
  };

  // 🌟 ฟังก์ชันจัดการเซฟ (ยิง API)
  const handleSave = async (statusToSave: string) => {
    if (!formData.title || !formData.content) {
      Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกหัวข้อและเนื้อหาประกาศ', customClass: { popup: 'rounded-[2rem]' } });
      return;
    }

    // 🚧 ตรงนี้เตรียมไว้ใส่โค้ด fetch ยิง POST/PUT ไปที่ Database ของจริง
    /*
    const payload = { ...formData, status: statusToSave };
    await fetch('/api/admin/news', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    */

    Swal.fire({
      icon: 'success',
      title: statusToSave === 'DRAFT' ? 'บันทึกฉบับร่างแล้ว' : 'เผยแพร่ประกาศแล้ว',
      text: formData.sendLine && statusToSave === 'PUBLISHED' ? 'ระบบได้ส่งแจ้งเตือนไปยัง LINE ลูกบ้านเรียบร้อยแล้ว' : '',
      showConfirmButton: false,
      timer: 2000,
      customClass: { popup: 'rounded-[2rem]' }
    });
    
    setIsModalOpen(false);
    fetchNewsFromDB(); // รีเฟรชข้อมูลใหม่
  };

  // 🌟 ฟังก์ชันจัดการลบ (ยิง API)
  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'ยืนยันการลบประกาศ?',
      text: "หากลบแล้วจะไม่สามารถกู้คืนข้อมูลได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ลบทิ้ง',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[2rem]' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        // 🚧 ตรงนี้เตรียมไว้ใส่โค้ด fetch ยิง DELETE ไป Database
        // await fetch(`/api/admin/news?id=${id}`, { method: 'DELETE' });
        
        setNews(news.filter(n => n.id !== id));
        Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-[2rem]' } });
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-10 h-10 border-4 border-[#376B64] border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen font-sans w-full">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">ข่าวประกาศ</h1>
            <p className="text-sm text-slate-500 mt-1">จัดการและเผยแพร่ข่าวสารไปยังลูกบ้านผ่าน LINE</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <Plus size={18} /> สร้างประกาศใหม่
          </button>
        </div>

        {/* List Section */}
        <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
          
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-100 custom-scrollbar">
            {TABS.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label} <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-400'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="ค้นหาประกาศ..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-medium"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${activeCategory === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table (Desktop) */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left hidden md:table min-w-[800px]">
              <thead className="bg-white border-b border-slate-100 text-slate-500 text-sm">
                <tr>
                  <th className="px-6 py-4 font-semibold w-2/5">หัวข้อ</th>
                  <th className="px-6 py-4 font-semibold">หมวด</th>
                  <th className="px-6 py-4 font-semibold">วันที่</th>
                  <th className="px-6 py-4 font-semibold text-center">ผู้รับ</th>
                  <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredNews.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {n.isPinned ? <Pin size={16} className="text-blue-500 mt-1 shrink-0" /> : <FileText size={16} className="text-slate-300 mt-1 shrink-0" />}
                        <div>
                          <p className="font-bold text-slate-800 text-base">{n.title}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
                            <span className="flex items-center gap-1"><Eye size={12} /> {n.views}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={12} /> 0</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getCategoryColor(n.category)}`}>{n.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{n.date}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600 text-center">{n.recipients || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">{getStatusBadge(n.status)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenModal(n)} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-white"><Edit size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredNews.map(n => (
                <div key={n.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${getCategoryColor(n.category)}`}>{n.category}</span>
                    {getStatusBadge(n.status)}
                  </div>
                  <h3 className="font-bold text-slate-800 leading-snug">{n.isPinned && <Pin size={14} className="inline text-blue-500 mr-1" />}{n.title}</h3>
                  <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {n.date}</span>
                    <span className="flex items-center gap-1"><Send size={12} /> ผู้รับ {n.recipients || '-'}</span>
                  </div>
                  <button onClick={() => handleOpenModal(n)} className="w-full mt-2 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-xs flex items-center justify-center gap-1 bg-white hover:bg-slate-50"><Edit size={14}/> จัดการประกาศ</button>
                </div>
              ))}
            </div>
            
            {filteredNews.length === 0 && (
              <div className="p-10 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                <FileText size={32} className="text-slate-300" />
                <p>ไม่พบประกาศในหมวดหมู่นี้</p>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm font-medium text-slate-500 bg-slate-50/50">
            <span>แสดง {filteredNews.length} จาก {news.length} รายการ</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 font-bold">1</button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL: สร้าง/แก้ไขประกาศ (Create/Edit Modal)
          ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start md:items-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl my-4 md:my-0 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            
            {/* Form Section (Left) */}
            <div className="flex-1 p-6 md:p-8 border-r border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <FileText className="text-slate-500" /> {editingId ? 'แก้ไขประกาศ' : 'เนื้อหาประกาศ'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="md:hidden text-slate-400 p-2"><X size={20}/></button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">หัวข้อประกาศ <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="ระบุหัวข้อที่สั้น กระชับ และน่าสนใจ..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-medium" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่ <span className="text-rose-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter(c => c !== 'ทุกหมวด').map(cat => (
                      <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat})} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${formData.category === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">เนื้อหา <span className="text-rose-500">*</span></label>
                  <textarea rows={5} value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="เขียนเนื้อหาประกาศของคุณที่นี่..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 font-medium resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">แนบรูปภาพ (Cover)</label>
                  <div className="w-full h-24 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
                    <ImageIcon size={24} className="mb-1" />
                    <span className="text-xs font-medium">คลิกเพื่ออัปโหลด - PNG/JPG สูงสุด 5MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings & Preview Section (Right) */}
            <div className="w-full md:w-80 bg-slate-50 p-6 md:p-8 flex flex-col gap-6 relative">
              <button onClick={() => setIsModalOpen(false)} className="hidden md:block absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>

              <div className="flex justify-between items-center md:hidden">
                <h2 className="text-lg font-black text-slate-800">ตั้งค่าการเผยแพร่</h2>
              </div>

              {/* LINE Preview Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative mt-2 md:mt-8">
                <p className="absolute -top-3 left-4 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"><MessageCircle size={10}/> ตัวอย่าง LINE</p>
                <div className="mt-2 space-y-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCategoryColor(formData.category)}`}>{formData.category}</span>
                  <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{formData.title || 'หัวข้อประกาศ...'}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{formData.content || 'เนื้อหาประกาศ...'}</p>
                  <p className="text-[10px] text-slate-400 pt-2 font-medium">วันนี้ 09:00 น.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1"><Clock size={16}/> กำหนดเวลาเผยแพร่</p>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input type="radio" name="publish" checked={formData.publishNow} onChange={() => setFormData({...formData, publishNow: true})} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600" />
                    <span className="text-sm font-medium text-slate-600">เผยแพร่ทันที</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="publish" checked={!formData.publishNow} onChange={() => setFormData({...formData, publishNow: false})} className="w-4 h-4 text-emerald-600 focus:ring-emerald-600" />
                    <span className="text-sm font-medium text-slate-600">กำหนดเวลาล่วงหน้า</span>
                  </label>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.sendLine} onChange={(e) => setFormData({...formData, sendLine: e.target.checked})} className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-600" />
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">ส่ง Push Notification ผ่าน LINE</span>
                      <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">ลูกบ้านจะได้รับการแจ้งเตือนทันที</span>
                    </div>
                  </label>
                  {formData.sendLine && (
                    <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-rose-600 text-[10px] font-bold">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <p className="leading-tight">ตรวจสอบก่อนเผยแพร่ ข้อความที่ส่งแล้วไม่สามารถลบออกจาก LINE ลูกบ้านได้</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto pt-4 flex flex-col gap-2">
                <button onClick={() => handleSave('PUBLISHED')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <Send size={16} /> {formData.publishNow ? 'เผยแพร่และแจ้ง LINE' : 'ตั้งเวลาเผยแพร่'}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">ยกเลิก</button>
                  <button onClick={() => handleSave('DRAFT')} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"><Save size={16} /> บันทึกร่าง</button>
                  {editingId && (
                    <button onClick={() => handleDelete(editingId)} className="p-2.5 bg-white border border-rose-200 text-rose-500 rounded-xl hover:bg-rose-50 transition-colors shrink-0"><Trash2 size={20} /></button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}