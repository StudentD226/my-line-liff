'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Link from 'next/link'; 
import { 
  Info, CalendarDays, Settings as SettingsIcon, Building, 
  CreditCard, X, Save, ArrowLeft, BellRing, Clock, Landmark, ChevronDown
} from 'lucide-react';

// 🌟 ตัวเลือกธนาคารทั้งหมด
const BANK_OPTIONS = [
  { name: "ธนาคารกสิกรไทย", url: "/banks/KBANK.png" },
  { name: "ธนาคารไทยพาณิชย์", url: "/banks/SCB.png" },
  { name: "ธนาคารกรุงเทพ", url: "/banks/BBL.png" },
  { name: "ธนาคารกรุงไทย", url: "/banks/KTB.png" },
  { name: "ธนาคารกรุงศรีอยุธยา", url: "/banks/BAY.png" },
  { name: "ธนาคารทหารไทยธนชาต", url: "/banks/TTB.png" },
  { name: "ธนาคารออมสิน", url: "/banks/GSB.png" },
];

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
});

const CustomDayPicker = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "ระบุวันที่...",
  tooltipText,
  icon: Icon = CalendarDays
}: { 
  label: string, 
  value: number, 
  onChange: (val: number) => void,
  placeholder?: string,
  tooltipText?: string,
  icon?: any
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center gap-1.5 mb-2">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        {tooltipText && (
          <div className="group relative flex items-center justify-center cursor-help">
            <Info size={16} className="text-gray-400 hover:text-[#376B64] transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2.5 bg-gray-800 text-white text-xs font-medium rounded-lg shadow-xl z-50 text-center leading-relaxed">
              {tooltipText}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between border rounded-xl p-3.5 outline-none transition-all text-left shadow-sm ${
            isOpen 
              ? 'border-[#376B64] ring-2 ring-[#376B64]/20 bg-white' 
              : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-[#376B64]/40'
          }`}
        >
          <span className={`font-medium text-[15px] ${value ? 'text-gray-900' : 'text-gray-400'}`}>
            {value ? `วันที่ ${value}` : placeholder}
          </span>
          <Icon size={20} className="text-[#376B64]" />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <div className="absolute top-full left-0 z-50 mt-2 w-64 p-4 bg-white border border-gray-100 shadow-2xl rounded-2xl transform origin-top animate-fadeIn">
              <div className="text-xs font-bold text-gray-400 mb-3 text-center uppercase tracking-wider">เลือกวันที่ของเดือน</div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => { onChange(day); setIsOpen(false); }}
                    className={`p-2 text-sm font-semibold rounded-lg transition-all ${
                      value === day 
                        ? 'bg-[#376B64] text-white shadow-md transform scale-105' 
                        : 'text-gray-600 hover:bg-[#376B64]/10 hover:text-[#376B64]'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function AdminSettingsPage() {
  const [projectType, setProjectType] = useState('HOUSING_ESTATE');
  const [flatRateAmount, setFlatRateAmount] = useState(500);
  const [penaltyRatePerDay, setPenaltyRatePerDay] = useState(100); 
  
  const [invoiceGenerateDay, setInvoiceGenerateDay] = useState(27);
  const [invoiceGenerateTime, setInvoiceGenerateTime] = useState("08:00");
  const [dueDateDay, setDueDateDay] = useState(7);
  const [secondReminderDay, setSecondReminderDay] = useState(15);

  const [bankName, setBankName] = useState("ธนาคารกรุงไทย");
  const [bankAccountNo, setBankAccountNo] = useState("660-9-55290-8");
  const [bankAccountName, setBankAccountName] = useState("นิติบุคคลหมู่บ้าน");
  const [bankLogoUrl, setBankLogoUrl] = useState("/banks/KTB.png");
  
  // 🌟 State สำหรับ Custom Dropdown เลือกธนาคาร และรูป Error
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false); 

  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [applyToAllHouses, setApplyToAllHouses] = useState(false);

  const [houses, setHouses] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [savingHouse, setSavingHouse] = useState(false);
  const [editHouse, setEditHouse] = useState<{ id: string, houseNo: string, feeType: string, feeRate: number } | null>(null);

  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  useEffect(() => { 
    fetchConfig(); 
    fetchHouses();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.config) {
        setProjectType(data.config.projectType || 'HOUSING_ESTATE');
        setFlatRateAmount(data.config.flatRateAmount || 500);
        setPenaltyRatePerDay(data.config.penaltyRatePerDay || 100);
        if (data.config.invoiceGenerateDay) setInvoiceGenerateDay(data.config.invoiceGenerateDay);
        if (data.config.invoiceGenerateTime) setInvoiceGenerateTime(data.config.invoiceGenerateTime);
        if (data.config.dueDateDay) setDueDateDay(data.config.dueDateDay);
        if (data.config.secondReminderDay) setSecondReminderDay(data.config.secondReminderDay);
        
        if (data.config.bankName) setBankName(data.config.bankName);
        if (data.config.bankAccountNo) setBankAccountNo(data.config.bankAccountNo);
        if (data.config.bankAccountName) setBankAccountName(data.config.bankAccountName);
        if (data.config.bankLogoUrl) setBankLogoUrl(data.config.bankLogoUrl);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      Toast.fire({ icon: 'error', title: 'ดึงข้อมูลการตั้งค่าไม่สำเร็จ' });
    }
  };

  const fetchHouses = async () => {
    try {
      const res = await fetch('/api/admin/houses');
      const data = await res.json();
      if (data.success) {
        const sortedHouses = data.houses.sort((a: any, b: any) => 
          a.houseNo.localeCompare(b.houseNo, undefined, { numeric: true, sensitivity: 'base' })
        );
        setHouses(sortedHouses);
      }
    } catch (err) {
      console.error('Error fetching houses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    Swal.fire({
      title: 'ยืนยันการตั้งค่า?',
      text: applyToAllHouses ? "คุณเลือก 'อัปเดตทับราคาบ้านทุกหลัง' ข้อมูลบิลเดิมจะถูกเปลี่ยนเป็นเหมาจ่ายทั้งหมด!" : "บันทึกการตั้งค่าระบบส่วนกลาง",
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true, 
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ใช่, บันทึกเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-2.5 font-bold', cancelButton: 'rounded-xl px-6 py-2.5 font-bold' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setSavingGlobal(true);
        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              projectType, 
              flatRateAmount, 
              penaltyRatePerDay, 
              applyToAllHouses,
              invoiceGenerateDay,
              invoiceGenerateTime, 
              dueDateDay,
              secondReminderDay,
              bankName,
              bankAccountNo,
              bankAccountName,
              bankLogoUrl
            })
          });
          const data = await res.json();
          
          if (data.success) {
            Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', text: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' } });
            if (applyToAllHouses) {
               fetchHouses(); 
               setApplyToAllHouses(false); 
            }
          } else {
            Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: data.error || 'เกิดข้อผิดพลาด', showCloseButton: true, confirmButtonColor: '#e11d48', customClass: { popup: 'rounded-[2rem]' } });
          }
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'เซิร์ฟเวอร์มีปัญหา', text: 'ไม่สามารถเชื่อมต่อได้', showCloseButton: true, confirmButtonColor: '#e11d48', customClass: { popup: 'rounded-[2rem]' } });
        } finally {
          setSavingGlobal(false);
        }
      }
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedHouses(houses.map(h => h.id));
    else setSelectedHouses([]);
  };

  const handleSelectOne = (id: string) => {
    if (selectedHouses.includes(id)) setSelectedHouses(selectedHouses.filter(hid => hid !== id));
    else setSelectedHouses([...selectedHouses, id]);
  };

  const openSinglePopup = (house: any) => {
    setIsBulkMode(false);
    setEditHouse({
      id: house.id,
      houseNo: house.houseNo,
      feeType: house.feeType || 'CALCULATED',
      feeRate: house.feeRate || 0
    });
    setIsPopupOpen(true);
  };

  const openBulkPopup = () => {
    if (selectedHouses.length === 0) return;
    
    const selectedHouseNos = houses.filter(h => selectedHouses.includes(h.id)).map(h => h.houseNo);
    const displayHouseNos = selectedHouseNos.length > 5 
      ? `${selectedHouseNos.slice(0, 5).join(', ')} ... (และอีก ${selectedHouseNos.length - 5} ยูนิต)`
      : selectedHouseNos.join(', ');

    setIsBulkMode(true);
    setEditHouse({
      id: 'bulk', 
      houseNo: displayHouseNos, 
      feeType: 'CALCULATED', 
      feeRate: 0 
    });
    setIsPopupOpen(true);
  };

  const handleSaveHouseFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHouse) return;
    
    setSavingHouse(true);
    Swal.fire({ title: 'กำลังอัปเดตเรทราคา...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });

    try {
      const idsToUpdate = isBulkMode ? selectedHouses : [editHouse.id];

      const res = await fetch('/api/admin/houses/update-fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          houseIds: idsToUpdate, 
          feeType: editHouse.feeType, 
          feeRate: editHouse.feeRate 
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'อัปเดตสำเร็จ!',
          text: isBulkMode ? `อัปเดตเรียบร้อย ${idsToUpdate.length} รายการ` : 'อัปเดตเรทราคาเรียบร้อย',
          showCloseButton: true,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' }
        });
        setIsPopupOpen(false);
        if (isBulkMode) setSelectedHouses([]); 
        fetchHouses();
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: data.message, showCloseButton: true, confirmButtonColor: '#e11d48', customClass: { popup: 'rounded-[2rem]' } });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'เซิร์ฟเวอร์มีปัญหา', text: 'ไม่สามารถอัปเดตได้', showCloseButton: true, confirmButtonColor: '#e11d48', customClass: { popup: 'rounded-[2rem]' } });
    } finally {
      setSavingHouse(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#376B64] mb-4"></div>
      <span className="text-[#376B64] font-bold text-lg">กำลังโหลดข้อมูล...</span>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans text-gray-800 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="mb-2">
          <Link 
            href="/admin/invoices" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-500 hover:text-[#376B64] hover:border-[#376B64]/30 hover:bg-[#376B64]/5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={18} />
            กลับไปหน้าจัดการบิล
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ตั้งค่าระบบ & ค่าส่วนกลาง</h1>
          <p className="text-gray-500 mt-2">จัดการรูปแบบโครงการ เรทราคาพื้นฐาน และกำหนดค่าส่วนกลางราย{projectType === 'CONDO' ? 'ห้อง' : 'บ้าน'}</p>
        </div>
        
        <section className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg"><SettingsIcon size={20} /></span> การตั้งค่าระบบส่วนกลาง (Global Settings)
            </h2>
            <form onSubmit={handleSaveGlobal} className="space-y-6">
              
              {/* ส่วนที่ 1: การคิดเงิน */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ประเภทโครงการ</label>
                  <select 
                    value={projectType} 
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm"
                  >
                    <option value="HOUSING_ESTATE">หมู่บ้านจัดสรร</option>
                    <option value="CONDO">คอนโดมิเนียม</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">เรทมาตรฐาน (บาท/เดือน)</label>
                  <input 
                    type="number" 
                    value={flatRateAmount} 
                    onChange={(e) => setFlatRateAmount(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ค่าปรับล่าช้าเหมาจ่าย (บาท/เดือน)</label>
                  <input 
                    type="number" 
                    value={penaltyRatePerDay} 
                    onChange={(e) => setPenaltyRatePerDay(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-medium"
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3 mt-2 shadow-inner">
                <input 
                  type="checkbox" 
                  id="applyAll"
                  checked={applyToAllHouses}
                  onChange={(e) => setApplyToAllHouses(e.target.checked)}
                  className="mt-1 w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="applyAll" className="cursor-pointer flex-1">
                  <span className="block font-bold text-orange-800 text-sm">อัปเดตเรทมาตรฐานนี้ ทับราคาของ{projectType === 'CONDO' ? 'ห้อง' : 'บ้าน'}ทุกหลังทันที</span>
                  <span className="block text-xs text-orange-600 mt-1">หากเลือกตัวเลือกนี้ ระบบจะปรับเปลี่ยนรูปแบบการคิดเงินของทุกคนเป็น "เหมาจ่าย (FIXED)" และใช้ราคา {flatRateAmount} บาทโดยอัตโนมัติเมื่อกดบันทึก</span>
                </label>
              </div>

              {/* 🌟 บัญชีธนาคารรับเงิน */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="text-2xl">🏦</span> บัญชีธนาคารรับเงิน (สำหรับลูกบ้านโอนชำระ)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 🌟 Custom Dropdown เลือกธนาคาร */}
                  <div className="relative col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">เลือกธนาคาร</label>
                    <button
                      type="button"
                      onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                      className={`w-full flex items-center justify-between border rounded-xl p-3 transition-all shadow-sm outline-none ${isBankDropdownOpen ? 'bg-white border-[#376B64] ring-2 ring-[#376B64]/20' : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-[#376B64]/50'}`}
                    >
                      <div className="flex items-center space-x-3">
                        {!imageError ? (
                          <img 
                            src={bankLogoUrl || BANK_OPTIONS[3].url} 
                            alt="Bank Logo" 
                            onError={() => setImageError(true)}
                            className="w-7 h-7 object-contain bg-white rounded-full p-0.5 shadow-sm border border-gray-100" 
                          />
                        ) : (
                          <div className="w-7 h-7 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-[#376B64]">
                            <Landmark size={14} />
                          </div>
                        )}
                        <span className="text-[15px] font-semibold text-gray-700">{bankName}</span>
                      </div>
                      <ChevronDown size={18} className={`text-[#376B64] transition-transform ${isBankDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* เมนู Dropdown */}
                    {isBankDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsBankDropdownOpen(false)}></div>
                        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn origin-top">
                          <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {BANK_OPTIONS.map((bank, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setBankName(bank.name);
                                  setBankLogoUrl(bank.url);
                                  setImageError(false);
                                  setIsBankDropdownOpen(false);
                                }}
                                className={`w-full flex items-center space-x-3 p-3 transition-colors ${bankName === bank.name ? 'bg-[#376B64]/10 text-[#376B64]' : 'hover:bg-gray-50 text-gray-700'}`}
                              >
                                <img 
                                  src={bank.url} 
                                  alt={bank.name} 
                                  className="w-7 h-7 object-contain bg-white rounded-full p-0.5 shadow-sm border border-gray-100" 
                                />
                                <span className={`text-[15px] ${bankName === bank.name ? 'font-bold' : 'font-medium'}`}>{bank.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ชื่อบัญชี */}
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อบัญชี (Account Name)</label>
                    <input
                      type="text"
                      required
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="เช่น นิติบุคคลหมู่บ้าน..."
                      className="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-medium"
                    />
                  </div>

                  {/* เลขบัญชี */}
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">เลขบัญชี (Account Number)</label>
                    <input
                      type="text"
                      required
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="เช่น 123-4-56789-0"
                      className="w-full border border-gray-200 rounded-xl p-3.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-mono tracking-wider"
                    />
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 2: รอบบิลอัตโนมัติ */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg"><CalendarDays size={20} /></span> รอบบิลอัตโนมัติ (Automated Billing)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <CustomDayPicker 
                    label="วันที่ออกบิลประจำเดือน" 
                    value={invoiceGenerateDay} 
                    onChange={setInvoiceGenerateDay}
                    placeholder="ระบุวันสร้างบิล..."
                    tooltipText="วันที่ระบบจะสร้างบิลใหม่ และส่งข้อความแจ้งเตือนค่าส่วนกลางไปหาลูกบ้านทุกคน"
                  />
                  
                  <CustomDayPicker 
                    label="วันที่แจ้งเตือนก่อนครบกำหนด" 
                    value={secondReminderDay} 
                    onChange={setSecondReminderDay} 
                    placeholder="ระบุวันแจ้งเตือน..."
                    tooltipText="วันที่ระบบจะส่งข้อความแจ้งเตือนความจำให้ลูกบ้านชำระเงินก่อนที่จะถึงวันครบกำหนด"
                    icon={BellRing}
                  />

                  <CustomDayPicker 
                    label="วันครบกำหนดชำระ" 
                    value={dueDateDay} 
                    onChange={setDueDateDay} 
                    placeholder="ระบุวันครบกำหนด..."
                    tooltipText="วันสุดท้ายที่ลูกบ้านสามารถชำระเงินได้โดยไม่ถูกคิดค่าธรรมเนียมล่าช้า"
                  />

                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-1.5 mb-2">
                      <label className="block text-sm font-semibold text-gray-700">เวลาจัดส่งบิล</label>
                      <div className="group relative flex items-center justify-center cursor-help">
                        <Info size={16} className="text-gray-400 hover:text-[#376B64] transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2.5 bg-gray-800 text-white text-xs font-medium rounded-lg shadow-xl z-50 text-center leading-relaxed">
                          เวลาที่ระบบจะส่งแจ้งเตือนบิลใหม่เข้า LINE ลูกบ้าน
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative flex items-center">
                      <input
                        type="time"
                        value={invoiceGenerateTime}
                        onChange={(e) => setInvoiceGenerateTime(e.target.value)}
                        className="w-full border border-gray-200 bg-gray-50 hover:bg-white hover:border-[#376B64]/40 focus:bg-white focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/20 rounded-xl p-3.5 outline-none transition-all text-left shadow-sm font-medium text-[15px] text-gray-900 appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                      />
                      <Clock size={20} className="absolute right-3.5 text-[#376B64] z-0" />
                    </div>
                    
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-50">
                <button 
                  type="submit" disabled={savingGlobal}
                  className={`px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${savingGlobal ? 'bg-gray-400' : 'bg-[#376B64] hover:bg-[#2A524C] hover:-translate-y-0.5 active:scale-[0.98]'}`}
                >
                  <Save size={18} />
                  {savingGlobal ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าส่วนกลาง'}
                </button>
              </div>
            </form>
          </div>

          {/* ส่วนที่ 3: จัดการบ้าน */}
          <div className="border-t-[8px] border-gray-50">
            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg"><CreditCard size={20} /></span> จัดการเรทราคาแยกราย{projectType === 'CONDO' ? 'ห้อง' : 'บ้าน'}
                
                <div className="group relative flex items-center justify-center cursor-help ml-1">
                  <Info size={18} className="text-gray-400 hover:text-[#376B64] transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 p-3 bg-gray-800 text-white text-xs font-medium rounded-lg shadow-xl z-50 text-center leading-relaxed">
                    💡 <b>วิธีใช้งาน:</b><br/>คุณสามารถติ๊กถูกหน้าบ้านเลขที่เพื่อตั้งค่ารูปแบบการคิดเงิน (เหมาจ่าย/คำนวณตามพื้นที่) พร้อมกันทีละหลายหลัง หรือกดปุ่ม "ตั้งค่า" ด้านหลังเพื่อปรับราคาทีละหลังก็ได้ครับ
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </h2>

              {selectedHouses.length > 0 && (
                <button 
                  onClick={openBulkPopup}
                  className="animate-fadeIn px-5 py-2.5 bg-[#376B64] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#2A524C] transition flex items-center gap-2 active:scale-[0.98]"
                >
                   ตั้งค่าพร้อมกัน {selectedHouses.length} รายการ
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto bg-white pb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                        onChange={handleSelectAll}
                        checked={selectedHouses.length === houses.length && houses.length > 0}
                      />
                    </th>
                    <th className="p-4 font-semibold">{projectType === 'CONDO' ? 'ห้องเลขที่' : 'บ้านเลขที่'}</th>
                    <th className="p-4 font-semibold">ขนาดพื้นที่</th>
                    <th className="p-4 font-semibold">รูปแบบการคิดเงิน</th>
                    <th className="p-4 font-semibold">อัตรา (บาท)</th>
                    <th className="p-4 font-semibold text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {houses.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลในระบบ</td></tr>
                  ) : (
                    houses.map((house) => {
                      const isSelected = selectedHouses.includes(house.id);
                      return (
                        <tr key={house.id} className={`transition-colors hover:bg-gray-50/50 ${isSelected ? 'bg-[#376B64]/5' : ''}`}>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                              checked={isSelected}
                              onChange={() => handleSelectOne(house.id)}
                            />
                          </td>
                          <td className="p-4 font-bold text-gray-800 text-base flex items-center gap-2">
                            <Building size={16} className="text-gray-400" /> {house.houseNo}
                          </td>
                          <td className="p-4 text-gray-600">{house.houseSize} {projectType === 'CONDO' ? 'ตร.ม.' : 'ตร.ว.'}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide ${house.feeType === 'FIXED' ? 'bg-[#376B64]/10 text-[#376B64]' : 'bg-orange-100 text-orange-700'}`}>
                              {house.feeType === 'FIXED' ? 'เหมาจ่าย (FIXED)' : 'ตามพื้นที่ (CALCULATED)'}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-gray-700 text-base">
                            {Number(house.feeRate).toLocaleString('th-TH')} <span className="text-xs font-normal text-gray-400">{house.feeType === 'FIXED' ? '/ บิล' : '/ หน่วย'}</span>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => openSinglePopup(house)}
                              className="bg-white border border-gray-200 hover:border-[#376B64] hover:bg-[#376B64]/10 hover:text-[#376B64] text-gray-600 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
                            >
                               ตั้งค่า
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {isPopupOpen && editHouse && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 animate-fadeIn">
          
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
            onClick={() => setIsPopupOpen(false)}
          ></div>

          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-10 transform transition-all scale-100 border border-gray-100">
            <button onClick={() => setIsPopupOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-rose-500 bg-gray-100 hover:bg-rose-50 rounded-full p-2.5 transition-colors">
              <X size={20} />
            </button>

            <h3 className="text-2xl font-black text-gray-800 mb-2">
              {isBulkMode ? 'ตั้งค่าเรทราคาหลายรายการ' : 'ตั้งค่าเรทราคา'}
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed bg-gray-50 inline-block px-3 py-1.5 rounded-lg border border-gray-200">
              {projectType === 'CONDO' ? 'ห้องเลขที่' : 'บ้านเลขที่'} <span className="font-bold text-[#376B64] text-base ml-1">{editHouse.houseNo}</span>
            </p>
            
            <form onSubmit={handleSaveHouseFee} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">รูปแบบการคิดเงิน (Fee Type)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setEditHouse({...editHouse, feeType: 'CALCULATED'})} className={`py-3.5 border-2 rounded-2xl font-bold text-sm transition-all ${editHouse.feeType === 'CALCULATED' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-inner' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}>
                    คำนวณตามพื้นที่
                  </button>
                  <button type="button" onClick={() => setEditHouse({...editHouse, feeType: 'FIXED'})} className={`py-3.5 border-2 rounded-2xl font-bold text-sm transition-all ${editHouse.feeType === 'FIXED' ? 'border-[#376B64] bg-[#376B64]/10 text-[#376B64] shadow-inner' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}>
                    เหมาจ่าย
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  อัตราเรทราคา <span className="text-gray-400 font-normal">{editHouse.feeType === 'FIXED' ? '(บาท/เดือน)' : '(บาท/หน่วย)'}</span>
                </label>
                <input 
                  type="number" required
                  value={editHouse.feeRate === 0 ? '' : editHouse.feeRate}
                  onChange={(e) => setEditHouse({...editHouse, feeRate: Number(e.target.value)})}
                  className="w-full border-2 border-gray-200 rounded-2xl p-4 text-xl font-bold text-gray-800 focus:border-[#376B64] focus:ring-0 outline-none transition-all bg-gray-50 focus:bg-white shadow-inner"
                  placeholder={editHouse.feeType === 'FIXED' ? 'เช่น 850' : 'เช่น 15'}
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" disabled={savingHouse}
                  className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${savingHouse ? 'bg-gray-400' : 'bg-[#376B64] hover:bg-[#2A524C] active:scale-[0.98]'}`}
                >
                  <Save size={18} />
                  {savingHouse ? 'กำลังอัปเดต...' : (isBulkMode ? 'บันทึกพร้อมกันทั้งหมด' : 'บันทึกการตั้งค่า')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}