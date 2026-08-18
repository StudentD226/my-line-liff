'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import Link from 'next/link'; 
import { 
  Info, CalendarDays, Settings as SettingsIcon, Building, 
  CreditCard, X, Save, ArrowLeft, BellRing, Clock, Landmark, ChevronDown,
  ShieldAlert, AlertCircle
} from 'lucide-react';

// --- ตัวเลือกการจัดประเภทสถาบันการเงิน ---
const BANK_OPTIONS = [
  { name: "ธนาคารกสิกรไทย", url: "/banks/KBANK.png" },
  { name: "ธนาคารไทยพาณิชย์", url: "/banks/SCB.png" },
  { name: "ธนาคารกรุงเทพ", url: "/banks/BBL.png" },
  { name: "ธนาคารกรุงไทย", url: "/banks/KTB.png" },
  { name: "ธนาคารกรุงศรีอยุธยา", url: "/banks/BAY.png" },
  { name: "ธนาคารทหารไทยธนชาต", url: "/banks/TTB.png" },
  { name: "ธนาคารออมสิน", url: "/banks/GSB.png" },
];

// --- ส่วนประกอบจำลองอินเทอร์เฟซแบบกำหนดเอง (Custom Components) ---

const CustomSelect = React.memo(({ value, options, onChange, disabled, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((opt: any) => opt.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-left flex items-center justify-between px-4 py-3.5 border border-slate-200 rounded-xl transition-all ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'bg-slate-50 hover:bg-white hover:border-[#376B64]/50 focus:ring-2 focus:ring-[#376B64]/20 focus:border-[#376B64]'}`}
      >
        <span className="block truncate text-sm font-bold">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#376B64]' : 'text-slate-400'}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in duration-150 custom-scrollbar">
          {options.map((opt: any, idx: number) => (
            <button
              key={idx}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-50 ${value === opt.value ? 'bg-[#376B64]/10 font-bold text-[#376B64]' : 'text-slate-700 font-medium'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
CustomSelect.displayName = "CustomSelect";

const CustomTimePicker = React.memo(({ value, onChange, disabled }: { value: string, onChange: (v: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentHour, currentMinute] = useMemo(() => {
    const parts = value.split(':');
    return [parts[0] || '08', parts[1] || '00'];
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);

  const selectTime = useCallback((h: string, m: string) => {
    onChange(`${h}:${m}`);
  }, [onChange]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-xl p-3.5 outline-none transition-all text-left shadow-sm ${disabled ? 'bg-slate-100 cursor-not-allowed border-slate-200 text-slate-400' : isOpen ? 'border-[#376B64] ring-2 ring-[#376B64]/20 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-[#376B64]/40'}`}
      >
        <span className="font-bold text-[15px] text-slate-700">เวลา {value} น.</span>
        <Clock size={20} className={disabled ? 'text-slate-400' : 'text-[#376B64]'} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-[280px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 animate-in fade-in duration-150 right-0">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ระบุเวลาจัดส่งเอกสาร</span>
            <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 h-40">
            <div className="overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-1">
              <div className="text-[10px] font-bold text-center text-slate-400 mb-1 sticky top-0 bg-white py-0.5">ชั่วโมง</div>
              {hours.map(h => (
                <button key={h} type="button" onClick={() => selectTime(h, currentMinute)} className={`w-full text-center py-1.5 my-0.5 text-xs font-bold rounded-md ${currentHour === h ? 'bg-[#376B64] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{h}</button>
              ))}
            </div>
            <div className="overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-1">
              <div className="text-[10px] font-bold text-center text-slate-400 mb-1 sticky top-0 bg-white py-0.5">นาที</div>
              {minutes.map(m => (
                <button key={m} type="button" onClick={() => selectTime(currentHour, m)} className={`w-full text-center py-1.5 my-0.5 text-xs font-bold rounded-md ${currentMinute === m ? 'bg-[#376B64] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
CustomTimePicker.displayName = "CustomTimePicker";

const CustomDayPicker = React.memo(({ label, value, onChange, placeholder = "ระบุวันที่...", tooltipText, icon: Icon = CalendarDays, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full relative" ref={dropdownRef}>
      <div className="flex items-center gap-1.5 mb-2">
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
        {tooltipText && (
          <div className="group relative flex items-center justify-center cursor-help shrink-0">
            <Info size={16} className="text-slate-400 hover:text-[#376B64] transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-[250px] p-2.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl z-50 text-center leading-relaxed">
              {tooltipText}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between border rounded-xl p-3.5 outline-none transition-all text-left shadow-sm ${disabled ? 'bg-slate-100 cursor-not-allowed border-slate-200 text-slate-400' : isOpen ? 'border-[#376B64] ring-2 ring-[#376B64]/20 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-[#376B64]/40'}`}
        >
          <span className={`font-bold text-[15px] truncate pr-2 ${value ? 'text-slate-700' : 'text-slate-400'}`}>
            {value ? `วันที่ ${value}` : placeholder}
          </span>
          <Icon size={20} className={disabled ? 'text-slate-400' : 'text-[#376B64]'} />
        </button>
        
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 z-50 mt-2 w-[280px] p-4 bg-white border border-slate-100 shadow-2xl rounded-2xl animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-2 pb-1 border-b">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">เลือกวันที่ของเดือน</div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => { onChange(day); setIsOpen(false); }}
                  className={`p-2 text-sm font-semibold rounded-lg transition-all ${value === day ? 'bg-[#376B64] text-white shadow-md transform scale-105' : 'text-slate-600 hover:bg-[#376B64]/10 hover:text-[#376B64]'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
CustomDayPicker.displayName = "CustomDayPicker";


// --- Main Application Component ---
export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = useMemo(() => (session?.user as any)?.role === 'SUPER_ADMIN', [session]);

  const [projectType, setProjectType] = useState('HOUSING_ESTATE');
  const [flatRateAmount, setFlatRateAmount] = useState<number | ''>('');
  const [penaltyRatePerDay, setPenaltyRatePerDay] = useState<number | ''>(''); 
  
  const [invoiceGenerateDay, setInvoiceGenerateDay] = useState(27);
  const [invoiceGenerateTime, setInvoiceGenerateTime] = useState("08:00");
  const [dueDateDay, setDueDateDay] = useState(7);
  const [secondReminderDay, setSecondReminderDay] = useState(15);

  const [bankName, setBankName] = useState("ธนาคารกรุงไทย");
  const [bankAccountNo, setBankAccountNo] = useState("660-9-55290-8");
  const [bankAccountName, setBankAccountName] = useState("นิติบุคคลหมู่บ้าน");
  const [bankLogoUrl, setBankLogoUrl] = useState("/banks/KTB.png");
  
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false); 

  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [applyToAllHouses, setApplyToAllHouses] = useState(false);

  const [houses, setHouses] = useState<any[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [savingHouse, setSavingHouse] = useState(false);
  const [editHouse, setEditHouse] = useState<{ id: string, houseNo: string, feeType: string, feeRate: number | '' } | null>(null);

  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  const bankDropdownRef = useRef<HTMLDivElement>(null);

  const PROJECT_TYPE_OPTIONS = useMemo(() => [
    { label: 'หมู่บ้านจัดสรร', value: 'HOUSING_ESTATE' },
    { label: 'คอนโดมิเนียม', value: 'CONDO' }
  ], []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) setIsBankDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.config) {
        setProjectType(data.config.projectType || 'HOUSING_ESTATE');
        setFlatRateAmount(data.config.flatRateAmount ?? '');
        setPenaltyRatePerDay(data.config.penaltyRatePerDay ?? '');
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
    }
  }, []);

  const fetchHouses = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/houses');
      const data = await res.json();
      if (data.success) {
        const sortedHouses = data.houses.sort((a: any, b: any) => a.houseNo.localeCompare(b.houseNo, undefined, { numeric: true, sensitivity: 'base' }));
        setHouses(sortedHouses);
      }
    } catch (err) {
      console.error('Error fetching houses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchConfig(); 
    fetchHouses();
  }, [fetchConfig, fetchHouses]);

  // TC-SET-017 & แก้ Toast Error
  const handleBankAccountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const originalValue = e.target.value;
    const sanitizedValue = originalValue.replace(/[^0-9-]/g, '');
    
    if (/[^0-9-]/.test(originalValue)) {
      // ย้าย Swal.fire ลงมาใน Component ตรงๆ แทนเรียกผ่านฟังก์ชันภายนอก Scope
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'warning',
        title: 'ระบบรองรับเฉพาะข้อมูลตัวเลขและเครื่องหมายขีดเท่านั้น'
      });
    }
    setBankAccountNo(sanitizedValue);
  }, []);

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    
    if (flatRateAmount === '' || penaltyRatePerDay === '') {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาระบุข้อมูลอัตราเรียกเก็บมาตรฐานและอัตราค่าปรับล่าช้าในระบบ', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' }});
      return;
    }
    if (Number(flatRateAmount) <= 0) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ถูกต้อง', text: 'อัตราเรียกเก็บมาตรฐานส่วนกลางต้องมีมูลค่ามากกว่า 0 บาท', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' }});
      return;
    }
    if (Number(penaltyRatePerDay) < 0) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ถูกต้อง', text: 'อัตราค่าปรับล่าช้าต้องไม่มีค่าติดลบ สามารถกำหนดเป็น 0 ได้หากไม่มีนโยบายจัดเก็บ', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' }});
      return;
    }

    Swal.fire({
      title: 'ยืนยันการบันทึกข้อมูลระบบหลัก?',
      text: applyToAllHouses ? "การบันทึกนี้จะปรับรูปแบบโครงสร้างราคาทุกยูนิตในระบบให้เป็นอัตราเหมาจ่ายทันที" : "ระบบจะดำเนินการบันทึกข้อมูลการตั้งค่าโครงสร้างพื้นฐานส่วนกลาง",
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true, 
      confirmButtonText: 'ยืนยันการบันทึก',
      cancelButtonText: 'ยกเลิก',
      customClass: { 
        popup: 'rounded-[2rem] w-auto max-w-[90vw]', 
        actions: 'flex flex-row justify-center gap-3 w-full px-4',
        confirmButton: 'order-1 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl px-6 py-2.5 font-bold',
        cancelButton: 'order-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl px-6 py-2.5 font-bold'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setSavingGlobal(true);
        Swal.fire({ title: 'กำลังประมวลผลข้อมูล...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });
        
        try {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              projectType, flatRateAmount: Number(flatRateAmount), penaltyRatePerDay: Number(penaltyRatePerDay), applyToAllHouses,
              invoiceGenerateDay, invoiceGenerateTime, dueDateDay, secondReminderDay,
              bankName, bankAccountNo, bankAccountName, bankLogoUrl
            })
          });
          const data = await res.json();
          
          if (data.success) {
            Swal.fire({ icon: 'success', title: 'บันทึกข้อมูลเสร็จสิ้น', text: 'ระบบส่วนกลางได้รับการปรับปรุงโครงสร้างข้อมูลเรียบร้อยแล้ว', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' } });
            if (applyToAllHouses) { fetchHouses(); setApplyToAllHouses(false); }
          } else {
            throw new Error(data.error);
          }
        } catch (err: any) {
          Swal.fire({ icon: 'error', title: 'การดำเนินการล้มเหลว', text: err.message || 'ระบบไม่สามารถเชื่อมต่อเพื่อบันทึกข้อมูลได้ในขณะนี้', showCloseButton: true, confirmButtonColor: '#E11D48', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]' } });
        } finally {
          setSavingGlobal(false);
        }
      }
    });
  };

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedHouses(houses.map(h => h.id));
    else setSelectedHouses([]);
  }, [houses]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedHouses(prev => prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]);
  }, []);

  const openSinglePopup = useCallback((house: any) => {
    setIsBulkMode(false);
    setEditHouse({ id: house.id, houseNo: house.houseNo, feeType: house.feeType || 'CALCULATED', feeRate: house.feeRate ?? '' });
    setIsPopupOpen(true);
  }, []);

  const openBulkPopup = useCallback(() => {
    if (selectedHouses.length === 0) return;
    const selectedHouseNos = houses.filter(h => selectedHouses.includes(h.id)).map(h => h.houseNo);
    const displayHouseNos = selectedHouseNos.length > 5 ? `${selectedHouseNos.slice(0, 5).join(', ')} ... (และอีก ${selectedHouseNos.length - 5} ยูนิต)` : selectedHouseNos.join(', ');
    setIsBulkMode(true);
    setEditHouse({ id: 'bulk', houseNo: displayHouseNos, feeType: 'CALCULATED', feeRate: '' });
    setIsPopupOpen(true);
  }, [selectedHouses, houses]);

  const handleSaveHouseFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHouse) return;

    if (editHouse.feeRate === '') {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาระบุรายละเอียดอัตราค่าส่วนกลางประจำยูนิต', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' }});
      return;
    }
    if (Number(editHouse.feeRate) <= 0) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ถูกต้อง', text: 'อัตราเรียกเก็บค่าส่วนกลางประจำยูนิตต้องมีมูลค่ามากกว่า 0 บาท', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem]' }});
      return;
    }
    
    setSavingHouse(true);
    Swal.fire({ title: 'กำลังบันทึกข้อมูลเรทราคา...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading(), customClass: { popup: 'rounded-[2rem]' } });

    try {
      const idsToUpdate = isBulkMode ? selectedHouses : [editHouse.id];
      const res = await fetch('/api/admin/houses/update-fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseIds: idsToUpdate, feeType: editHouse.feeType, feeRate: Number(editHouse.feeRate) })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'การดำเนินการเสร็จสิ้น', text: isBulkMode ? `ระบบทำการปรับปรุงข้อมูลสำเร็จจำนวน ${idsToUpdate.length} รายการ` : 'ระบบทำการบันทึกข้อมูลอัตราประจำยูนิตเสร็จสิ้น', showCloseButton: true, confirmButtonColor: '#376B64', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]', confirmButton: 'rounded-xl px-8 py-3 font-bold' } });
        setIsPopupOpen(false);
        if (isBulkMode) setSelectedHouses([]); 
        fetchHouses();
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดทางระบบ', text: err.message || 'ไม่สามารถปรับปรุงข้อมูลเรทราคาได้ในขณะนี้', showCloseButton: true, confirmButtonColor: '#e11d48', customClass: { popup: 'rounded-[2rem] w-auto max-w-[90vw]' } });
    } finally {
      setSavingHouse(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-800 relative w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6 w-full">
        
        <div className="mb-2">
          <Link href="/admin/invoices" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 hover:text-[#376B64] hover:border-[#376B64]/30 hover:bg-[#376B64]/5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95">
            <ArrowLeft size={18} /> ย้อนกลับสู่หน้าจอการจัดการใบแจ้งหนี้
          </Link>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">ตั้งค่าระบบและเกณฑ์การคำนวณค่าส่วนกลาง</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">บริหารจัดการข้อมูลประเภทโครงการ เกณฑ์การคิดคำนวณรากฐาน และตรวจสอบอัตราแยกรายยูนิตพักอาศัย</p>
        </div>
        
        <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
          
          {!isSuperAdmin && (
            <div className="absolute inset-0 z-20 bg-slate-100/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
               <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center text-center max-w-sm">
                 <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4"><ShieldAlert size={28} /></div>
                 <h3 className="text-base font-black text-slate-800 mb-1">สิทธิ์การเข้าถึงข้อมูลจำกัด</h3>
                 <p className="text-xs text-slate-500 font-bold leading-relaxed">เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่มีสิทธิ์ปรับปรุงแก้ไขโครงสร้างนโยบายหลักของโครงการได้</p>
               </div>
            </div>
          )}

          <div className={`p-5 sm:p-6 md:p-8 ${!isSuperAdmin ? 'opacity-30 pointer-events-none select-none' : ''}`}>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg shrink-0"><SettingsIcon size={20} /></span> <span className="truncate">เกณฑ์การคิดคำนวณรากฐานส่วนกลาง (Global Settings)</span>
            </h2>
            <form onSubmit={handleSaveGlobal} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">ประเภทโครงสร้างโครงการ</label>
                  <CustomSelect value={projectType} options={PROJECT_TYPE_OPTIONS} onChange={setProjectType} disabled={!isSuperAdmin} placeholder="เลือกประเภทโครงการ" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">อัตราเรียกเก็บมาตรฐาน (บาท/เดือน)</label>
                  <input 
                    type="number" value={flatRateAmount} onChange={(e) => setFlatRateAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={!isSuperAdmin}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-bold disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">อัตราค่าปรับล่าช้าคงที่ (บาท/รอบบิล)</label>
                  <input 
                    type="number" value={penaltyRatePerDay} onChange={(e) => setPenaltyRatePerDay(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={!isSuperAdmin}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-bold disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3 mt-2 shadow-inner">
                <input 
                  type="checkbox" id="applyAll" checked={applyToAllHouses} onChange={(e) => setApplyToAllHouses(e.target.checked)} disabled={!isSuperAdmin}
                  className="mt-0.5 sm:mt-1 shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <label htmlFor="applyAll" className={`cursor-pointer flex-1 ${!isSuperAdmin ? 'cursor-not-allowed' : ''}`}>
                  <span className="block font-black text-orange-800 text-xs sm:text-sm leading-tight">บังคับปรับเปลี่ยนข้อมูลและรูปแบบราคาทุกยูนิตพักอาศัยทันที</span>
                  <span className="block text-[10px] sm:text-xs font-bold text-orange-600 mt-1">การเลือกคำสั่งนี้จะเปลี่ยนโครงสร้างการคิดคำนวณของผู้พักอาศัยทุกรายให้เป็นรูปแบบ "อัตราเหมาจ่ายคงที่" ตามมูลค่าที่กำหนดด้านบนเมื่อกดบันทึก</span>
                </label>
              </div>

              {/* ข้อมูลบัญชีสถาบันการเงิน */}
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0"><Landmark size={20} /></span> <span className="truncate">ข้อมูลบัญชีสถาบันการเงินผู้รับชำระเงิน</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="relative col-span-1" ref={bankDropdownRef}>
                    <label className="block text-sm font-bold text-slate-700 mb-2">สถาบันการเงินปลายทาง</label>
                    <button
                      type="button" onClick={() => isSuperAdmin && setIsBankDropdownOpen(!isBankDropdownOpen)}
                      className={`w-full flex items-center justify-between border rounded-xl p-3 transition-all shadow-sm outline-none ${!isSuperAdmin ? 'bg-slate-100 border-slate-200 cursor-not-allowed' : isBankDropdownOpen ? 'bg-white border-[#376B64] ring-2 ring-[#376B64]/20' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-[#376B64]/50'}`}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3 truncate">
                        {!imageError ? (
                          <img src={bankLogoUrl || BANK_OPTIONS[3].url} alt="Bank Icon" onError={() => setImageError(true)} className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 object-contain bg-white rounded-full p-0.5 shadow-sm border border-slate-100" />
                        ) : (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-[#376B64]"><Landmark size={14} /></div>
                        )}
                        <span className={`text-[13px] sm:text-[15px] font-bold truncate ${!isSuperAdmin ? 'text-slate-500' : 'text-slate-700'}`}>{bankName}</span>
                      </div>
                      <ChevronDown size={18} className={`${!isSuperAdmin ? 'text-slate-400' : 'text-[#376B64]'} shrink-0 transition-transform ${isBankDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isBankDropdownOpen && isSuperAdmin && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-150 origin-top">
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                          {BANK_OPTIONS.map((bank, idx) => (
                            <button
                              key={idx} type="button"
                              onClick={() => { setBankName(bank.name); setBankLogoUrl(bank.url); setImageError(false); setIsBankDropdownOpen(false); }}
                              className={`w-full flex items-center space-x-3 p-3 transition-colors ${bankName === bank.name ? 'bg-[#376B64]/10 text-[#376B64]' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              <img src={bank.url} alt={bank.name} className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 object-contain bg-white rounded-full p-0.5 shadow-sm border border-slate-100" />
                              <span className={`text-[13px] sm:text-[15px] truncate ${bankName === bank.name ? 'font-black' : 'font-bold'}`}>{bank.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อบัญชีผู้รับชำระเงิน (ทางการ)</label>
                    <input
                      type="text" required value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} disabled={!isSuperAdmin} placeholder="ระบุชื่อบัญชีนิติบุคคล..."
                      className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-bold text-sm sm:text-base disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">เลขที่บัญชีรับชำระเงิน</label>
                    <input
                      type="text" required value={bankAccountNo} onChange={handleBankAccountChange} disabled={!isSuperAdmin} placeholder="ระบุเฉพาะตัวเลขและขีด..."
                      className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-mono font-bold tracking-wider text-sm sm:text-base disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* กำหนดการจัดทำเอกสารอัตโนมัติ */}
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg shrink-0"><CalendarDays size={20} /></span> <span className="truncate">รอบการประมวลผลจัดส่งใบแจ้งหนี้อัตโนมัติ</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <CustomDayPicker label="วันประมวลผลออกเอกสารประจำเดือน" value={invoiceGenerateDay} onChange={setInvoiceGenerateDay} tooltipText="วันที่ระบบส่วนกลางจะสร้างเอกสารใบแจ้งหนี้และส่งข้อความแจ้งเตือนหาผู้พักอาศัยทุกคนเสร็จสิ้น" disabled={!isSuperAdmin} />
                  <CustomDayPicker label="วันจัดส่งข้อความแจ้งเตือนรอบสอง" value={secondReminderDay} onChange={setSecondReminderDay} tooltipText="วันที่ระบบจะส่งข้อความแจ้งเตือนย้ำก่อนวันครบกำหนดการชำระเงินของรอบเดือน" icon={BellRing} disabled={!isSuperAdmin} />
                  <CustomDayPicker label="วันสิ้นสุดกำหนดเวลาชำระเงิน" value={dueDateDay} onChange={setDueDateDay} tooltipText="วันสุดท้ายสำหรับการดำเนินการชำระหนี้สินตามรอบบิลโดยไม่ถูกคิดคำนวณอัตราปรับล่าช้า" disabled={!isSuperAdmin} />

                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-1.5 mb-2">
                      <label className="block text-sm font-bold text-slate-700">เวลาจัดส่งข้อความอ้างอิง</label>
                      <div className="group relative flex items-center justify-center cursor-help shrink-0">
                        <Info size={16} className="text-slate-400 hover:text-[#376B64] transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-[220px] p-2.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl z-50 text-center leading-relaxed">
                          เวลาประมวลผลที่ระบบจะส่งสัญญาณข้อมูลแจ้งหนี้เข้าสู่แอปพลิเคชัน LINE
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      </div>
                    </div>
                    <CustomTimePicker value={invoiceGenerateTime} onChange={setInvoiceGenerateTime} disabled={!isSuperAdmin} />
                  </div>
                </div>
              </div>

              <div className="flex justify-start pt-6 border-t border-slate-100">
                <button 
                  type="submit" disabled={savingGlobal || !isSuperAdmin}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${savingGlobal || !isSuperAdmin ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#376B64] text-white hover:bg-[#2A524C] hover:-translate-y-0.5 active:scale-[0.98]'}`}
                >
                  <Save size={18} className="shrink-0" />
                  บันทึกข้อมูลเกณฑ์ระบบหลัก
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ส่วนที่ 3: บริหารจัดการรายหน่วยพักอาศัย */}
        <section className="border-t-[8px] border-slate-50 w-full">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 sm:p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg shrink-0"><CreditCard size={20} /></span> <span className="truncate">การจัดการเกณฑ์และราคาแยกรายยูนิตพักอาศัย</span>
                
                <div className="group relative flex items-center justify-center cursor-help ml-1 shrink-0">
                  <Info size={18} className="text-slate-400 hover:text-[#376B64] transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-[260px] sm:w-72 p-3 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl z-50 text-center leading-relaxed">
                    คุณสามารถดำเนินการเลือกข้อมูลพร้อมกันหลายรายการเพื่อตั้งค่าเกณฑ์ หรือเลือกจัดการรายหน่วยพักอาศัยแบบแยกอิสระได้ตามสิทธิ์
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              </h2>

              {selectedHouses.length > 0 && (
                <button 
                  onClick={openBulkPopup}
                  className="w-full md:w-auto justify-center animate-in fade-in px-5 py-2.5 bg-[#376B64] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#2A524C] transition flex items-center gap-2 active:scale-[0.98]"
                >
                  ดำเนินการปรับปรุงกลุ่มจำนวน {selectedHouses.length} ยูนิต
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto bg-white pb-6 w-full custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                        onChange={handleSelectAll} checked={selectedHouses.length === houses.length && houses.length > 0}
                      />
                    </th>
                    <th className="p-4 font-bold whitespace-nowrap">{projectType === 'CONDO' ? 'ห้องพักอ้างอิง' : 'ยูนิตเลขที่อ้างอิง'}</th>
                    <th className="p-4 font-bold whitespace-nowrap">ขนาดพื้นที่รวม</th>
                    <th className="p-4 font-bold whitespace-nowrap">เกณฑ์การจัดเก็บ</th>
                    <th className="p-4 font-bold whitespace-nowrap">อัตราเรียกเก็บ (บาท)</th>
                    <th className="p-4 font-bold text-center whitespace-nowrap">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {houses.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">ไม่พบฐานข้อมูลหน่วยพักอาศัยในระบบ</td></tr>
                  ) : (
                    houses.map((house) => {
                      const isSelected = selectedHouses.includes(house.id);
                      return (
                        <tr key={house.id} className={`transition-colors hover:bg-slate-50/50 ${isSelected ? 'bg-[#376B64]/5' : ''}`}>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                              checked={isSelected} onChange={() => handleSelectOne(house.id)}
                            />
                          </td>
                          <td className="p-4 font-black text-slate-800 text-base flex items-center gap-2 whitespace-nowrap">
                            <Building size={16} className="text-slate-400 shrink-0" /> {house.houseNo}
                          </td>
                          <td className="p-4 text-slate-600 font-medium whitespace-nowrap">{house.houseSize} {projectType === 'CONDO' ? 'ตร.ม.' : 'ตร.ว.'}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide ${house.feeType === 'FIXED' ? 'bg-[#376B64]/10 text-[#376B64]' : 'bg-orange-100 text-orange-700'}`}>
                              {house.feeType === 'FIXED' ? 'อัตราเหมาจ่ายคงที่' : 'คำนวณสัดส่วนพื้นที่'}
                            </span>
                          </td>
                          <td className="p-4 font-black text-slate-700 text-base whitespace-nowrap">
                            {Number(house.feeRate).toLocaleString('th-TH')} <span className="text-xs font-bold text-slate-400">{house.feeType === 'FIXED' ? '/ รอบบิล' : '/ หน่วยพื้นที่'}</span>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <button 
                              onClick={() => openSinglePopup(house)}
                              className="bg-white border border-slate-200 hover:border-[#376B64] hover:bg-[#376B64]/10 hover:text-[#376B64] text-slate-600 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
                            >
                               ปรับแต่งข้อมูล
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

      {/* Custom Popup Modal สำหรับเพิ่มนิติบุคคล */}
      {isPopupOpen && editHouse && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPopupOpen(false)}></div>
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-10 border border-slate-100 flex flex-col">
            <button onClick={() => setIsPopupOpen(false)} className="absolute top-4 sm:top-6 right-4 sm:right-6 text-slate-400 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 rounded-full p-2 transition-colors z-10">
              <X size={20} />
            </button>

            <div className="shrink-0 mb-4 mt-2 pr-8">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2 truncate">
                {isBulkMode ? 'ปรับปรุงราคาแบบกลุ่มยูนิต' : 'ปรับเปลี่ยนเรทราคาส่วนกลาง'}
              </h3>
              <p className="text-slate-500 text-sm font-bold bg-slate-50 inline-block px-3 py-1.5 rounded-lg border border-slate-200">
                {projectType === 'CONDO' ? 'ห้องพักอ้างอิง' : 'ยูนิตอ้างอิง'} <span className="font-black text-[#376B64] text-base ml-1">{editHouse.houseNo}</span>
              </p>
            </div>
            
            <form onSubmit={handleSaveHouseFee} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">โครงสร้างสัดส่วนเกณฑ์การคำนวณ</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setEditHouse({...editHouse, feeType: 'CALCULATED'})} className={`py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${editHouse.feeType === 'CALCULATED' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-inner' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}>
                    คำนวณตามพื้นที่
                  </button>
                  <button type="button" onClick={() => setEditHouse({...editHouse, feeType: 'FIXED'})} className={`py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${editHouse.feeType === 'FIXED' ? 'border-[#376B64] bg-[#376B64]/10 text-[#376B64] shadow-inner' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}>
                    อัตราเหมาจ่ายคงที่
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  มูลค่าเงินเรียกเก็บหลัก <span className="text-slate-400 font-medium">{editHouse.feeType === 'FIXED' ? '(บาท/รอบบิล)' : '(บาท/หน่วยตาราง)'}</span>
                </label>
                <input 
                  type="number" required value={editHouse.feeRate === 0 ? '' : editHouse.feeRate}
                  onChange={(e) => setEditHouse({...editHouse, feeRate: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-lg font-black text-slate-800 focus:border-[#376B64] outline-none transition-all bg-slate-50 focus:bg-white shadow-inner"
                  placeholder={editHouse.feeType === 'FIXED' ? 'ตัวอย่าง 850' : 'ตัวอย่าง 15'}
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-start gap-2.5">
                <AlertCircle size={16} className="text-[#376B64] shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                  การแก้ไขเกณฑ์ราคาตัวเลือกประจำยูนิตดังกล่าว จะมีผลผูกพันเฉพาะรอบการออกใบแจ้งหนี้อัตโนมัติชุดใหม่ถัดไปในอนาคตเท่านั้น เอกสารประวัติบิลสถานะชำระเงินแล้วเสร็จ จะได้รับการคุ้มครองและล็อคข้อมูลถาวรตามกฎข้อบังคับระเบียบทางบัญชีของโครงการ
                </p>
              </div>

              {/* ปุ่มบันทึกอยู่ด้านซ้าย ปุ่มยกเลิกอยู่ด้านขวา */}
              <div className="pt-2 flex flex-row gap-3">
                <button 
                  type="submit" disabled={savingHouse}
                  className={`flex-[2] py-3.5 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${savingHouse ? 'bg-slate-400' : 'bg-[#376B64] hover:bg-[#2A524C]'}`}
                >
                  <Save size={18} className="shrink-0" /> บันทึกการตั้งค่าข้อมูล
                </button>
                <button 
                  type="button" onClick={() => setIsPopupOpen(false)} disabled={savingHouse}
                  className="flex-1 py-3.5 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}