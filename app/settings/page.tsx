'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import Swal from 'sweetalert2';
// นำเข้า Icon จาก lucide-react
import { User, Phone, Home, BellRing, BellOff, Edit3, ShieldCheck, UserCircle } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // เพิ่ม State สำหรับเก็บรูปโปรไฟล์ LINE
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);

  const checkUserRegistration = useCallback(async (lineId: string) => {
    try {
      const res = await fetch(`/api/user?lineId=${lineId}`);
      const data = await res.json();
      
      if (data.success && data.user) {
        setUserData(data.user);
        setLoading(false);
      } else {
        router.push('/register');
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'ดึงข้อมูลล้มเหลว',
        text: 'ไม่สามารถโหลดข้อมูลบัญชีได้ โปรดตรวจสอบอินเทอร์เน็ต',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' }
      });
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2009290251-UZlxLIQJ" });
        if (liff.isLoggedIn()) {
          // ดึง Profile เพื่อเอารูปภาพและ userId
          const profile = await liff.getProfile();
          setPictureUrl(profile.pictureUrl || null);
          checkUserRegistration(profile.userId);
        } else {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF Init Error", err);
        Swal.fire({
          icon: 'error',
          title: 'ระบบขัดข้อง',
          text: 'ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาลองใหม่อีกครั้ง',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' }
        });
        setLoading(false);
      }
    };

    initializeLiff();
    }
  };

  // Alert ยืนยันก่อนไปหน้าแก้ไข พร้อมเตือนเรื่องบ้านเลขที่
  const handleEditConfirm = () => {
    Swal.fire({
      title: 'ต้องการแก้ไขข้อมูล?',
      text: 'คุณสามารถแก้ไขชื่อและเบอร์โทรได้ แต่จะไม่สามารถเปลี่ยน "เลขที่บ้าน" ได้',
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'รับทราบ ไปหน้าแก้ไข',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-6', cancelButton: 'rounded-xl font-bold px-6' }
    }).then((result) => {
      if (result.isConfirmed) {
        router.push('/register');
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-[#376B64] gap-4">
        <div className="w-12 h-12 border-4 border-[#376B64]/20 border-t-[#376B64] rounded-full animate-spin"></div>
        <p className="font-bold animate-pulse tracking-wide">กำลังโหลดข้อมูลบัญชี...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 flex justify-center items-start pt-10 pb-20">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-[#2A524C] to-[#376B64] relative">
          <div className="absolute inset-0 bg-white/10 opacity-50 mix-blend-overlay"></div>
        </div>

        {/* Profile Area (Overlap) */}
        <div className="px-6 sm:px-8 pb-8 -mt-14 relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div className="relative inline-block">
              {pictureUrl ? (
                <img 
                  src={pictureUrl} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-slate-300">
                  <UserCircle size={48} strokeWidth={1.5} />
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-white p-0.5 rounded-full shadow-sm">
                <ShieldCheck size={20} className="text-[#376B64]" />
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-sm mb-2
              ${userData?.isNotify ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              {userData?.isNotify ? <BellRing size={14} /> : <BellOff size={14} />}
              <span className="text-[11px] font-black uppercase tracking-wider">
                {userData?.isNotify ? 'เปิดแจ้งเตือน' : 'ปิดแจ้งเตือน'}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{userData?.name || 'ไม่ได้ระบุชื่อ'}</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">จัดการข้อมูลและการตั้งค่าบัญชีของคุณ</p>
          </div>

          {/* Information Cards */}
          <div className="space-y-3">
            
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 text-[#376B64] flex items-center justify-center flex-shrink-0">
                <User size={22} strokeWidth={2} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ชื่อ-นามสกุล</p>
                <p className="font-bold text-slate-800 text-sm truncate">{userData?.name || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 text-[#376B64] flex items-center justify-center flex-shrink-0">
                <Phone size={22} strokeWidth={2} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">หมายเลขโทรศัพท์</p>
                <p className="font-bold text-slate-800 text-sm">{userData?.phone || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-[#376B64]/5 border border-[#376B64]/20 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-[#376B64]/10 text-[#376B64] flex items-center justify-center flex-shrink-0">
                <Home size={22} strokeWidth={2} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-bold text-[#376B64]/60 uppercase tracking-widest mb-0.5">บ้านเลขที่ / ห้อง</p>
                <p className="font-black text-[#376B64] text-lg leading-none mt-1">
                  {userData?.residentHouse?.houseNo || 'ไม่ระบุ'}
                </p>
              </div>
            </div>
            
          </div>

          {/* Action Button */}
          <button 
            onClick={handleEditConfirm}
            className="w-full bg-white text-[#376B64] border-2 border-[#376B64]/20 py-4 rounded-2xl font-black text-sm mt-8 hover:bg-[#376B64]/5 hover:border-[#376B64]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Edit3 size={18} strokeWidth={2.5} />
            แก้ไขข้อมูลส่วนตัว
          </button>
          
        </div>
      </div>
    </div>
  );
}