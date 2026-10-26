'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import Swal from 'sweetalert2';
import { User, Phone, Home, Lock, ShieldCheck, CheckCircle2, AlertCircle, Key, ChevronDown } from 'lucide-react';

interface HouseOption {
  id: string;
  houseNo: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [lineId, setLineId] = useState('');
  
  // ข้อมูลโปรไฟล์จาก LINE
  const [displayName, setDisplayName] = useState('');
  const [pictureUrl, setPictureUrl] = useState('');

  // ข้อมูลฟอร์ม
  // ลำดับ: 1. บ้านเลขที่ 2. passcode 3. ชื่อ-สกุล 4. เบอร์โทร
  const [houseNo, setHouseNo] = useState('');
  const [passcode, setPasscode] = useState(''); // State สำหรับรหัสลับประจำบ้าน
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // รายการบ้านเลขที่จาก Database
  const [housesList, setHousesList] = useState<HouseOption[]>([]);
  const [isLoadingHouses, setIsLoadingHouses] = useState(true);

  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasExistingHouse, setHasExistingHouse] = useState(false); 

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        // ดึงรายการบ้านเลขที่ที่มีในระบบทั้งหมด
        try {
          const houseRes = await fetch('/api/houses');
          if (houseRes.ok) {
            const houseData = await houseRes.json();
            if (houseData.success && Array.isArray(houseData.houses)) {
              setHousesList(houseData.houses);
            }
          }
        } catch (e) {
          console.error("Failed to fetch houses list", e);
        } finally {
          setIsLoadingHouses(false);
        }

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
      // 1. ตรวจสอบรหัสลับก่อน (ถ้าเป็นลูกบ้านใหม่ที่ยังไม่มีบ้าน)
      if (!hasExistingHouse) {
        if (!houseNo) {
          Swal.fire({
            icon: 'warning',
            title: 'กรุณาเลือกบ้านเลขที่',
            text: 'โปรดเลือกบ้านเลขที่ของคุณจากรายการ',
            confirmButtonColor: '#376B64',
            customClass: { popup: 'rounded-[2rem]' }
          });
          setLoading(false);
          return;
        }

        if (!passcode.trim()) {
          Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกรหัสลับประจำบ้าน',
            text: 'ขอรับรหัสลับได้จากนิติบุคคลหรือเจ้าของบ้าน',
            confirmButtonColor: '#376B64',
            customClass: { popup: 'rounded-[2rem]' }
          });
          setLoading(false);
          return;
        }

        // ส่งตรวจสอบ passcode (ระบบฝั่ง API รองรับทั้งพิมพ์เล็ก/พิมพ์ใหญ่แบบ Case-Insensitive)
        const verifyRes = await fetch('/api/auth/verify-passcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ houseNo, passcode: passcode.trim() }),
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          Swal.fire({
            icon: 'error',
            title: 'รหัสไม่ถูกต้อง',
            text: verifyData.message || 'รหัสลับประจำบ้านไม่ถูกต้อง',
            confirmButtonColor: '#e11d48',
            customClass: { popup: 'rounded-[2rem]' }
          });
          setLoading(false);
          return; // หยุดการทำงาน ไม่ให้เซฟลง Database
        }
      }

      // 2. ถ้ารหัสผ่านถูกต้อง หรือเป็นลูกบ้านเดิมที่มาแก้ไขข้อมูล (แก้ได้เฉพาะชื่อและเบอร์)
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, name: name.trim(), houseNo, phone: phone.trim() }),
      });
      const data = await res.json();
      
      if (data.success) {
        await Swal.fire({ 
          icon: 'success', 
          title: hasExistingHouse ? 'บันทึกข้อมูลเรียบร้อย!' : 'ลงทะเบียนสำเร็จ!', 
          text: hasExistingHouse 
            ? 'ข้อมูลของคุณได้รับการอัปเดตเรียบร้อยแล้ว' 
            : 'ข้อมูลของคุณถูกบันทึกเข้าระบบเรียบร้อยแล้ว',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-8' }
        });
        
        if (typeof window !== 'undefined' && liff.isInClient()) {
          liff.closeWindow(); // ปิดหน้าต่างกลับไปที่ LINE แชท
        } else {
          router.push('/settings');
        }
      } else {
        Swal.fire({ 
          icon: 'error', 
          title: 'เกิดข้อผิดพลาด', 
          text: data.error || 'ไม่สามารถลงทะเบียนได้',
          confirmButtonColor: '#e11d48',
          customClass: { popup: 'rounded-[2rem]' }
        });
      }
    } catch {
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
        
        {/* ส่วนหัวแสดงโปรไฟล์ LINE */}
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

        {/* การ์ดแบบฟอร์ม */}
        <div className="bg-white p-7 md:p-9 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#5b9e94] to-[#376B64]"></div>
          
          <div className="mb-8 mt-2">
            <h1 className="text-2xl font-black text-slate-900 mb-2">ข้อมูลผู้พักอาศัย</h1>
            <p className="text-sm text-slate-500 font-medium">กรุณาตรวจสอบและกรอกข้อมูลให้ครบถ้วน เพื่อรับการแจ้งเตือนค่าส่วนกลาง</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* 1. เลขที่บ้าน / เลขห้อง (ดึงจากฐานข้อมูล มี Dropdown ให้เลือก) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                  เลขที่บ้าน / เลขห้อง *
                </label>
                {hasExistingHouse && (
                  <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-100">
                    <Lock size={11} /> ล็อคข้อมูลแล้ว
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <Home size={18} className="absolute left-4 text-slate-400 z-10 pointer-events-none" />
                
                {hasExistingHouse ? (
                  // ถ้ามีบ้านแล้ว: แสดงแบบล็อค ไม่ให้แก้ไข
                  <div className="w-full relative flex items-center">
                    <input 
                      type="text" 
                      value={houseNo} 
                      readOnly 
                      disabled
                      className="w-full pl-11 pr-10 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 cursor-not-allowed select-none"
                    />
                    <Lock size={16} className="absolute right-4 text-rose-400" />
                  </div>
                ) : (
                  // ถ้ายังไม่มีบ้าน: แสดง Dropdown ให้เลือกจากฐานข้อมูล
                  <div className="w-full relative flex items-center">
                    <select
                      required
                      value={houseNo}
                      onChange={(e) => setHouseNo(e.target.value)}
                      disabled={isLoadingHouses || housesList.length === 0}
                      className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 text-sm font-bold text-slate-800 transition-all appearance-none cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {isLoadingHouses 
                          ? 'กำลังโหลดข้อมูลบ้าน...' 
                          : housesList.length === 0 
                            ? 'ยังไม่มีข้อมูลบ้านในระบบ (กรุณาติดต่อนิติ)' 
                            : '-- เลือกบ้านเลขที่ของคุณ --'}
                      </option>
                      {housesList.map((h) => (
                        <option key={h.id} value={h.houseNo} className="text-slate-800 font-semibold py-1">
                          บ้านเลขที่ {h.houseNo}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 text-slate-400 pointer-events-none" />
                  </div>
                )}
              </div>
              
              {hasExistingHouse ? (
                <p className="text-[11px] text-rose-500 font-bold mt-1.5 flex items-center gap-1.5">
                  <AlertCircle size={12} /> ไม่สามารถแก้ไขบ้านเลขที่ได้ กรุณาติดต่อนิติบุคคล
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                  เลือกบ้านเลขที่ที่นิติบุคคลได้สร้างไว้ในระบบ (แก้ไขภายหลังไม่ได้)
                </p>
              )}
            </div>

            {/* 2. ช่องกรอกรหัสลับประจำบ้าน (Passcode) - โชว์เฉพาะตอนลงทะเบียนบ้านครั้งแรก รองรับทั้งตัวพิมพ์เล็กและใหญ่ */}
            {!hasExistingHouse && (
              <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                    รหัสลับประจำบ้าน (Passcode) *
                  </label>
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100">
                    <ShieldCheck size={11} className="text-emerald-600" /> พิมพ์เล็ก/ใหญ่ก็ได้
                  </span>
                </div>
                
                <div className="relative flex items-center">
                  <Key size={18} className="absolute left-4 text-amber-500" />
                  <input 
                    type="text" 
                    required 
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="เช่น 99/1-A1B2 หรือรหัสที่ได้รับจากนิติ" 
                    value={passcode} 
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 text-sm font-bold text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-normal font-mono uppercase" 
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1.5 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[#376B64] shrink-0" /> ขอรับรหัสนี้ได้จากนิติบุคคลหรือเจ้าของบ้าน (ระบบรองรับทั้งตัวพิมพ์เล็กและพิมพ์ใหญ่)
                </p>
              </div>
            )}

            {/* 3. ชื่อ - นามสกุล (สามารถแก้ไขได้ตลอดเวลา) */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                ชื่อ - นามสกุล *
              </label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-4 text-slate-400" />
                <input 
                  type="text" 
                  required 
                  placeholder="ระบุชื่อและนามสกุล" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 text-sm font-semibold transition-all placeholder:text-slate-400 placeholder:font-normal" 
                />
              </div>
            </div>

            {/* 4. หมายเลขโทรศัพท์ (สามารถแก้ไขได้ตลอดเวลา) */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                หมายเลขโทรศัพท์ *
              </label>
              <div className="relative flex items-center">
                <Phone size={18} className="absolute left-4 text-slate-400" />
                <input 
                  type="tel" 
                  required 
                  placeholder="เช่น 0891234567" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 text-sm font-semibold transition-all placeholder:text-slate-400 placeholder:font-normal" 
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                ชื่อและเบอร์โทรศัพท์สามารถกลับมาแก้ไขได้ตลอดเวลา
              </p>
            </div>

            {/* ปุ่มยืนยัน */}
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-[15px] mt-8 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] 
                ${loading ? 'bg-slate-400 text-white cursor-not-allowed shadow-none' : 'bg-[#376B64] text-white hover:bg-[#2A524C] hover:-translate-y-0.5 shadow-[#376B64]/30'}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 size={20} />
              )}
              {loading 
                ? 'กำลังตรวจสอบข้อมูล...' 
                : hasExistingHouse 
                  ? 'บันทึกการแก้ไขข้อมูล' 
                  : 'บันทึกข้อมูลการลงทะเบียน'}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
}