'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  History,
  Calculator,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
  Info,
  ShieldAlert,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  TrendingUp,
  Coins,
  AlertTriangle,
  FileSpreadsheet,
  Home,
} from 'lucide-react';
import { defaultSwalConfig } from '@/lib/swal-helper';
import {
  MigrationCalculationResult,
  PenaltyCalcMode,
  getStepPenaltyRate,
  getOverdueMonths,
  truncate2,
} from '@/lib/initial-balance';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

interface PeriodRow {
  id: string;
  billingYear: number;
  billingMonth: number;
  dueDate: string;
  principalAmount: number | '';
  // สำหรับ STEP_RATE_PERCENT mode
  penaltyMode: 'auto' | '0' | '10' | '20' | 'custom';
  customPenaltyRate: number | '';
  // สำหรับ FLAT_PER_MONTH mode
  flatPenaltyOverride: 'auto' | 'custom' | 'none';
  customFlatPenalty: number | '';
}

interface InitialBalanceSectionProps {
  isSuperAdmin: boolean;
  houses: any[];
  onRefreshHouses?: () => void;
  penaltyRatePerMonth?: number;
}

export default function InitialBalanceSection({
  isSuperAdmin,
  houses = [],
  onRefreshHouses,
  penaltyRatePerMonth = 100,
}: InitialBalanceSectionProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // แท็บหลัก: 'single' (ทีละหลัง) หรือ 'batch' (นำเข้าหลายหลัง)
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [cutoffDate, setCutoffDate] = useState<string>(todayStr);

  // โหมดการคิดค่าปรับ: FLAT_PER_MONTH (ตรงกับระบบบิลหลัก) หรือ STEP_RATE_PERCENT (% ของเงินต้น)
  const [penaltyCalcMode, setPenaltyCalcMode] = useState<PenaltyCalcMode>('FLAT_PER_MONTH');

  // ----------------------------------------------------
  // Single Mode State (กรอกทีละหลัง - ใช้งานง่าย ไม่พลาด)
  // ----------------------------------------------------
  const [selectedHouseNo, setSelectedHouseNo] = useState<string>('');
  const [isPaidFull, setIsPaidFull] = useState<boolean>(false);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [savingSingle, setSavingSingle] = useState(false);

  // ข้อมูลบ้านที่เลือก
  const currentHouse = useMemo(() => {
    return houses.find((h) => h.houseNo === selectedHouseNo);
  }, [houses, selectedHouseNo]);

  // ตั้งค่าเริ่มต้นเมื่อเลือกบ้าน
  useEffect(() => {
    if (selectedHouseNo && currentHouse) {
      const defaultRate = Number(currentHouse.feeRate) || 500;
      // ถ้างวดว่าง ให้สร้างงวดเริ่มต้น 1 งวด
      if (periods.length === 0 && !isPaidFull) {
        const lastMonth = new Date().getMonth(); // 0-indexed = เดือนที่แล้ว
        const targetYear = lastMonth === 0 ? currentYear - 1 : currentYear;
        const targetMonth = lastMonth === 0 ? 12 : lastMonth;
        const monthPad = String(targetMonth).padStart(2, '0');

        setPeriods([
          {
            id: String(Date.now()),
            billingYear: targetYear,
            billingMonth: targetMonth,
            dueDate: `${targetYear}-${monthPad}-07`,
            principalAmount: defaultRate,
            penaltyMode: 'auto',
            customPenaltyRate: '',
            flatPenaltyOverride: 'auto',
            customFlatPenalty: '',
          },
        ]);
      }
    }
  }, [selectedHouseNo, currentHouse, isPaidFull, currentYear, periods.length]);

  // เพิ่มงวดใหม่ 1 งวด
  const handleAddPeriod = () => {
    const defaultRate = currentHouse ? Number(currentHouse.feeRate) || 500 : 500;
    // หางวดก่อนหน้าเพื่อคำนวณเดือนถัดไปหรือเดือนก่อนหน้า
    let nextYear = currentYear;
    let nextMonth = 1;

    if (periods.length > 0) {
      const lastP = periods[periods.length - 1];
      if (lastP.billingMonth === 1) {
        nextMonth = 12;
        nextYear = lastP.billingYear - 1;
      } else {
        nextMonth = lastP.billingMonth - 1;
        nextYear = lastP.billingYear;
      }
    }

    const monthPad = String(nextMonth).padStart(2, '0');
    setPeriods([
      ...periods,
      {
        id: String(Date.now() + Math.random()),
        billingYear: nextYear,
        billingMonth: nextMonth,
        dueDate: `${nextYear}-${monthPad}-07`,
        principalAmount: defaultRate,
        penaltyMode: 'auto',
        customPenaltyRate: '',
        flatPenaltyOverride: 'auto',
        customFlatPenalty: '',
      },
    ]);
  };

  // ลบงวด
  const handleRemovePeriod = (id: string) => {
    setPeriods(periods.filter((p) => p.id !== id));
  };

  // แก้ไขข้อมูลงวด
  const handleUpdatePeriod = (id: string, field: keyof PeriodRow, value: any) => {
    setPeriods(
      periods.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };

        // ถ้าเปลี่ยนปีหรือเดือน ให้ปรับวันครบกำหนดให้อัตโนมัติ (วันที่ 7)
        if (field === 'billingYear' || field === 'billingMonth') {
          const y = field === 'billingYear' ? Number(value) : p.billingYear;
          const m = field === 'billingMonth' ? Number(value) : p.billingMonth;
          const mPad = String(m).padStart(2, '0');
          updated.dueDate = `${y}-${mPad}-07`;
        }
        return updated;
      })
    );
  };

  // สร้างงวดย้อนหลังด่วน (เช่น ค้าง 6, 12, 24 เดือน)
  const handleQuickGenerate = (monthsCount: number) => {
    if (!selectedHouseNo) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกบ้านเลขที่ก่อน',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    const defaultRate = currentHouse ? Number(currentHouse.feeRate) || 500 : 500;
    const generated: PeriodRow[] = [];
    const now = new Date();

    for (let i = 1; i <= monthsCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const mPad = String(m).padStart(2, '0');

      generated.push({
        id: String(Date.now() + i),
        billingYear: y,
        billingMonth: m,
        dueDate: `${y}-${mPad}-07`,
        principalAmount: defaultRate,
        penaltyMode: 'auto',
        customPenaltyRate: '',
        flatPenaltyOverride: 'auto',
        customFlatPenalty: '',
      });
    }

    setPeriods(generated);
    setIsPaidFull(false);
  };

  // คำนวณยอดสด (Live Calculation) สำหรับบ้านหลังที่เลือก
  const singleCalculation = useMemo(() => {
    if (isPaidFull || periods.length === 0) {
      return {
        totalPrincipal: 0,
        totalPenalty: 0,
        grandTotal: 0,
        calculatedPeriods: [],
      };
    }

    const cutoff = new Date(cutoffDate);
    cutoff.setHours(23, 59, 59, 999);

    let housePrincipal = 0;
    let housePenalty = 0;

    const calculatedPeriods = periods.map((p) => {
      const due = new Date(p.dueDate);
      due.setHours(0, 0, 0, 0);

      const diffTime = cutoff.getTime() - due.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      const monthsOverdue = getOverdueMonths(daysOverdue);

      const principal = truncate2(Number(p.principalAmount) || 0);
      let penalty = 0;
      let rate = 0;

      if (penaltyCalcMode === 'STEP_RATE_PERCENT') {
        // โหมด Step Rate: คิดเป็น % ของเงินต้น
        if (p.penaltyMode === 'auto') {
          rate = getStepPenaltyRate(daysOverdue);
        } else if (p.penaltyMode === 'custom') {
          rate = Number(p.customPenaltyRate) || 0;
        } else {
          rate = Number(p.penaltyMode);
        }
        penalty = truncate2(principal * (rate / 100));
      } else {
        // โหมด Flat Per Month: คิดเป็น จำนวนเดือน × อัตราต่อเดือน
        if (p.flatPenaltyOverride === 'none') {
          penalty = 0;
        } else if (p.flatPenaltyOverride === 'custom') {
          penalty = truncate2(Number(p.customFlatPenalty) || 0);
        } else {
          // auto
          penalty = truncate2(monthsOverdue * penaltyRatePerMonth);
        }
      }

      const total = truncate2(principal + penalty);

      housePrincipal += principal;
      housePenalty += penalty;

      return {
        ...p,
        daysOverdue,
        monthsOverdue,
        rate,
        principal,
        penalty,
        total,
      };
    });

    return {
      totalPrincipal: truncate2(housePrincipal),
      totalPenalty: truncate2(housePenalty),
      grandTotal: truncate2(housePrincipal + housePenalty),
      calculatedPeriods,
    };
  }, [isPaidFull, periods, cutoffDate, penaltyCalcMode, penaltyRatePerMonth]);

  // บันทึกยอดยกมาของบ้านหลังที่เลือก
  const handleSaveSingleHouse = async () => {
    if (!selectedHouseNo) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกบ้านเลขที่',
        text: 'โปรดเลือกบ้านเลขที่ที่จะดำเนินการตั้งค่ายอดยกมา',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    if (!isPaidFull && periods.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่มีงวดค้างชำระ',
        text: 'หากบ้านหลังนี้ไม่มีหนี้ค้าง กรุณากดเลือก "จ่ายครบแล้ว" หรือเพิ่มงวดค้างชำระ',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    const confirmHtml = isPaidFull
      ? `ต้องการบันทึกสถานะ <b>"จ่ายครบแล้ว (ไม่มียอดค้างชำระยกมา)"</b><br/>สำหรับบ้านเลขที่ <b>${selectedHouseNo}</b> ใช่หรือไม่?`
      : `ต้องการบันทึกยอดหนี้ยกมาสำหรับบ้านเลขที่ <b>${selectedHouseNo}</b><br/>
         จำนวนค้างชำระ: <b>${periods.length} งวด</b><br/>
         เงินต้น: <b>฿${singleCalculation.totalPrincipal.toLocaleString()}</b><br/>
         เบี้ยปรับ: <b>฿${singleCalculation.totalPenalty.toLocaleString()}</b><br/>
         <span class="text-base font-bold text-[#376B64]">ยอดหนี้รวมทั้งสิ้น: ฿${singleCalculation.grandTotal.toLocaleString()}</span>`;

    const result = await Swal.fire({
      ...defaultSwalConfig,
      title: 'ยืนยันการตั้งค่ายอดยกมา?',
      html: confirmHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันบันทึกข้อมูล',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setSavingSingle(true);
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-[2rem]' },
    });

    try {
      // ส่งข้อมูลไปยัง API
      const unpaidPeriodsPayload = isPaidFull
        ? []
        : singleCalculation.calculatedPeriods.map((p) => {
            const base: any = {
              billingYear: p.billingYear,
              billingMonth: p.billingMonth,
              dueDate: p.dueDate,
              principalAmount: p.principal,
            };
            if (penaltyCalcMode === 'STEP_RATE_PERCENT') {
              base.customPenaltyRate = p.rate;
            } else {
              // สำหรับ FLAT_PER_MONTH ส่งค่าปรับที่คำนวณแล้วเป็น customFlatPenalty
              base.customFlatPenalty = p.penalty;
            }
            return base;
          });

      const res = await fetch('/api/admin/initial-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          cutoffDate,
          penaltyCalcMode,
          flatPenaltyPerMonth: penaltyRatePerMonth,
          items: [
            {
              houseNo: selectedHouseNo,
              unpaidPeriods: unpaidPeriodsPayload,
            },
          ],
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          icon: 'success',
          title: 'บันทึกยอดยกมาสำเร็จ!',
          html: `บันทึกข้อมูลบ้านเลขที่ <b>${selectedHouseNo}</b> เรียบร้อยแล้ว`,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });

        onRefreshHouses?.();
        // เคลียร์ฟอร์ม
        setPeriods([]);
        setIsPaidFull(false);
        setSelectedHouseNo('');
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'บันทึกข้อมูลล้มเหลว',
        text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' },
      });
    } finally {
      setSavingSingle(false);
    }
  };

  // ----------------------------------------------------
  // Batch Mode State (นำเข้าหลายหลังพร้อมกันด้วย CSV)
  // ----------------------------------------------------
  const [rawText, setRawText] = useState<string>('');
  const [loadingBatchPreview, setLoadingBatchPreview] = useState(false);
  const [batchPreviewData, setBatchPreviewData] = useState<MigrationCalculationResult | null>(null);

  const handleBatchPreview = async () => {
    if (!rawText.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่มีข้อมูล',
        text: 'กรุณาวางข้อมูล CSV หรือข้อความรูปแบบที่กำหนด',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    setLoadingBatchPreview(true);
    try {
      const res = await fetch('/api/admin/initial-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', cutoffDate, rawCsvText: rawText, penaltyCalcMode, flatPenaltyPerMonth: penaltyRatePerMonth }),
      });
      const json = await res.json();
      if (json.success) setBatchPreviewData(json.data);
      else throw new Error(json.error);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'คำนวณไม่สำเร็จ',
        text: err.message,
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' },
      });
    } finally {
      setLoadingBatchPreview(false);
    }
  };

  const handleBatchConfirm = async () => {
    if (!batchPreviewData) return;
    const res = await Swal.fire({
      ...defaultSwalConfig,
      title: 'ยืนยันการนำเข้าข้อมูลกลุ่ม?',
      html: `ต้องการนำเข้าข้อมูลบ้านจำนวน <b>${batchPreviewData.totalProperties} หลัง</b> หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันบันทึก',
      cancelButtonText: 'ยกเลิก',
    });
    if (!res.isConfirmed) return;

    try {
      const resp = await fetch('/api/admin/initial-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', cutoffDate, rawCsvText: rawText, penaltyCalcMode, flatPenaltyPerMonth: penaltyRatePerMonth }),
      });
      const json = await resp.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: json.message,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
        setBatchPreviewData(null);
        setRawText('');
        onRefreshHouses?.();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message,
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' },
      });
    }
  };

  return (
    <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-100 relative mt-8 z-0">
      {!isSuperAdmin && (
        <div className="absolute inset-0 z-20 bg-slate-100/40 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-[1.5rem] sm:rounded-[2rem]">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center text-center max-w-sm">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert size={28} />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">สิทธิ์การเข้าถึงข้อมูลจำกัด</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ตั้งค่ายอดยกมาตั้งต้น
            </p>
          </div>
        </div>
      )}

      <div className={`p-5 sm:p-6 md:p-8 ${!isSuperAdmin ? 'opacity-30 pointer-events-none select-none' : ''}`}>
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg shrink-0">
                <History size={20} />
              </span>
              <span className="truncate">ตั้งค่ายอดลูกหนี้ค้างชำระยกมา (Initial Balance Setup)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              นำเข้ายอดค้างชำระย้อนหลัง (1-3 ปี) หรือระบุบ้านที่จ่ายครบแล้ว พร้อมคำนวณเบี้ยปรับแยกรายแปลงอย่างปลอดภัย
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'single'
                  ? 'bg-white text-[#376B64] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Home size={14} className="text-[#376B64]" /> กำหนดรายหลัง (แนะนำ)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'bg-white text-[#376B64] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileSpreadsheet size={14} className="text-[#376B64]" /> นำเข้าข้อมูลชุด (CSV)
            </button>
          </div>
        </div>

        {/* โหมดการคิดค่าปรับ */}
        <div className="mb-6 p-4 bg-[#376B64]/5 border border-[#376B64]/20 rounded-2xl">
          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Calculator size={16} className="text-[#376B64]" />
            วิธีการคิดเบี้ยปรับยอดค้างชำระ (Penalty Calculation Mode)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPenaltyCalcMode('FLAT_PER_MONTH')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                penaltyCalcMode === 'FLAT_PER_MONTH'
                  ? 'border-[#376B64] bg-white shadow-sm'
                  : 'border-slate-200 bg-white/60 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  penaltyCalcMode === 'FLAT_PER_MONTH' ? 'bg-[#376B64] text-white' : 'border-2 border-slate-300'
                }`}>
                  {penaltyCalcMode === 'FLAT_PER_MONTH' && <Check size={12} />}
                </div>
                <div>
                  <span className="flex items-center gap-1.5 font-black text-sm text-slate-800">
                    <Coins size={16} className="text-[#376B64]" /> คิดค่าปรับคงที่ต่อเดือน
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
                    สูตรคำนวณ: จำนวนเดือนค้างชำระ × <b>฿{penaltyRatePerMonth.toLocaleString()}/เดือน</b>
                    <br />เช่น ค้าง 6 เดือน = 6 × {penaltyRatePerMonth} = <b>฿{(6 * penaltyRatePerMonth).toLocaleString()}</b>
                  </span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#376B64]/10 text-[#376B64] text-[10px] font-bold rounded-md">
                    รูปแบบมาตรฐานโครงการ
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPenaltyCalcMode('STEP_RATE_PERCENT')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                penaltyCalcMode === 'STEP_RATE_PERCENT'
                  ? 'border-[#376B64] bg-white shadow-sm'
                  : 'border-slate-200 bg-white/60 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  penaltyCalcMode === 'STEP_RATE_PERCENT' ? 'bg-[#376B64] text-white' : 'border-2 border-slate-300'
                }`}>
                  {penaltyCalcMode === 'STEP_RATE_PERCENT' && <Check size={12} />}
                </div>
                <div>
                  <span className="flex items-center gap-1.5 font-black text-sm text-slate-800">
                    <TrendingUp size={16} className="text-[#376B64]" /> คิดคำนวณอัตราร้อยละขั้นบันได
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
                    1-30 วัน: <b>0%</b> · 31-180 วัน: <b>10%</b> · เกิน 180 วัน: <b>20%</b>
                    <br />เช่น เงินต้น 500 ค้าง 90 วัน = 500 × 10% = <b>฿50</b>
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: SINGLE HOUSE SETUP (เลือกทำทีละหลัง - แยก TextBox ชัดเจน) */}
        {/* ============================================================== */}
        {activeTab === 'single' && (
          <div className="space-y-6">
            {/* Step 1: เลือกบ้าน และ วันที่ตัดยอด */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  1. เลือกบ้านเลขที่ที่จะตั้งค่า <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedHouseNo}
                    onChange={(e) => {
                      setSelectedHouseNo(e.target.value);
                      setIsPaidFull(false);
                      setPeriods([]);
                    }}
                    className="flex-1 border border-slate-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none font-bold text-sm text-slate-800 shadow-sm"
                  >
                    <option value="">-- เลือกบ้านเลขที่จากระบบ --</option>
                    {houses.map((h) => (
                      <option key={h.id} value={h.houseNo}>
                        บ้านเลขที่ {h.houseNo} ({h.houseSize} ตร.ว. / ฿
                        {Number(h.feeRate).toLocaleString()} ต่อเดือน)
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="หรือพิมพ์เลขที่บ้าน..."
                    value={selectedHouseNo}
                    onChange={(e) => {
                      setSelectedHouseNo(e.target.value);
                      setIsPaidFull(false);
                    }}
                    className="w-44 border border-slate-200 rounded-xl px-3 py-3 bg-white focus:ring-2 focus:ring-[#376B64]/50 font-bold text-sm text-slate-800 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  วันที่ตัดยอด (Cut-off Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={cutoffDate}
                  onChange={(e) => setCutoffDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#376B64]/50 font-bold text-sm text-slate-800 shadow-sm"
                />
              </div>
            </div>

            {/* Step 2: เลือกสถานะของบ้านหลังนี้ */}
            {selectedHouseNo && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
                <label className="block text-sm font-bold text-slate-700">
                  2. ระบุสถานะการชำระเงินยกมาของบ้านเลขที่ <span className="text-[#376B64] font-black">{selectedHouseNo}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidFull(true);
                      setPeriods([]);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      isPaidFull
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isPaidFull ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isPaidFull && <Check size={14} />}
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 font-black text-sm text-slate-800">
                        <CheckCircle2 size={16} className="text-emerald-600" /> ชำระครบถ้วน (ไม่มียอดค้างชำระ)
                      </span>
                      <span className="block text-xs text-slate-500 mt-1">
                        กำหนดยอดหนี้ยกมาเป็น ฿0.00 และบันทึกสถานะเรียบร้อย
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidFull(false);
                      if (periods.length === 0) handleAddPeriod();
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      !isPaidFull
                        ? 'border-[#376B64] bg-[#376B64]/5 shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        !isPaidFull ? 'bg-[#376B64] text-white' : 'border border-slate-300'
                      }`}
                    >
                      {!isPaidFull && <Check size={14} />}
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 font-black text-sm text-slate-800">
                        <AlertTriangle size={16} className="text-[#376B64]" /> มียอดค้างชำระย้อนหลัง
                      </span>
                      <span className="block text-xs text-slate-500 mt-1">
                        ระบุงวดที่ค้างและเลือกวิธีคิดเบี้ยปรับแต่ละงวดได้
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: รายการงวดค้างชำระ (แสดงเมื่อเลือกมียอดค้าง) */}
            {selectedHouseNo && !isPaidFull && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Calendar size={18} className="text-[#376B64]" />
                      3. รายการงวดที่ค้างชำระ (เพิ่มหรือแก้ไขแยกแต่ละงวด)
                    </h3>
                    <span className="text-xs text-slate-400">
                      มีทั้งหมด {periods.length} งวดค้างชำระ
                    </span>
                  </div>

                  {/* ปุ่มสร้างงวดย้อนหลังด่วน */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 shrink-0">สร้างด่วน:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickGenerate(6)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      6 เดือน
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickGenerate(12)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      1 ปี (12 ด.)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickGenerate(24)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      2 ปี (24 ด.)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickGenerate(36)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                    >
                      3 ปี (36 ด.)
                    </button>
                  </div>
                </div>

                {/* ตาราง/กล่องรายการแต่ละงวด */}
                <div className="space-y-3">
                  {periods.map((row, index) => {
                    const calc = singleCalculation.calculatedPeriods[index];
                    return (
                      <div
                        key={row.id}
                        className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:bg-slate-50 transition-colors"
                      >
                        {/* งวดที่ */}
                        <div className="md:col-span-1 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                            #{index + 1}
                          </span>
                        </div>

                        {/* ปี ค.ศ. / พ.ศ. */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            ปี (ค.ศ. / พ.ศ.)
                          </label>
                          <select
                            value={row.billingYear}
                            onChange={(e) =>
                              handleUpdatePeriod(row.id, 'billingYear', Number(e.target.value))
                            }
                            className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-xs text-slate-800 shadow-sm"
                          >
                            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map(
                              (y) => (
                                <option key={y} value={y}>
                                  {y} (พ.ศ. {y + 543})
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {/* เดือน */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            เดือน
                          </label>
                          <select
                            value={row.billingMonth}
                            onChange={(e) =>
                              handleUpdatePeriod(row.id, 'billingMonth', Number(e.target.value))
                            }
                            className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-xs text-slate-800 shadow-sm"
                          >
                            {THAI_MONTHS.map((mName, mIdx) => (
                              <option key={mIdx + 1} value={mIdx + 1}>
                                {mIdx + 1}. {mName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* เงินต้น (บาท) */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            เงินต้น (บาท)
                          </label>
                          <input
                            type="number"
                            value={row.principalAmount}
                            onChange={(e) =>
                              handleUpdatePeriod(
                                row.id,
                                'principalAmount',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            placeholder="500"
                            className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-xs text-slate-800 shadow-sm"
                          />
                        </div>

                        {/* รูปแบบการคิดเบี้ยปรับ — แสดง UI ตามโหมดที่เลือก */}
                        <div className="md:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            การคิดเบี้ยปรับ
                          </label>

                          {penaltyCalcMode === 'STEP_RATE_PERCENT' ? (
                            /* UI สำหรับ Step Rate % */
                            <div className="flex gap-1.5">
                              <select
                                value={row.penaltyMode}
                                onChange={(e) =>
                                  handleUpdatePeriod(row.id, 'penaltyMode', e.target.value)
                                }
                                className="flex-1 border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-xs text-slate-800 shadow-sm"
                              >
                                <option value="auto">คำนวณขั้นบันไดอัตโนมัติ</option>
                                <option value="0">ยกเว้นเบี้ยปรับ (0%)</option>
                                <option value="10">กำหนดอัตรา 10%</option>
                                <option value="20">กำหนดอัตรา 20%</option>
                                <option value="custom">กำหนดอัตราร้อยละเอง</option>
                              </select>

                              {row.penaltyMode === 'custom' && (
                                <input
                                  type="number"
                                  placeholder="%"
                                  value={row.customPenaltyRate}
                                  onChange={(e) =>
                                    handleUpdatePeriod(
                                      row.id,
                                      'customPenaltyRate',
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )
                                  }
                                  className="w-16 border border-slate-200 rounded-xl p-2 bg-white font-bold text-xs text-center"
                                />
                              )}
                            </div>
                          ) : (
                            /* UI สำหรับ Flat Per Month */
                            <div className="flex gap-1.5">
                              <select
                                value={row.flatPenaltyOverride}
                                onChange={(e) =>
                                  handleUpdatePeriod(row.id, 'flatPenaltyOverride', e.target.value)
                                }
                                className="flex-1 border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-xs text-slate-800 shadow-sm"
                              >
                                <option value="auto">คำนวณอัตโนมัติ (฿{penaltyRatePerMonth}/เดือน)</option>
                                <option value="none">ยกเว้นเบี้ยปรับ (฿0)</option>
                                <option value="custom">กำหนดจำนวนเงินเอง</option>
                              </select>

                              {row.flatPenaltyOverride === 'custom' && (
                                <input
                                  type="number"
                                  placeholder="฿"
                                  value={row.customFlatPenalty}
                                  onChange={(e) =>
                                    handleUpdatePeriod(
                                      row.id,
                                      'customFlatPenalty',
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )
                                  }
                                  className="w-20 border border-slate-200 rounded-xl p-2 bg-white font-bold text-xs text-center"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* ยอดที่คิดได้ + ปุ่มลบ */}
                        <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0">
                          <div className="text-right">
                            <span className="block font-black text-xs text-slate-800">
                              ฿{(calc?.total || 0).toLocaleString()}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {penaltyCalcMode === 'FLAT_PER_MONTH'
                                ? `(ปรับ ฿${(calc?.penalty || 0).toLocaleString()} / ${calc?.monthsOverdue || 0} เดือน)`
                                : `(ปรับ ฿${(calc?.penalty || 0).toLocaleString()} / ${calc?.daysOverdue || 0} วัน)`
                              }
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePeriod(row.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="ลบงวดนี้"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ปุ่มเพิ่มงวด */}
                <button
                  type="button"
                  onClick={handleAddPeriod}
                  className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-[#376B64] hover:bg-[#376B64]/5 text-slate-600 hover:text-[#376B64] rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> + เพิ่มงวดค้างชำระอีก 1 เดือน
                </button>
              </div>
            )}

            {/* Step 4: สรุปยอดและปุ่มบันทึกสำหรับบ้านหลังนี้ */}
            {selectedHouseNo && (
              <div className="p-5 bg-gradient-to-br from-slate-50 to-[#376B64]/5 border border-[#376B64]/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">
                    ยอดหนี้ยกมาสำหรับบ้านเลขที่ <b>{selectedHouseNo}</b>:
                  </span>
                  {isPaidFull ? (
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 block mt-1">
                      ฿0.00 บาท (จ่ายครบแล้ว)
                    </span>
                  ) : (
                    <div className="mt-1">
                      <span className="text-2xl sm:text-3xl font-black text-[#2A524C]">
                        ฿{singleCalculation.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        (เงินต้น ฿{singleCalculation.totalPrincipal.toLocaleString()} + เบี้ยปรับ ฿
                        {singleCalculation.totalPenalty.toLocaleString()})
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveSingleHouse}
                  disabled={savingSingle}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    savingSingle
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#376B64] hover:bg-[#2A524C] text-white'
                  }`}
                >
                  <Save size={18} />
                  {savingSingle ? 'กำลังบันทึก...' : `บันทึกข้อมูลบ้านเลขที่ ${selectedHouseNo}`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BATCH MODE (นำเข้าหลายหลังพร้อมกันด้วย CSV)               */}
        {/* ============================================================== */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold text-slate-700">
                วางข้อมูลประวัติค้างชำระ (CSV)
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                รูปแบบ: บ้านเลขที่, ปี, เดือน, กำหนดชำระ(YYYY-MM-DD), เงินต้น
              </span>
            </div>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`ตัวอย่าง:\n101/1\n101/2, 2024, 1, 2024-01-07, 500\n101/2, 2026, 9, 2026-09-07, 500`}
              className="w-full border border-slate-200 rounded-2xl p-4 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 font-mono text-xs text-slate-800"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBatchPreview}
                disabled={loadingBatchPreview}
                className="px-6 py-3 bg-[#376B64] text-white font-bold rounded-xl text-sm"
              >
                {loadingBatchPreview ? 'กำลังคำนวณ...' : 'ตรวจสอบยอด (Preview)'}
              </button>

              {batchPreviewData && (
                <button
                  type="button"
                  onClick={handleBatchConfirm}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm"
                >
                  ยืนยันนำเข้า {batchPreviewData.totalProperties} หลัง
                </button>
              )}
            </div>

            {batchPreviewData && (
              <div className="p-4 bg-slate-50 border rounded-2xl text-xs space-y-2">
                <p className="font-bold text-slate-700">
                  รวมเงินต้น: ฿{batchPreviewData.totalPrincipalDebt.toLocaleString()} |
                  เบี้ยปรับ: ฿{batchPreviewData.totalPenaltyDebt.toLocaleString()} |
                  รวมทั้งสิ้น: ฿{batchPreviewData.grandTotalDebt.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
