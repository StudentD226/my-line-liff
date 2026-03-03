'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import liff from '@line/liff';

export default function LiffPage() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    // โหลด LIFF
    liff.init({ liffId: "2009290251-UZlxLIQJ" })
      .then(() => setIsReady(true))
      .catch((err) => console.error(err));
  }, []);
liff.init({ liffId: "YOUR_LIFF_ID" }).then(() => {
  console.log("LIFF initialized!"); // ถ้าข้อความนี้ขึ้นใน Console แสดงว่า LIFF เวิร์ก
  if (liff.isLoggedIn()) {
    const profile = liff.getProfile();
    console.log("User Profile:", profile); // ดูว่าดึงชื่อเรามาได้ไหม
  }
});
  return (
    // พื้นหลังสีเขียว LINE
    <main className="min-h-screen bg-[#00B900] flex flex-col items-center pt-8 pb-10 font-sans">
      
      {/* โลโก้หรือหัวข้อ (ถ้ามี) */}
      <div className="text-white text-xl font-bold mb-6 tracking-wide drop-shadow-md">
        ระบบสารสนเทศเพื่อการบริหารจัดการค่าส่วนกลาง
      </div>

      {/* กล่องเมนู Grid 3 คอลัมน์ */}
      <div className="w-full max-w-md px-4">
        <div className="grid grid-cols-3 gap-3">
          
          {/* ปุ่มที่ 1: สมัครสมาชิก (เพิ่มมาใหม่) */}
          
          <div 
            onClick={() => router.push('/register')}
            className="bg-white rounded-2xl aspect-square flex flex-col items-center justify-center p-2 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <svg className="w-8 h-8 text-black mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-[11px] font-bold text-center text-black leading-tight">แบบฟอร์มลงทะเบียนข้อมูลผู้พักอาศัย</span>
          </div>

          {/* ปุ่มที่ 2: ตรวจสอบค่าส่วนกลาง */}
          <div className="bg-white rounded-2xl aspect-square flex flex-col items-center justify-center p-2 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <svg className="w-8 h-8 text-black mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            <span className="text-[11px] font-bold text-center text-black leading-tight">ตรวจสอบ<br/>ค่าส่วนกลาง</span>
          </div>

          {/* ปุ่มที่ 3: แจ้งชำระเงิน */}
          <div className="bg-white rounded-2xl aspect-square flex flex-col items-center justify-center p-2 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <svg className="w-8 h-8 text-black mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[11px] font-bold text-center text-black leading-tight">แจ้งชำระ<br/>ค่าส่วนกลาง</span>
          </div>

          {/* ปุ่มที่ 4: ข่าวประกาศ */}
          <div className="bg-white rounded-2xl aspect-square flex flex-col items-center justify-center p-2 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <svg className="w-8 h-8 text-black mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span className="text-[11px] font-bold text-center text-black leading-tight">ข่าวประกาศ</span>
          </div>

          {/* ปุ่มที่ 5: แจ้งปัญหา */}
          <div className="bg-white rounded-2xl aspect-square flex flex-col items-center justify-center p-2 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <svg className="w-8 h-8 text-black mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-[11px] font-bold text-center text-black leading-tight">แจ้งปัญหา</span>
          </div>
          
          {/* ปุ่มที่ 6: การตั้งค่า */}
          <div className="bg-white rounded-2xl aspect-square flex flex-col items-center justify-center p-2 shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer">
            <svg className="w-8 h-8 text-black mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[11px] font-bold text-center text-black leading-tight">การตั้งค่า</span>
          </div>

        </div>
      </div>
      
    </main>
  );
}