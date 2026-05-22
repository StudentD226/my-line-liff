'use client';
import { useState, useEffect } from 'react';
import liff from '@line/liff';

export default function NewsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    liff.init({ liffId: "2009290251-UZlxLIQJ" }).then(() => {
      if (!liff.isLoggedIn()) {
        liff.login();
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#376B64] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-4 font-sans text-gray-800 pb-10">
      <div className="flex items-center mb-6 pt-2">
        <button onClick={() => liff.closeWindow()} className="mr-3 text-gray-600 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-[22px] font-bold text-black">ข่าวประกาศ</h1>
      </div>

      <div className="bg-white p-8 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center mt-10">
        <div className="w-20 h-20 bg-[#376B64]/10 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-[#376B64]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">ยังไม่มีประกาศใหม่</h2>
        <p className="text-sm text-gray-500">หากมีข่าวสารหรือประกาศจากทางนิติบุคคล จะแสดงที่หน้านี้ครับ</p>
      </div>
    </div>
  );
}