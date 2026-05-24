/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import Swal from 'sweetalert2';
import { 
  AlertCircle, CheckCircle, CreditCard, ChevronDown, 
  Info, Landmark, FileImage, UploadCloud, CalendarDays, Clock, 
  Copy, Check 
} from 'lucide-react';

function PaymentForm() {
  const router = useRouter();

  const [lineProfile, setLineProfile] = useState<any>(null);
  const [houseData, setHouseData] = useState<any>(null); 
  const [loadingData, setLoadingData] = useState(true);

  const [bankInfo, setBankInfo] = useState({
    bankName: "ธนาคารกรุงไทย",
    bankAccountNo: "660-9-55290-8",
    bankAccountName: "นิติบุคคลหมู่บ้าน",
    bankLogoUrl: "/banks/KTB.png"
  });
  const [imageError, setImageError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [payOption, setPayOption] = useState<number>(0); 
  const [customAmount, setCustomAmount] = useState<string>('');
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transferDate, setTransferDate] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCustomSelectOpen, setIsCustomSelectOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const [tempHour, setTempHour] = useState('12');
  const [tempMinute, setTempMinute] = useState('00');

  useEffect(() => {
    fetchSystemConfig();
    liff.init({ liffId: "2009290251-UZlxLIQJ" }).then(() => {
      if (!liff.isLoggedIn()) {
        liff.login();
      } else {
        liff.getProfile().then(profile => {
          setLineProfile(profile);
          fetchSmartHouseData(profile.userId);
        });
      }
    }).catch(err => console.error("LIFF Error:", err));
  }, []);

  const fetchSystemConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.config) {
        setBankInfo({
          bankName: data.config.bankName || "ธนาคารกรุงไทย",
          bankAccountNo: data.config.bankAccountNo || "660-9-55290-8",
          bankAccountName: data.config.bankAccountName || "นิติบุคคลหมู่บ้าน",
          bankLogoUrl: data.config.bankLogoUrl || "/banks/KTB.png"
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const fetchSmartHouseData = async (lineId: string) => {
    try {
      const res = await fetch(`/api/payment/smart-info?lineId=${lineId}`);
      const data = await res.json();
      if (data.success) {
        setHouseData(data.houseData);
      }
    } catch (error) {
      console.error("Error fetching smart info:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCopyAccountNo = () => {
    if (bankInfo.bankAccountNo) {
      navigator.clipboard.writeText(bankInfo.bankAccountNo);
      setIsCopied(true);
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: { popup: 'rounded-2xl shadow-lg mt-4' }
      });
      Toast.fire({
        icon: 'success',
        title: 'คัดลอกเลขบัญชีแล้ว',
      });

      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const monthlyRate = houseData?.monthlyRate || 0;
  const baseBalance = houseData?.outstandingBalance || 0;
  const fineAmount = houseData?.fineAmount || 0;
  const outstandingBalance = baseBalance + fineAmount; 
  
  const calculatedOptionAmount = outstandingBalance + (monthlyRate * payOption);
  const finalPayAmount = customAmount ? parseFloat(customAmount) : calculatedOptionAmount;
  const remainingBalance = Math.max(0, outstandingBalance - finalPayAmount);

  const getCoverageText = (advanceMonths: number) => {
    if (advanceMonths === 0) {
       if (outstandingBalance === 0) return 'ไม่มียอดค้างชำระ';
       return houseData?.overdueMonthsText || 'ยอดบิลรอบปัจจุบัน';
    }
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1); 
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + advanceMonths - 1); 
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const startStr = `${thaiMonths[startDate.getMonth()]} ${String(startDate.getFullYear() + 543).slice(-2)}`;
    const endStr = `${thaiMonths[endDate.getMonth()]} ${String(endDate.getFullYear() + 543).slice(-2)}`;
    const advanceText = advanceMonths === 1 ? `ล่วงหน้าประจำเดือน ${startStr}` : `ล่วงหน้าตั้งแต่ ${startStr} - ${endStr}`;
    
    if (outstandingBalance > 0) return `รวมยอดค้างเดิม และ${advanceText}`;
    return advanceText;
  };

  const paymentOptions = [
    { value: 0, title: 'ชำระตามยอดปัจจุบัน' },
    { value: 1, title: 'จ่ายล่วงหน้า 1 เดือน' },
    { value: 3, title: 'จ่ายล่วงหน้า 3 เดือน' },
    { value: 6, title: 'จ่ายล่วงหน้า 6 เดือน' },
    { value: 12, title: 'จ่ายล่วงหน้า 1 ปี' },
  ];

  const generateRecentDates = () => {
    return Array.from({length: 30}).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        let label = `${d.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][d.getMonth()]} ${d.getFullYear() + 543}`;
        if (i === 0) label = `วันนี้ (${label})`;
        else if (i === 1) label = `เมื่อวาน (${label})`;
        return { value: `${yyyy}-${mm}-${dd}`, label };
    });
  };
  const recentDates = generateRecentDates();

  const hoursList = Array.from({length: 24}).map((_, i) => String(i).padStart(2, '0'));
  const minutesList = Array.from({length: 60}).map((_, i) => String(i).padStart(2, '0'));

  const openTimePicker = () => {
    if(transferTime) {
        const [h, m] = transferTime.split(':');
        setTempHour(h); setTempMinute(m);
    } else {
        const now = new Date();
        setTempHour(String(now.getHours()).padStart(2, '0'));
        setTempMinute(String(now.getMinutes()).padStart(2, '0'));
    }
    setIsTimePickerOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning', title: 'ไฟล์ขนาดใหญ่เกินไป', text: 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 10MB ครับ',
          confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
        });
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    if (!file || finalPayAmount <= 0) return;
    setSubmitting(true);
    Swal.fire({ 
      title: 'กำลังส่งข้อมูล...', text: 'กรุณารอสักครู่นะครับ', allowOutsideClick: false, 
      didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem] p-6' }
    });

    try {
      let finalAdvanceMonths = payOption;
      if (customAmount) {
        const totalDebt = outstandingBalance; 
        const overpay = finalPayAmount - totalDebt;
        
        if (overpay > 0 && monthlyRate > 0) {
          finalAdvanceMonths = Math.floor(overpay / monthlyRate);
        } else {
          finalAdvanceMonths = 0;
        }
      }

      const formData = new FormData();
      formData.append('lineId', lineProfile?.userId || ''); 
      formData.append('houseNo', houseData?.houseNo || '');
      formData.append('invoiceNo', houseData?.refInvoiceNo || 'INV-000'); 
      formData.append('slip', file);
      formData.append('transferDate', transferDate);
      formData.append('transferTime', transferTime);
      formData.append('payAmount', finalPayAmount.toString());
      formData.append('remainingBalance', remainingBalance.toString()); 
      formData.append('payOptionMonths', finalAdvanceMonths.toString()); 
      formData.append('fineAmount', fineAmount.toString());

      const res = await fetch('/api/payment', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          title: 'สำเร็จ!', text: 'ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว ระบบกำลังตรวจสอบความถูกต้องครับ', icon: 'success',
          confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' }
        }).then(() => {
          if (liff.isInClient()) liff.closeWindow();
          else router.push('/invoices');
        });
      } else {
        Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด', text: data.error,
          confirmButtonColor: '#EF4444', customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error', title: 'ขัดข้อง', text: 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้งครับ',
        confirmButtonColor: '#EF4444', customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold' }
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isFormComplete = file !== null && transferDate !== '' && transferTime !== '';

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#376B64]/30 border-t-[#376B64] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6] font-sans text-gray-800 pb-4 selection:bg-[#376B64] selection:text-white overflow-x-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />

      <div className="bg-gradient-to-b from-[#2A524C] to-[#376B64] px-4 pt-6 pb-8 text-white shadow-lg shadow-[#376B64]/20 rounded-b-[2.5rem] relative">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 rounded-full overflow-hidden border-2 border-white/30 p-0.5">
            <img src={lineProfile?.pictureUrl || '/default-avatar.png'} alt="avatar" className="w-full h-full rounded-full object-cover" />
          </div>
          <div>
            <p className="text-[12px] text-white/80 font-medium leading-none mb-1">สวัสดีครับคุณ {lineProfile?.displayName || 'ลูกบ้าน'}</p>
            <h1 className="text-[18px] font-bold tracking-wide leading-none">บ้านเลขที่ {houseData?.houseNo || 'ไม่พบข้อมูล'}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 -mt-5 relative z-10">
        
        <div className="bg-white rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 relative overflow-hidden">
          
          <div className="mb-4">
            <div className="flex justify-start w-full mb-2">
              {outstandingBalance > 0 ? (
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-extrabold text-rose-500 tracking-wide flex items-center gap-1.5">
                    <AlertCircle size={20} strokeWidth={2.5} />
                    ยอดค้างชำระปัจจุบัน
                  </p>
                  {houseData?.overdueMonthsText && (
                    <span className="text-[12px] text-rose-500 font-semibold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                      {houseData.overdueMonthsText}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[16px] font-extrabold text-teal-600 tracking-wide flex items-center gap-1.5">
                  <CheckCircle size={20} strokeWidth={2.5} />
                  ยอดที่ต้องชำระ
                </p>
              )}
            </div>

            <div className="flex items-end justify-center w-full my-3">
              <span className="text-[52px] font-black text-gray-800 leading-none tracking-tight">
                {outstandingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end w-full -mt-4">
              <span className="text-[18px] font-bold text-gray-400">บาท</span>
            </div>
            
            <div className="text-center mt-3">
              {fineAmount > 0 && (
                <p className="text-[13px] text-rose-600 font-bold mb-1.5 bg-rose-50 px-3 py-1 rounded-full inline-block border border-rose-100">
                  *รวมค่าปรับล่าช้า {fineAmount.toLocaleString()} บาทแล้ว
                </p>
              )}
              <p className="text-[14px] text-gray-500 font-medium">อัตราค่าบำรุงรักษาส่วนกลาง {monthlyRate.toLocaleString('th-TH')} บาท/เดือน</p>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-100">
            <label className="block text-[17px] font-extrabold text-gray-800 mb-3 flex items-center gap-1.5">
              <CreditCard size={20} strokeWidth={2.5} className="text-[#376B64]" />
              รูปแบบการชำระเงิน
            </label>
            
            <div onClick={() => setIsCustomSelectOpen(true)} className="w-full p-4 bg-[#F8FAFC] border border-gray-200 rounded-xl flex flex-col justify-center cursor-pointer active:scale-[0.98] transition-all">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[16px] font-bold text-[#376B64]">
                  {paymentOptions.find(o => o.value === payOption)?.title} <span className="text-gray-400 font-normal ml-1">({(outstandingBalance + monthlyRate * payOption).toLocaleString('th-TH')} บาท)</span>
                </span>
                <ChevronDown size={22} strokeWidth={2.5} className="text-[#376B64]/50" />
              </div>
              <p className="text-[14px] font-medium text-gray-500 leading-relaxed">{getCoverageText(payOption)}</p>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-gray-100">
            <label className="flex justify-between items-center text-[16px] font-extrabold text-gray-600 mb-3">
              หรือ ระบุยอดเงินโอนเอง
              {customAmount && (
                <span className="text-[11px] bg-[#376B64] text-white px-2 py-0.5 rounded-md animate-pulse">
                  กำลังใช้ยอดนี้
                </span>
              )}
            </label>
            <div className="relative group">
              <input 
                type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="ระบุจำนวนเงินที่ต้องการชำระ (บาท)"
                className="w-full p-4 pl-4 bg-white border border-gray-200 rounded-xl text-[18px] font-bold text-[#376B64] focus:outline-none focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 transition-all placeholder:font-medium placeholder:text-gray-300 placeholder:text-[15px]" 
              />
            </div>

            <div className="mt-4 bg-blue-50/60 border border-blue-100 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Info size={18} strokeWidth={2.5} className="text-blue-500" />
                <span className="text-[15px] font-bold text-blue-800">คำแนะนำการระบุยอดโอน</span>
              </div>
              <ul className="text-[14px] text-blue-700 leading-relaxed space-y-1.5 ml-5 list-disc">
                <li>ระบบจะนำไป <strong className="text-blue-900">หักยอดค้างชำระ</strong> ก่อน</li>
                <li>เงินที่โอนเกินมา จะถูกนำไปเป็น <strong className="text-blue-900">ยอดจ่ายล่วงหน้า</strong> อัตโนมัติ</li>
                <li>สามารถ <strong className="text-blue-900">ทยอยจ่ายได้</strong> (หากยอดโอนน้อยกว่าหนี้ทั้งหมด)</li>
              </ul>
              <p className="text-[12px] text-blue-500/80 mt-2.5 pt-2 border-t border-blue-100/50">
                * เมื่อพิมพ์ตัวเลข ระบบจะใช้ยอดช่องนี้แทนตัวเลือกด้านบน
              </p>
            </div>
            
            {customAmount && remainingBalance > 0 && (
              <div className="mt-4 flex items-center justify-between bg-rose-50 p-4 rounded-xl border border-rose-100">
                <span className="text-[14px] font-bold text-rose-600">ยอดค้างคงเหลือ</span>
                <span className="text-[18px] font-black text-rose-600">{remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[1.2rem] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center gap-4">
          {!imageError ? (
            <img 
              src={bankInfo.bankLogoUrl} 
              alt={bankInfo.bankName} 
              onError={() => setImageError(true)}
              className="w-16 h-16 object-contain bg-white rounded-xl p-1 shadow-sm border border-gray-100 flex-shrink-0" 
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-[#00A5E3] to-[#0086b8] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#00A5E3]/20">
              <Landmark size={28} strokeWidth={2} className="text-white" />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-[18px] font-extrabold text-gray-800 leading-tight truncate">{bankInfo.bankName}</p>
            
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[17px] text-[#376B64] font-bold tracking-wider leading-tight">{bankInfo.bankAccountNo}</p>
              <button 
                onClick={handleCopyAccountNo}
                className={`p-2 rounded-md transition-all active:scale-95 flex items-center justify-center ${
                  isCopied ? 'bg-green-100 text-green-600' : 'bg-[#376B64]/10 text-[#376B64] hover:bg-[#376B64]/20'
                }`}
                title="คัดลอกเลขบัญชี"
              >
                {isCopied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} />}
              </button>
            </div>

            <p className="text-[13px] text-gray-500 mt-1 leading-tight truncate">{bankInfo.bankAccountName}</p>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100">
          <h3 className="text-[18px] font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <div className="bg-[#376B64]/10 p-2 rounded-lg text-[#376B64]">
              <FileImage size={20} strokeWidth={2.5} />
            </div>
            หลักฐานการโอนเงิน
          </h3>
          
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="border-2 border-dashed border-gray-300 bg-gray-50/50 rounded-[1rem] p-6 flex flex-col items-center justify-center hover:bg-gray-100 hover:border-[#376B64]/50 transition-all min-h-[160px] overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} alt="Slip Preview" className="absolute inset-0 w-full h-full object-contain bg-black/5" />
              ) : (
                <>
                  <div className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud size={24} strokeWidth={2.5} className="text-[#376B64]" />
                  </div>
                  <p className="text-[15px] font-bold text-gray-700 mb-1">แตะเพื่ออัปโหลดสลิป</p>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} className="hidden" />
          </div>

          {/* 🌟 เปลี่ยนตรงนี้เป็น flex flex-col (เรียงคนละบรรทัด) 🌟 */}
          <div className="flex flex-col gap-4 mt-5">
            <div>
              <label className="block text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">วันที่โอน</label>
              <div onClick={() => setIsDatePickerOpen(true)} className="relative w-full pl-10 pr-2 py-3.5 bg-[#F8FAFC] border border-gray-200 rounded-xl cursor-pointer active:scale-95 transition-all flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarDays size={18} strokeWidth={2.5} className="text-gray-400" />
                </div>
                {transferDate 
                  ? <span className="text-[15px] font-bold text-[#376B64]">{recentDates.find(d => d.value === transferDate)?.label.split(' ')[0] + ' ' + recentDates.find(d => d.value === transferDate)?.label.split(' ')[1]}</span>
                  : <span className="text-[15px] font-medium text-gray-400">เลือกวันที่</span>
                }
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">เวลาโอน</label>
              <div onClick={openTimePicker} className="relative w-full pl-10 pr-2 py-3.5 bg-[#F8FAFC] border border-gray-200 rounded-xl cursor-pointer active:scale-95 transition-all flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock size={18} strokeWidth={2.5} className="text-gray-400" />
                </div>
                {transferTime 
                  ? <span className="text-[16px] font-bold tracking-widest text-[#376B64]">{transferTime}</span>
                  : <span className="text-[15px] font-medium text-gray-400">เลือกเวลา</span>
                }
              </div>
            </div>
          </div>
          {/* 🌟 สิ้นสุดส่วนที่แก้ไข 🌟 */}

        </div>
      </div>

      <div className="px-4 mt-5 mb-8 relative z-10">
        <button 
          onClick={handleSubmit}
          disabled={!isFormComplete || submitting}
          className={`w-full py-4 rounded-2xl font-bold text-[17px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
            isFormComplete 
              ? 'bg-gradient-to-r from-[#2A524C] to-[#376B64] shadow-lg shadow-[#376B64]/30 text-white' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed border-none'
          }`}
        >
          {submitting ? 'กำลังส่งข้อมูล...' : `ยืนยันยอดชำระ ${finalPayAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`}
        </button>
      </div>

      {isCustomSelectOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsCustomSelectOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2rem] p-5 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h3 className="text-[18px] font-extrabold text-gray-800 mb-5 text-center">เลือกระยะเวลาที่ต้องการชำระ</h3>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pb-4 pr-1 custom-scrollbar">
              {paymentOptions.map((opt) => (
                <div key={opt.value} onClick={() => { setPayOption(opt.value); setCustomAmount(''); setIsCustomSelectOpen(false); }} className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${payOption === opt.value ? 'border-[#376B64] bg-[#376B64]/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex-1 pr-3">
                     <p className={`text-[16px] font-bold ${payOption === opt.value ? 'text-[#376B64]' : 'text-gray-800'}`}>{opt.title}</p>
                     <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{getCoverageText(opt.value)}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <p className={`text-[17px] font-black ${payOption === opt.value ? 'text-[#376B64]' : 'text-gray-800'}`}>{(outstandingBalance + monthlyRate * opt.value).toLocaleString('th-TH')} บาท</p>
                     {payOption === opt.value && <CheckCircle size={20} strokeWidth={2.5} className="text-[#376B64] mt-1.5 animate-bounce" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isDatePickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsDatePickerOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2rem] p-5 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h3 className="text-[18px] font-extrabold text-gray-800 mb-5 text-center">เลือกวันที่โอนเงิน</h3>
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar pb-4">
              {recentDates.map(date => (
                <div 
                  key={date.value} 
                  onClick={() => { setTransferDate(date.value); setIsDatePickerOpen(false); }} 
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center font-bold text-[16px] ${transferDate === date.value ? 'border-[#376B64] bg-[#376B64]/10 text-[#376B64] shadow-sm' : 'border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-200'}`}
                >
                  {date.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isTimePickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsTimePickerOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2rem] p-5 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <h3 className="text-[18px] font-extrabold text-gray-800 mb-1 text-center">ระบุเวลาที่โอนเงิน</h3>
            <p className="text-center text-[14px] text-gray-500 mb-6">ระบุเวลาให้ตรงกับสลิปธนาคาร</p>
            
            <div className="flex gap-4 h-[30vh] mb-6">
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-100 rounded-xl p-2 space-y-1.5 bg-gray-50/50">
                <div className="text-center text-gray-400 font-bold text-[13px] pb-2 sticky top-0 bg-white/90 backdrop-blur-sm z-10 rounded-t-lg pt-1">ชั่วโมง</div>
                {hoursList.map(h => (
                  <div key={h} onClick={() => setTempHour(h)} className={`py-2.5 text-center rounded-lg font-black text-[22px] cursor-pointer transition-all ${tempHour === h ? 'bg-[#376B64] text-white shadow-md scale-105' : 'text-gray-600 hover:bg-gray-200'}`}>{h}</div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-100 rounded-xl p-2 space-y-1.5 bg-gray-50/50">
                <div className="text-center text-gray-400 font-bold text-[13px] pb-2 sticky top-0 bg-white/90 backdrop-blur-sm z-10 rounded-t-lg pt-1">นาที</div>
                {minutesList.map(m => (
                  <div key={m} onClick={() => setTempMinute(m)} className={`py-2.5 text-center rounded-lg font-black text-[22px] cursor-pointer transition-all ${tempMinute === m ? 'bg-[#376B64] text-white shadow-md scale-105' : 'text-gray-600 hover:bg-gray-200'}`}>{m}</div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => { setTransferTime(`${tempHour}:${tempMinute}`); setIsTimePickerOpen(false); }}
              className="w-full bg-gradient-to-r from-[#2A524C] to-[#376B64] text-white py-4 rounded-xl font-bold text-[17px] active:scale-[0.98] transition-all shadow-lg shadow-[#376B64]/30"
            >
              ตกลง (เวลา {tempHour}:{tempMinute} น.)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function PaymentPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#376B64]/30 border-t-[#376B64] rounded-full animate-spin"></div></div>}>
      <PaymentForm />
    </Suspense>
  );
}