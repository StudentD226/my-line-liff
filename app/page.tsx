'use client'
import { useEffect } from 'react';
import liff from '@line/liff';

export default function LiffIndexPage() {
  useEffect(() => {
    // ฟังก์ชันสำหรับเริ่มต้น LIFF
    const initLiff = async () => {
      try {
        await liff.init({ liffId: "2009290251-UZlxLIQJ" });
        console.log("LIFF initialized!");

        // บังคับ Login ทันทีถ้ายังไม่ได้ Login
        if (!liff.isLoggedIn()) {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF Initialization failed", err);
      }
    };

    initLiff();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center w-full max-w-sm text-center">
        {/* ไอคอนโหลดหมุนๆ */}
        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-teal-600 mb-6"></div>
        
        <h1 className="text-xl font-extrabold text-gray-800 mb-2 tracking-tight">
          กำลังเชื่อมต่อระบบ
        </h1>
        <p className="text-sm text-gray-500 font-medium">
          กรุณาเลือกเมนูการใช้งาน<br/>จากแถบเมนู (Rich Menu) ด้านล่างครับ
        </p>
      </div>
    </main>
  );
}