'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Megaphone, X, ChevronRight, Pin, BellRing, Image as ImageIcon } from 'lucide-react';

export type NewsItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  date: string;
  status: string;
  views: number;
  isPinned: boolean;
  imageUrl?: string; // เพิ่มตัวแปรรับลิงก์รูปภาพ
};

export default function ResidentNewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // ดึงข้อมูลจาก API ฝั่งลูกบ้าน
  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/news');
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
    fetchNews();
  }, []);

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'บำรุงรักษา': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ด่วน': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'กิจกรรม': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full"></div>
        <p className="text-sm font-bold text-slate-500">กำลังโหลดข่าวสาร...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      
      {/* Header Mobile UI */}
      <div className="bg-white px-5 pt-10 pb-6 border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-md">
            <Megaphone size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-tight">ข่าวประกาศ</h1>
            <p className="text-xs font-bold text-slate-500">อัปเดตข้อมูลข่าวสารจากนิติบุคคล</p>
          </div>
        </div>
      </div>

      {/* News Cards Feed */}
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {news.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center flex flex-col items-center gap-3 mt-10">
            <BellRing size={40} className="text-slate-300" />
            <p className="font-bold text-slate-500">ยังไม่มีประกาศใหม่ในขณะนี้</p>
          </div>
        ) : (
          news.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setSelectedNews(item)}
              className="w-full bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col overflow-hidden active:scale-[0.98]"
            >
              {/* แสดงรูปหน้าปกในหน้าฟีด (ถ้ามี) */}
              {item.imageUrl && (
                <div className="w-full h-36 bg-slate-100 relative">
                  <img src={item.imageUrl} alt="cover" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start w-full">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Calendar size={12} /> {item.date}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-black text-slate-800 text-[15px] leading-snug line-clamp-2">
                    {item.isPinned && <Pin size={14} className="inline text-blue-500 mr-1 -mt-0.5" />}
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 font-medium leading-relaxed">
                    {item.content}
                  </p>
                </div>

                <div className="pt-3 mt-1 border-t border-slate-50 flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    คลิกเพื่ออ่านรายละเอียด
                  </span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Popup Full Screen Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${getCategoryColor(selectedNews.category)}`}>
              {selectedNews.category}
            </span>
            <button 
              onClick={() => setSelectedNews(null)}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pb-20">
            {/* แสดงรูปหน้าปกขนาดใหญ่ในหน้าอ่านข่าว (ถ้ามี) */}
            {selectedNews.imageUrl && (
              <div className="w-full h-56 bg-slate-100 relative">
                <img src={selectedNews.imageUrl} alt="cover" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-5">
              <h2 className="text-2xl font-black text-slate-800 leading-tight mb-4 mt-2">
                {selectedNews.title}
              </h2>
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500">{selectedNews.date}</span>
              </div>
              
              <div className="prose prose-slate prose-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedNews.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}