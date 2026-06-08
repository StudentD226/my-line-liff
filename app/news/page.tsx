'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Droplet, Zap, CalendarDays, Megaphone, FileText } from 'lucide-react';

// --- Type สำหรับรับข้อมูลจาก Database ---
export type ResidentNewsItem = {
  id: string;
  title: string;
  desc: string;
  category: string;
  date: string;
  hasImage: boolean;
};

export default function ResidentNewsFeed() {
  // 🌟 State แบบรอรับข้อมูลจาก Database
  const [news, setNews] = useState<ResidentNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 ฟังก์ชันจำลองการดึงข้อมูลจาก Database (เตรียมเชื่อม API)
  const fetchNewsFromDB = async () => {
    setIsLoading(true);
    try {
      // 🚧 ตรงนี้เตรียมเปลี่ยนเป็น fetch('/api/news') ของจริง
      const dummyData: ResidentNewsItem[] = [
        { id: '1', title: 'ประกาศงดจ่ายน้ำชั่วคราว ประจำเดือนมิถุนายน', desc: 'ทางหมู่บ้านจะดำเนินการซ่อมแซมระบบท่อประปาส่วนกลาง ในวันที่ 10 มิ.ย. 2567', category: 'บำรุงรักษา', date: '8 มิ.ย. 2567', hasImage: true },
        { id: '2', title: 'ประกาศเร่งด่วน: ไฟดับชั่วคราว ซอย 3-5', desc: 'การไฟฟ้าแจ้งดับไฟเพื่อตัดลิดรอนกิ่งไม้พาดสายไฟ ขออภัยในความไม่สะดวก', category: 'ด่วน', date: '7 มิ.ย. 2567', hasImage: false },
        { id: '3', title: 'เชิญร่วมงานลอยกระทง ณ ส่วนหย่อมเฟส 2', desc: 'เตรียมพบกับซุ้มอาหารและกิจกรรมแจกของรางวัลมากมาย', category: 'กิจกรรม', date: '10 มิ.ย. 2567', hasImage: false },
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

  const getCategoryStyle = (cat: string) => {
    switch(cat) {
      case 'บำรุงรักษา': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <Droplet size={14} /> };
      case 'ด่วน': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', icon: <Zap size={14} /> };
      case 'กิจกรรม': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: <CalendarDays size={14} /> };
      default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: <Megaphone size={14} /> };
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="animate-spin w-8 h-8 border-4 border-[#376B64] border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-10">
      
      {/* Header */}
      <div className="bg-white px-4 pt-10 pb-6 rounded-b-[2rem] shadow-sm sticky top-0 z-10 border-b border-slate-200">
        <h1 className="text-xl font-black text-slate-800 text-center flex items-center justify-center gap-2">
          <Megaphone className="text-emerald-600" size={24}/> ข่าวประกาศหมู่บ้าน
        </h1>
        <p className="text-xs text-slate-500 text-center mt-2 font-medium">ติดตามข่าวสารและกิจกรรมล่าสุดจากนิติบุคคล</p>
      </div>

      {/* News Feed List */}
      <div className="p-4 space-y-4 max-w-lg mx-auto mt-2">
        {news.map(item => {
          const style = getCategoryStyle(item.category);
          return (
            <div key={item.id} className={`bg-white rounded-2xl shadow-sm border ${style.border} overflow-hidden active:scale-[0.98] transition-transform cursor-pointer`}>
              
              {/* Image Cover Placeholder (แสดงรูปลูกบ้านเห็นชัดๆ) */}
              {item.hasImage && (
                <div className="h-40 w-full bg-slate-50 flex items-center justify-center border-b border-slate-100">
                   <div className={`w-16 h-16 rounded-full ${style.bg} ${style.text} flex items-center justify-center`}>
                      {style.icon}
                   </div>
                </div>
              )}

              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${style.bg} ${style.text}`}>
                    {style.icon} {item.category}
                  </span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                    <Calendar size={14} /> {item.date}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-base leading-snug mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          )
        })}

        {news.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <FileText size={48} className="text-slate-300" />
            <p className="font-bold">ยังไม่มีข่าวประกาศในขณะนี้</p>
          </div>
        )}
      </div>

    </div>
  );
}