'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import Swal from 'sweetalert2';
import { User, Phone, Home, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [lineId, setLineId] = useState('');
  
  // ข้อมูลโปรไฟล์จาก LINE
  const [displayName, setDisplayName] = useState('');
  const [pictureUrl, setPictureUrl] = useState('');

  // ข้อมูลฟอร์ม
  const [name, setName] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasExistingHouse, setHasExistingHouse] = useState(false); 

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2009290251-UZlxLIQJ" });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineId(profile.userId);
          setDisplayName(profile.displayName);
          setPictureUrl(profile.pictureUrl || '');

          try {
            const res = await fetch(`/api/user?lineId=${profile.userId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                setName(data.user.name || '');
                setPhone(data.user.phone || '');
                
                // ถ้ามีบ้านเลขที่ผูกไว้แล้ว ให้ดึงมาใส่และ "ล็อคการแก้ไข" ทันที
                const existingHouseNo = data.user.residentHouse?.houseNo || data.user.houseNo;
                if (existingHouseNo) {
                  setHouseNo(existingHouseNo);
                  setHasExistingHouse(true);
                }
              }
            }
          } catch (e) {
            console.error("Failed to fetch existing user data", e);
          }

        } else {
          liff.login();
        }
      } catch (error) {
        console.error("LIFF Initialization failed", error);
        Swal.fire({ icon: 'error', title: 'ระบบขัดข้อง', text: 'ไม่สามารถเชื่อมต่อกับ LINE ได้', confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' } });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeLiff();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, name, houseNo, phone }),
      });
      const data = await res.json();
      
      if (data.success) {
        await Swal.fire({ 
          icon: 'success', 
          title: 'บันทึกข้อมูลสำเร็จ!', 
          text: 'ข้อมูลของคุณถูกบันทึกเข้าระบบเรียบร้อยแล้ว',
          confirmButtonColor: '#376B64', // 🌟 ปรับสีปุ่ม Alert
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-8' }
        });
        liff.closeWindow(); // ปิดหน้าต่างกลับไปที่แชท
      } else {
        Swal.fire({ 
          icon: 'error', 
          title: 'เกิดข้อผิดพลาด', 
          text: data.error || 'ไม่สามารถลงทะเบียนได้',
          confirmButtonColor: '#e11d48',
          customClass: { popup: 'rounded-[2rem]' }
        });
      }
    } catch (error) {
      Swal.fire({ 
        icon: 'error', 
        title: 'การเชื่อมต่อล้มเหลว', 
        text: 'กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' }
      });
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans gap-4">
        <div className="w-12 h-12 border-4 border-[#376B64]/20 border-t-[#376B64] rounded-full animate-spin"></div>
        <p className="font-bold animate-pulse text-[#376B64]">กำลังเชื่อมต่อข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-8 pb-12 px-4 font-sans text-slate-800">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 🌟 ส่วนหัวแสดงโปรไฟล์ LINE */}
        <div className="flex flex-col items-center justify-center mb-6 px-2">
          <div className="relative mb-3">
            {pictureUrl ? (
              <img 
                src={pictureUrl} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover shadow-md border-4 border-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white animate-pulse"></div>
            )}
            <div className="absolute bottom-0 right-0 bg-[#376B64] p-1.5 rounded-full border-2 border-white">
              <ShieldCheck size={14} className="text-white" />
            </div>
          </div>
          <h2 className="font-black text-xl text-slate-800 tracking-tight">
            {displayName || "Line User"}
          </h2>
          <p className="text-xs font-bold text-[#376B64] uppercase tracking-widest mt-1">ยืนยันตัวตนแล้ว</p>
        </div>

        {/* 🌟 การ์ดแบบฟอร์ม */}
        <div className="bg-white p-7 md:p-9 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#5b9e94] to-[#376B64]"></div>
          
          <div className="mb-8 mt-2">
            <h1 className="text-2xl font-black text-slate-900 mb-2">ข้อมูลผู้พักอาศัย</h1>
            <p className="text-sm text-slate-500 font-medium">กรุณาตรวจสอบและกรอกข้อมูลให้ครบถ้วน เพื่อรับการแจ้งเตือนค่าส่วนกลาง</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* 1. ชื่อ-นามสกุล */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">ชื่อ - นามสกุล</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-4 text-slate-400" />
                <input 
                  type="text" required placeholder="ระบุชื่อและนามสกุล" 
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 text-sm font-semibold transition-all placeholder:text-slate-400 placeholder:font-normal" 
                />
              </div>
            </div>

            {/* 2. หมายเลขโทรศัพท์ */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">หมายเลขโทรศัพท์</label>
              <div className="relative flex items-center">
                <Phone size={18} className="absolute left-4 text-slate-400" />
                <input 
                  type="tel" required placeholder="เช่น 0891234567" 
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 text-sm font-semibold transition-all placeholder:text-slate-400 placeholder:font-normal" 
                />
              </div>
            </div>

            {/* 3. เลขที่บ้าน/เลขห้อง */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">เลขที่บ้าน / เลขห้อง</label>
              <div className="relative flex items-center">
                <Home size={18} className={`absolute left-4 ${hasExistingHouse ? 'text-slate-400' : 'text-slate-400'}`} />
                <input 
                  type="text" required placeholder="ระบุเลขที่บ้านของคุณ" 
                  value={houseNo} onChange={(e) => setHouseNo(e.target.value)}
                  readOnly={hasExistingHouse}
                  className={`w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm font-bold transition-all border
                    ${hasExistingHouse 
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 placeholder:text-slate-400 placeholder:font-normal'
                    }`} 
                />
                {hasExistingHouse && <Lock size={16} className="absolute right-4 text-rose-400" />}
              </div>
              
              {hasExistingHouse ? (
                <p className="text-[11px] text-rose-500 font-bold mt-1.5 flex items-center gap-1.5">
                  <AlertCircle size={12} /> ไม่สามารถแก้ไขบ้านเลขที่ได้ กรุณาติดต่อนิติบุคคล
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">โปรดตรวจสอบให้ถูกต้องก่อนกดยืนยัน (แก้ไขภายหลังไม่ได้)</p>
              )}
            </div>

            {/* ปุ่มยืนยัน */}
            <button 
              type="submit" disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-[15px] mt-8 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] 
                ${loading ? 'bg-slate-400 text-white cursor-not-allowed shadow-none' : 'bg-[#376B64] text-white hover:bg-[#2A524C] hover:-translate-y-0.5 shadow-[#376B64]/30'}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 size={20} />
              )}
              {loading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลการลงทะเบียน'}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
}