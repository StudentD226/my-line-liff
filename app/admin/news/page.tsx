'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit, Trash2, Image as ImageIcon, 
  Calendar, X, Send, Pin, FileText, CheckCircle, Save
} from 'lucide-react';
import Swal from 'sweetalert2';

export type NewsItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  date: string;
  recipients: number;
  status: 'PUBLISHED' | 'DRAFT';
  views: number;
  isPinned: boolean;
  imageUrl?: string;
};

export default function AdminNewsManagement() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [activeTab, setActiveTab] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ทุกหมวด');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    title: '', category: 'ทั่วไป', content: '', image: ''
  });

  const fetchNewsFromDB = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/news');
      const json = await res.json();
      if (json.success) {
        setNews(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch news", error);
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
      case 'DRAFT': return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 flex items-center gap-1 w-max"><FileText size={12}/> ร่าง</span>;
      default: return null;
    }
  };

  const handleOpenModal = (editData: NewsItem | null = null) => {
    if (editData) {
      setEditingId(editData.id);
      setFormData({ 
        title: editData.title, category: editData.category, content: editData.content, 
        image: editData.imageUrl || ''
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', category: 'ทั่วไป', content: '', image: '' });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      uploadData.append('upload_preset', 'news_unsigned'); 

      // ใส่ชื่อคลาวด์เนมของลูกพี่
      const cloudName = 'dszygeicw';
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: uploadData
      });

      const json = await res.json();
      
      if (json.secure_url) {
        const optimizedUrl = json.secure_url.replace('/upload/', '/upload/w_1000,c_limit,q_auto/');
        setFormData({ ...formData, image: optimizedUrl });
        Swal.fire({ icon: 'success', title: 'อัปโหลดรูปสำเร็จ', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-[2rem]' } });
      } else {
        Swal.fire({ icon: 'error', title: 'อัปโหลดไม่สำเร็จ', text: json.error?.message || 'กรุณาลองใหม่อีกครั้ง' });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อ Cloudinary ล้มเหลว' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (statusToSave: string) => {
    if (!formData.title.trim()) {
      return Swal.fire({ icon: 'warning', title: 'กรุณาระบุหัวข้อประกาศ', customClass: { popup: 'rounded-[2rem]' } });
    }
    if (!formData.content.trim()) {
      return Swal.fire({ icon: 'warning', title: 'กรุณาระบุเนื้อหาประกาศ', customClass: { popup: 'rounded-[2rem]' } });
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          title: formData.title,
          category: formData.category,
          content: formData.content,
          status: statusToSave,
          sendLine: true, 
          imageUrl: formData.image
        })
      });
      const json = await res.json();
      
      if (json.success) {
        Swal.fire({ 
          icon: 'success', 
          title: 'บันทึกสำเร็จ', 
          text: statusToSave === 'PUBLISHED' && json.lineSent ? `ส่งข้อความ LINE หาลูกบ้านจำนวน ${json.lineSent} คนแล้ว` : '',
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' }
        });
        setIsModalOpen(false);
        fetchNewsFromDB();
      } else {
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: json.error });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'การเชื่อมต่อขัดข้อง' });
    } finally {
      setIsLoading(false);
    }
  };

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
        setIsLoading(true);
        try {
          const res = await fetch(`/api/admin/news?id=${id}`, { method: 'DELETE' });
          const json = await res.json();
          if (json.success) {
            Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-[2rem]' } });
            fetchNewsFromDB();
          } else {
            Swal.fire({ icon: 'error', title: 'ลบล้มเหลว', text: json.error });
            setIsLoading(false);
          }
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'การเชื่อมต่อขัดข้อง' });
          setIsLoading(false);
        }
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

          {/* Table */}
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
                          {/* ❌ เอาส่วนยอดวิวกับคอมเมนต์ออกไปแล้ว */}
                          <p className="font-bold text-slate-800 text-base mt-0.5">{n.title}</p>
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
                        <button onClick={() => handleDelete(n.id)} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors bg-white"><Trash2 size={16} /></button>
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
                  <h3 className="font-bold text-slate-800 leading-snug">{n.title}</h3>
                  <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {n.date}</span>
                    <span className="flex items-center gap-1"><Send size={12} /> ผู้รับ {n.recipients || '-'}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleOpenModal(n)} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-xs flex items-center justify-center gap-1 bg-white hover:bg-slate-50"><Edit size={14}/> แก้ไข</button>
                    <button onClick={() => handleDelete(n.id)} className="flex-1 py-2 border border-rose-200 bg-rose-50 text-rose-600 font-bold text-xs rounded-lg flex items-center justify-center gap-1 hover:bg-rose-100 transition-colors"><Trash2 size={14}/> ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: สร้าง/แก้ไขประกาศ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start md:items-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl my-4 md:my-0 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            
            {/* Form Section */}
            <div className="flex-1 p-6 md:p-8 border-r border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <FileText className="text-slate-500" /> {editingId ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="md:hidden text-slate-400 p-2"><X size={20}/></button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">หัวข้อประกาศ <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="ระบุหัวข้อ..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-medium" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่ <span className="text-rose-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter(c => c !== 'ทุกหมวด').map(cat => (
                      <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat})} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${formData.category === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">เนื้อหา <span className="text-rose-500">*</span></label>
                  <textarea rows={6} value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="เขียนเนื้อหา..." className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-medium resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">แนบรูปภาพ (Cover)</label>
                  <input type="file" id="upload-image" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                  <label htmlFor="upload-image" className={`w-full h-32 border-2 border-dashed ${formData.image ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50'} rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer overflow-hidden relative transition-colors`}>
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                        <span className="text-xs font-bold text-slate-500">กำลังอัปโหลดขึ้นเซิร์ฟเวอร์...</span>
                      </div>
                    ) : formData.image ? (
                      <>
                        <img src={formData.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                        <div className="relative z-10 flex flex-col items-center bg-white/90 px-4 py-2 rounded-xl shadow-sm border border-emerald-100">
                          <CheckCircle size={24} className="text-emerald-500 mb-1" />
                          <span className="text-xs font-bold text-emerald-700">อัปโหลดสำเร็จ (คลิกเปลี่ยนรูป)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={24} className="mb-1" />
                        <span className="text-xs font-medium">คลิกเพื่ออัปโหลดรูปภาพหน้าปกประกาศ</span>
                      </>
                    )}
                  </label>
                </div>

              </div>
            </div>

            {/* 🌟 Settings & Preview Section (ปรับใหม่เป็นหน้าจอ LINE จำลอง) 🌟 */}
            <div className="w-full md:w-80 bg-slate-100 p-6 md:p-8 flex flex-col relative border-l border-slate-200">
              <button onClick={() => setIsModalOpen(false)} className="hidden md:block absolute top-6 right-6 text-slate-400 hover:text-slate-600 z-10"><X size={24}/></button>
              
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Send size={18} className="text-[#00B900]" /> ตัวอย่างข้อความ LINE
              </h3>

              {/* จำลองห้องแชท LINE */}
              <div className="flex-1 bg-[#849ebf] rounded-[2rem] p-4 flex flex-col overflow-hidden relative shadow-inner mb-6 min-h-[350px]">
                
                {/* จำลองข้อความแชท (Flex Message Bubble) */}
                <div className="bg-white rounded-2xl w-full overflow-hidden shadow-sm flex flex-col mt-4">
                  {/* Hero Image */}
                  {formData.image ? (
                    <div className="w-full h-32 bg-slate-200 relative">
                      <img src={formData.image} className="w-full h-full object-cover" alt="cover" />
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-b border-slate-100">
                      <ImageIcon size={20} className="mb-1 opacity-50" />
                      <span className="text-[10px]">(ไม่มีรูปหน้าปก)</span>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-800 flex-1">📢 ข่าวประกาศหมู่บ้าน</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white bg-emerald-600`}>{formData.category}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{formData.title || 'หัวข้อประกาศจะแสดงที่นี่...'}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed">{formData.content || 'เนื้อหาประกาศย่อจะแสดงตรงนี้ประมาณ 3-5 บรรทัดแรก...'}</p>
                    
                    <div className="w-full h-px bg-slate-100 my-2"></div>
                    <div className="text-[9px] text-slate-400">ประกาศเมื่อ: วันนี้</div>
                  </div>

                  {/* Footer Button */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <div className="w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-lg text-center shadow-sm">
                      อ่านรายละเอียดเต็ม
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-col gap-2">
                <button onClick={() => handleSave('PUBLISHED')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95">
                  <Send size={16} /> เผยแพร่และแจ้ง LINE ทันที
                </button>
                <button onClick={() => handleSave('DRAFT')} className="w-full py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 flex items-center justify-center gap-1 transition-colors"><Save size={16} /> บันทึกเป็นฉบับร่าง</button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}