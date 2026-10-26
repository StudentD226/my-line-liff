'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ShieldCheck,
  Users,
  Search,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { defaultSwalConfig } from '@/lib/swal-helper';
import {
  MigrationCalculationResult,
  PenaltyCalcMode,
  HouseMigrationInput,
  DebtPeriodInput,
  getStepPenaltyRate,
  getOverdueMonths,
  truncate2,
} from '@/lib/initial-balance';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// รายการปีรองรับตั้งแต่ปี 2021 (พ.ศ. 2564) จนถึง 2027 (พ.ศ. 2570)
const AVAILABLE_YEARS = [2027, 2026, 2025, 2024, 2023, 2022, 2021];

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

  // โหมดการคิดค่าปรับ: NO_PENALTY (ปลอดเบี้ยปรับ) | FLAT_PER_MONTH | STEP_RATE_PERCENT
  const [penaltyCalcMode, setPenaltyCalcMode] = useState<PenaltyCalcMode>('NO_PENALTY');

  // Date Range Picker States สำหรับสร้างงวดค้างชำระตามช่วงเวลา (เช่น ก.ย. 64 ถึง ธ.ค. 69)
  const [rangeStartYear, setRangeStartYear] = useState<number>(2021);
  const [rangeStartMonth, setRangeStartMonth] = useState<number>(9);
  const [rangeEndYear, setRangeEndYear] = useState<number>(2026);
  const [rangeEndMonth, setRangeEndMonth] = useState<number>(12);
  const [markingAllPaid, setMarkingAllPaid] = useState<boolean>(false);

  // ----------------------------------------------------
  // Multi-House Popup Modal State (เลือกหลายหลังที่ค้างเท่ากัน)
  // ----------------------------------------------------
  const [isMultiModalOpen, setIsMultiModalOpen] = useState<boolean>(false);
  const [multiSelectedHouseNos, setMultiSelectedHouseNos] = useState<string[]>([]);
  const [multiSearchQuery, setMultiSearchQuery] = useState<string>('');
  const [multiIsPaidFull, setMultiIsPaidFull] = useState<boolean>(false);
  const [multiStartYear, setMultiStartYear] = useState<number>(2021);
  const [multiStartMonth, setMultiStartMonth] = useState<number>(9);
  const [multiEndYear, setMultiEndYear] = useState<number>(2026);
  const [multiEndMonth, setMultiEndMonth] = useState<number>(12);
  const [multiFeeMode, setMultiFeeMode] = useState<'house_rate' | 'custom'>('house_rate');
  const [multiCustomAmount, setMultiCustomAmount] = useState<number | ''>(500);
  const [submittingMulti, setSubmittingMulti] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMultiModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMultiModalOpen]);

  // รายชื่อบ้านที่ผ่านการกรองค้นหาใน Modal
  const filteredHousesForMulti = useMemo(() => {
    if (!multiSearchQuery.trim()) return houses;
    const q = multiSearchQuery.trim().toLowerCase();
    return houses.filter((h) => h.houseNo.toLowerCase().includes(q));
  }, [houses, multiSearchQuery]);

  // จำนวนเดือนทั้งหมดใน Modal
  const multiTotalMonths = useMemo(() => {
    const start = multiStartYear * 12 + multiStartMonth;
    const end = multiEndYear * 12 + multiEndMonth;
    return Math.max(0, end - start + 1);
  }, [multiStartYear, multiStartMonth, multiEndYear, multiEndMonth]);

  const handleSelectAllHousesForMulti = () => {
    const currentFilteredNos = filteredHousesForMulti.map((h) => h.houseNo);
    const newSet = new Set([...multiSelectedHouseNos, ...currentFilteredNos]);
    setMultiSelectedHouseNos(Array.from(newSet));
  };

  const handleDeselectAllHousesForMulti = () => {
    setMultiSelectedHouseNos([]);
  };

  const handleToggleHouseForMulti = (houseNo: string) => {
    setMultiSelectedHouseNos((prev) =>
      prev.includes(houseNo) ? prev.filter((no) => no !== houseNo) : [...prev, houseNo]
    );
  };

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

  // คำนวณจำนวนเดือนทั้งหมดในช่วงที่เลือก
  const totalMonthsInRange = useMemo(() => {
    const startTotal = rangeStartYear * 12 + rangeStartMonth;
    const endTotal = rangeEndYear * 12 + rangeEndMonth;
    return Math.max(0, endTotal - startTotal + 1);
  }, [rangeStartYear, rangeStartMonth, rangeEndYear, rangeEndMonth]);

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
            penaltyMode: '0',
            customPenaltyRate: '',
            flatPenaltyOverride: 'none',
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
        penaltyMode: penaltyCalcMode === 'NO_PENALTY' ? '0' : 'auto',
        customPenaltyRate: '',
        flatPenaltyOverride: penaltyCalcMode === 'NO_PENALTY' ? 'none' : 'auto',
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
        penaltyMode: penaltyCalcMode === 'NO_PENALTY' ? '0' : 'auto',
        customPenaltyRate: '',
        flatPenaltyOverride: penaltyCalcMode === 'NO_PENALTY' ? 'none' : 'auto',
        customFlatPenalty: '',
      });
    }

    setPeriods(generated);
    setIsPaidFull(false);
  };

  // 🌟 สร้างงวดค้างชำระตามช่วงเวลาอัตโนมัติ (เช่น ก.ย. 64 ถึง ธ.ค. 69)
  const handleGenerateDateRange = () => {
    if (!selectedHouseNo) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกบ้านเลขที่ก่อน',
        text: 'โปรดเลือกบ้านเลขที่ที่จะสร้างงวดค้างชำระ',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    const startTotal = rangeStartYear * 12 + rangeStartMonth;
    const endTotal = rangeEndYear * 12 + rangeEndMonth;
    if (startTotal > endTotal) {
      Swal.fire({
        icon: 'warning',
        title: 'ช่วงเวลาไม่ถูกต้อง',
        text: 'เดือน/ปีเริ่มต้น ต้องมาก่อนหรือเท่ากับเดือน/ปีสิ้นสุด',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    const defaultRate = currentHouse ? Number(currentHouse.feeRate) || 500 : 500;
    const generated: PeriodRow[] = [];

    // วนสร้างงวดตั้งแต่งวดเริ่มต้นจนถึงสิ้นสุด
    for (let current = startTotal; current <= endTotal; current++) {
      const year = Math.floor((current - 1) / 12);
      const month = ((current - 1) % 12) + 1;
      const monthPad = String(month).padStart(2, '0');

      generated.push({
        id: String(Date.now() + Math.random() + current),
        billingYear: year,
        billingMonth: month,
        dueDate: `${year}-${monthPad}-07`,
        principalAmount: defaultRate,
        penaltyMode: penaltyCalcMode === 'NO_PENALTY' ? '0' : 'auto',
        customPenaltyRate: '',
        flatPenaltyOverride: penaltyCalcMode === 'NO_PENALTY' ? 'none' : 'auto',
        customFlatPenalty: '',
      });
    }

    setPeriods(generated);
    setIsPaidFull(false);
  };

  // 🌟 ฟังก์ชันตั้งค่าบ้านที่เหลือทั้งหมดในระบบให้เป็น "จ่ายครบแล้ว (฿0.00)" ในคลิกเดียว
  const handleMarkAllOtherHousesPaid = async () => {
    if (!houses || houses.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบข้อมูลบ้าน',
        text: 'ระบบยังไม่มีข้อมูลบ้านในโครงการ',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    const result = await Swal.fire({
      ...defaultSwalConfig,
      title: 'ตั้งค่าบ้านทั้งหมดเป็น "จ่ายครบแล้ว"?',
      html: `ต้องการบันทึกสถานะ <b>"ชำระครบถ้วน (ไม่มียอดหนี้ยกมา)"</b> ให้กับบ้านทั้งหมด <b>${houses.length} หลัง</b> ในโครงการใช่หรือไม่?<br/><br/>
             <span class="text-xs text-slate-500">*สำหรับบ้านที่มียอดค้างชำระจริง ท่านสามารถเข้ามาเลือกระบุงวดค้างชำระรายหลังได้ตลอดเวลา</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันตั้งค่าจ่ายครบทั้งหมด',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setMarkingAllPaid(true);
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-[2rem]' },
    });

    try {
      const itemsPayload = houses.map((h) => ({
        houseNo: h.houseNo,
        unpaidPeriods: [],
      }));

      const res = await fetch('/api/admin/initial-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          cutoffDate,
          penaltyCalcMode: 'NO_PENALTY',
          flatPenaltyPerMonth: 0,
          items: itemsPayload,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          icon: 'success',
          title: 'ตั้งค่าสำเร็จ!',
          html: `บันทึกสถานะจ่ายครบถ้วนให้กับบ้าน <b>${houses.length} หลัง</b> เรียบร้อยแล้ว`,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
        onRefreshHouses?.();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถบันทึกข้อมูลได้',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' },
      });
    } finally {
      setMarkingAllPaid(false);
    }
  };

  // 🌟 บันทึกข้อมูลหลายบ้านพร้อมกัน (Batch Multi-House Save)
  const handleSubmitMultiHouses = async () => {
    if (multiSelectedHouseNos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่ได้เลือกบ้าน',
        text: 'กรุณาเลือกบ้านเลขที่อย่างน้อย 1 หลังที่ต้องการกำหนดข้อมูล',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    const startTotal = multiStartYear * 12 + multiStartMonth;
    const endTotal = multiEndYear * 12 + multiEndMonth;
    if (!multiIsPaidFull && startTotal > endTotal) {
      Swal.fire({
        icon: 'warning',
        title: 'ช่วงเวลาไม่ถูกต้อง',
        text: 'เดือน/ปีเริ่มต้น ต้องมาก่อนหรือเท่ากับเดือน/ปีสิ้นสุด',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    const confirmHtml = multiIsPaidFull
      ? `ต้องการบันทึกสถานะ <b>"ชำระครบถ้วน (฿0.00)"</b><br/>ให้กับบ้านที่เลือกทั้งหมด <b>${multiSelectedHouseNos.length} หลัง</b> ใช่หรือไม่?`
      : `ต้องการบันทึกงวดค้างชำระจำนวน <b>${multiTotalMonths} งวด</b><br/>
         (ตั้งแต่ ${multiStartMonth}/${multiStartYear + 543} ถึง ${multiEndMonth}/${multiEndYear + 543})<br/>
         ให้กับบ้านที่เลือกทั้งหมด <b>${multiSelectedHouseNos.length} หลัง</b><br/>
         <span class="text-xs text-slate-500">*คิดเงินต้นตามอัตราที่เลือก และปลอดค่าปรับ (฿0)</span>`;

    const result = await Swal.fire({
      ...defaultSwalConfig,
      title: `ยืนยันบันทึก ${multiSelectedHouseNos.length} หลังพร้อมกัน?`,
      html: confirmHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันบันทึกข้อมูล',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setSubmittingMulti(true);
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-[2rem]' },
    });

    try {
      const periodsList: Array<{ year: number; month: number }> = [];
      if (!multiIsPaidFull) {
        for (let cur = startTotal; cur <= endTotal; cur++) {
          const y = Math.floor((cur - 1) / 12);
          const m = ((cur - 1) % 12) + 1;
          periodsList.push({ year: y, month: m });
        }
      }

      const itemsPayload: HouseMigrationInput[] = multiSelectedHouseNos.map((hNo) => {
        const houseObj = houses.find((h) => h.houseNo === hNo);
        const defaultHouseRate = Number(houseObj?.feeRate) || 500;
        const rate = multiFeeMode === 'custom' ? Number(multiCustomAmount) || defaultHouseRate : defaultHouseRate;

        const unpaidPeriods: DebtPeriodInput[] = multiIsPaidFull
          ? []
          : periodsList.map((p) => {
              const mPad = String(p.month).padStart(2, '0');
              return {
                billingYear: p.year,
                billingMonth: p.month,
                dueDate: `${p.year}-${mPad}-07`,
                principalAmount: rate,
                customFlatPenalty: 0,
                customPenaltyRate: 0,
              };
            });

        return {
          houseNo: hNo,
          unpaidPeriods,
        };
      });

      const res = await fetch('/api/admin/initial-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          cutoffDate,
          penaltyCalcMode: 'NO_PENALTY',
          flatPenaltyPerMonth: 0,
          items: itemsPayload,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          html: `บันทึกข้อมูลบ้านที่เลือกทั้ง <b>${multiSelectedHouseNos.length} หลัง</b> เรียบร้อยแล้ว`,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
        setIsMultiModalOpen(false);
        setMultiSelectedHouseNos([]);
        onRefreshHouses?.();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'บันทึกล้มเหลว',
        text: err.message || 'เกิดข้อผิดพลาดในการบันทึก',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' },
      });
    } finally {
      setSubmittingMulti(false);
    }
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

      if (penaltyCalcMode === 'NO_PENALTY') {
        // โหมด No Penalty: ไม่คิดค่าปรับทุกกรณี (฿0)
        penalty = 0;
        rate = 0;
      } else if (penaltyCalcMode === 'STEP_RATE_PERCENT') {
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
            if (penaltyCalcMode === 'NO_PENALTY') {
              base.customFlatPenalty = 0;
              base.customPenaltyRate = 0;
            } else if (penaltyCalcMode === 'STEP_RATE_PERCENT') {
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
    <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-100 relative mt-8">
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
              นำเข้ายอดค้างชำระย้อนหลัง (ตั้งแต่ ก.ย. 2564 ถึง ธ.ค. 2569) หรือระบุบ้านที่จ่ายครบแล้ว พร้อมคำนวณหรือยกเว้นเบี้ยปรับแยกรายแปลงอย่างปลอดภัย
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 gap-1.5 flex-wrap">
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
              onClick={() => {
                setMultiSelectedHouseNos([]);
                setMultiSearchQuery('');
                setIsMultiModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-[#376B64] hover:bg-[#2A524C] text-white shadow-sm active:scale-95"
            >
              <Users size={14} /> เลือกหลายหลังพร้อมกัน (Popup)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* โหมด 1: ไม่คิดค่าปรับ (NO_PENALTY) */}
            <button
              type="button"
              onClick={() => setPenaltyCalcMode('NO_PENALTY')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                penaltyCalcMode === 'NO_PENALTY'
                  ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white/60 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  penaltyCalcMode === 'NO_PENALTY' ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'
                }`}>
                  {penaltyCalcMode === 'NO_PENALTY' && <Check size={12} />}
                </div>
                <div>
                  <span className="flex items-center gap-1.5 font-black text-sm text-slate-800">
                    <ShieldCheck size={16} className="text-emerald-600" /> ไม่คิดค่าปรับ (฿0 ทุกงวด)
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
                    ยกเว้นค่าปรับย้อนหลังทั้งหมด ค้างชำระเฉพาะเงินต้นค่าส่วนกลางเพียวๆ
                  </span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">
                    แนะนำ ปลอดเบี้ยปรับ
                  </span>
                </div>
              </div>
            </button>

            {/* โหมด 2: คิดค่าปรับคงที่ต่อเดือน (FLAT_PER_MONTH) */}
            <button
              type="button"
              onClick={() => setPenaltyCalcMode('FLAT_PER_MONTH')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                penaltyCalcMode === 'FLAT_PER_MONTH'
                  ? 'border-[#376B64] bg-white shadow-sm ring-2 ring-[#376B64]/20'
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
                    สูตร: จำนวนเดือนค้าง × <b>฿{penaltyRatePerMonth.toLocaleString()}/ด.</b>
                  </span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#376B64]/10 text-[#376B64] text-[10px] font-bold rounded-md">
                    มาตรฐานโครงการ
                  </span>
                </div>
              </div>
            </button>

            {/* โหมด 3: คิดอัตราร้อยละขั้นบันได (STEP_RATE_PERCENT) */}
            <button
              type="button"
              onClick={() => setPenaltyCalcMode('STEP_RATE_PERCENT')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                penaltyCalcMode === 'STEP_RATE_PERCENT'
                  ? 'border-[#376B64] bg-white shadow-sm ring-2 ring-[#376B64]/20'
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
                    <TrendingUp size={16} className="text-[#376B64]" /> คิดอัตราร้อยละขั้นบันได
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
                    1-30 วัน <b>0%</b> · 31-180 วัน <b>10%</b> · &gt;180 วัน <b>20%</b>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">
                    1. เลือกบ้านเลขที่ที่จะตั้งค่า <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMultiSelectedHouseNos([]);
                      setMultiSearchQuery('');
                      setIsMultiModalOpen(true);
                    }}
                    className="px-3 py-1 bg-[#376B64] hover:bg-[#2A524C] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Users size={13} />
                    เลือกหลายหลังพร้อมกัน (Popup)
                  </button>
                </div>
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
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllOtherHousesPaid}
                    disabled={markingAllPaid}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 size={13} />
                    {markingAllPaid ? 'กำลังตั้งค่า...' : 'ตั้งค่าบ้านทั้งหมดให้เป็น "จ่ายครบแล้ว (฿0)" ในคลิกเดียว'}
                  </button>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    (ช่วยให้ไม่ต้องกดทีละหลังสำหรับบ้านที่จ่ายครบ)
                  </span>
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

                  {/* กล่องสร้างงวดค้างชำระตามช่วงเวลาอัตโนมัติ (เช่น ก.ย. 64 ถึง ธ.ค. 69) */}
                </div>

                <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-[#376B64]" />
                      <span className="font-black text-sm text-slate-800">
                        สร้างงวดค้างชำระตามช่วงเวลาอัตโนมัติ
                      </span>
                    </div>
                    {/* ปุ่มลัดช่วงเวลายอดนิยม */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400">ปุ่มลัด:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRangeStartYear(2021);
                          setRangeStartMonth(9);
                          setRangeEndYear(2026);
                          setRangeEndMonth(12);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-[#376B64] border border-[#376B64]/30 rounded-lg text-xs font-black transition-all shadow-sm"
                      >
                        ก.ย. 64 – ธ.ค. 69
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRangeStartYear(2024);
                          setRangeStartMonth(1);
                          setRangeEndYear(2024);
                          setRangeEndMonth(12);
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        ปี 67
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRangeStartYear(2025);
                          setRangeStartMonth(1);
                          setRangeEndYear(2025);
                          setRangeEndMonth(12);
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        ปี 68
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRangeStartYear(2026);
                          setRangeStartMonth(1);
                          setRangeEndYear(2026);
                          setRangeEndMonth(12);
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        ปี 69
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-center">
                    {/* ตั้งแต่ */}
                    <div className="sm:col-span-2 flex gap-1.5 items-center">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">ตั้งแต่:</span>
                      <select
                        value={rangeStartMonth}
                        onChange={(e) => setRangeStartMonth(Number(e.target.value))}
                        className="flex-1 border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-bold text-slate-800 shadow-sm"
                      >
                        {THAI_MONTHS.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>{idx + 1}. {m}</option>
                        ))}
                      </select>
                      <select
                        value={rangeStartYear}
                        onChange={(e) => setRangeStartYear(Number(e.target.value))}
                        className="flex-1 border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-bold text-slate-800 shadow-sm"
                      >
                        {AVAILABLE_YEARS.map((y) => (
                          <option key={y} value={y}>{y + 543}</option>
                        ))}
                      </select>
                    </div>

                    {/* ถึง */}
                    <div className="sm:col-span-2 flex gap-1.5 items-center">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">ถึง:</span>
                      <select
                        value={rangeEndMonth}
                        onChange={(e) => setRangeEndMonth(Number(e.target.value))}
                        className="flex-1 border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-bold text-slate-800 shadow-sm"
                      >
                        {THAI_MONTHS.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>{idx + 1}. {m}</option>
                        ))}
                      </select>
                      <select
                        value={rangeEndYear}
                        onChange={(e) => setRangeEndYear(Number(e.target.value))}
                        className="flex-1 border border-slate-200 rounded-xl p-2.5 bg-white text-xs font-bold text-slate-800 shadow-sm"
                      >
                        {AVAILABLE_YEARS.map((y) => (
                          <option key={y} value={y}>{y + 543}</option>
                        ))}
                      </select>
                    </div>

                    {/* ปุ่มกดสร้าง */}
                    <div className="sm:col-span-1">
                      <button
                        type="button"
                        onClick={handleGenerateDateRange}
                        className="w-full py-2.5 px-3 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Sparkles size={14} /> สร้าง ({totalMonthsInRange} งวด)
                      </button>
                    </div>
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
                            {AVAILABLE_YEARS.map((y) => (
                              <option key={y} value={y}>
                                {y} (พ.ศ. {y + 543})
                              </option>
                            ))}
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <label className="block text-sm font-bold text-slate-700">
                วางข้อความรายการหนี้ (คัดลอกจาก Excel หรือพิมพ์แบบช่วงเวลาได้)
              </label>
              <span className="text-[11px] font-bold text-[#376B64]">
                รองรับ พ.ศ., Tab จาก Excel และช่วงเวลา เช่น 9/2564, 12/2569
              </span>
            </div>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`ตัวอย่างการพิมพ์ (คัดลอกจาก Excel มาวางได้เลย):\n101/1                         (บ้านนี้จ่ายครบแล้ว)\n101/2, 9/2564, 12/2569, 500   (ค้าง ก.ย. 64 ถึง ธ.ค. 69 เดือนละ 500)\n101/3, 1/2567, 12/2567, 450   (ค้างปี 67 ทั้งปี เดือนละ 450)\n101/4, 2568, 10, 500          (ค้าง ต.ค. 2568 เดือนเดียว)`}
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

      {/* ============================================================== */}
      {/* POPUP MODAL: เลือกบ้านหลายหลังพร้อมกัน (Batch Multi-House)       */}
      {/* ============================================================== */}
      {mounted && isMultiModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setIsMultiModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-[#376B64]/10 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#376B64] text-white rounded-xl shadow-md">
                  <Users size={20} />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800">
                    กำหนดงวดค้างชำระหลายบ้านพร้อมกัน (Batch Multi-House)
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    เลือกบ้านที่มีเงื่อนไขหรือช่วงเวลาค้างชำระเหมือนกัน แล้วบันทึกครั้งเดียว
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* ส่วนที่ 1: เลือกบ้าน */}
              <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">
                      1. เลือกบ้านที่ต้องการบันทึก
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#376B64]/10 text-[#376B64] text-xs font-black rounded-full">
                      เลือกแล้ว {multiSelectedHouseNos.length} / {houses.length} หลัง
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllHousesForMulti}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      <CheckSquare size={13} className="text-[#376B64]" /> เลือกทั้งหมด ({filteredHousesForMulti.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllHousesForMulti}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-bold transition-all"
                    >
                      ล้างการเลือก
                    </button>
                  </div>
                </div>

                {/* กล่องค้นหาบ้าน */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={multiSearchQuery}
                    onChange={(e) => setMultiSearchQuery(e.target.value)}
                    placeholder="ค้นหาเลขที่บ้าน เช่น 101/ หรือ 99..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#376B64]/40 outline-none shadow-sm"
                  />
                  {multiSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMultiSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* รายการ Checkbox บ้านแบบ Grid */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredHousesForMulti.map((h) => {
                    const isChecked = multiSelectedHouseNos.includes(h.houseNo);
                    return (
                      <button
                        key={h.id || h.houseNo}
                        type="button"
                        onClick={() => handleToggleHouseForMulti(h.houseNo)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                          isChecked
                            ? 'border-[#376B64] bg-[#376B64]/10 shadow-sm'
                            : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-[#376B64] text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check size={11} />}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-black text-xs text-slate-800 truncate">
                            {h.houseNo}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate">
                            ฿{Number(h.feeRate || 0).toLocaleString()}/ด.
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredHousesForMulti.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 font-bold">
                      ไม่พบข้อมูลบ้านที่ตรงกับคำค้นหา
                    </div>
                  )}
                </div>
              </div>

              {/* ส่วนที่ 2: ระบุสถานะและงวดค้างชำระ */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 space-y-4">
                <span className="font-bold text-sm text-slate-800 block">
                  2. ระบุสถานะและช่วงเวลาที่ค้างชำระ (มีผลกับบ้านที่เลือกทั้งหมด)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMultiIsPaidFull(true)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      multiIsPaidFull
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        multiIsPaidFull ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {multiIsPaidFull && <Check size={12} />}
                    </div>
                    <div>
                      <span className="block font-black text-xs text-slate-800">
                        ชำระครบถ้วน (ไม่มียอดหนี้ ฿0.00)
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        ตั้งค่ายอดหนี้ยกมาเป็น ฿0.00 สำหรับทุกบ้านที่เลือก
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMultiIsPaidFull(false)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      !multiIsPaidFull
                        ? 'border-[#376B64] bg-[#376B64]/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        !multiIsPaidFull ? 'bg-[#376B64] text-white' : 'border border-slate-300'
                      }`}
                    >
                      {!multiIsPaidFull && <Check size={12} />}
                    </div>
                    <div>
                      <span className="block font-black text-xs text-slate-800">
                        มียอดค้างชำระย้อนหลัง
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        กำหนดช่วงเดือนที่ค้างชำระให้เหมือนกัน
                      </span>
                    </div>
                  </button>
                </div>

                {/* ฟอร์มระบุช่วงเวลา (แสดงเมื่อมียอดค้าง) */}
                {!multiIsPaidFull && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <Calendar size={15} className="text-[#376B64]" /> ช่วงเดือนที่ค้างชำระ:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400">ปุ่มลัด:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiStartYear(2021);
                            setMultiStartMonth(9);
                            setMultiEndYear(2026);
                            setMultiEndMonth(12);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-[#376B64] border border-[#376B64]/30 rounded-md text-[11px] font-black"
                        >
                          ก.ย. 64 – ธ.ค. 69
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiStartYear(2024);
                            setMultiStartMonth(1);
                            setMultiEndYear(2024);
                            setMultiEndMonth(12);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-bold"
                        >
                          ปี 67
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiStartYear(2025);
                            setMultiStartMonth(1);
                            setMultiEndYear(2025);
                            setMultiEndMonth(12);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-bold"
                        >
                          ปี 68
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiStartYear(2026);
                            setMultiStartMonth(1);
                            setMultiEndYear(2026);
                            setMultiEndMonth(12);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-bold"
                        >
                          ปี 69
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="flex gap-1.5 items-center">
                        <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">ตั้งแต่:</span>
                        <select
                          value={multiStartMonth}
                          onChange={(e) => setMultiStartMonth(Number(e.target.value))}
                          className="flex-1 border border-slate-200 rounded-xl p-2 bg-white text-xs font-bold"
                        >
                          {THAI_MONTHS.map((m, idx) => (
                            <option key={idx + 1} value={idx + 1}>{idx + 1}. {m}</option>
                          ))}
                        </select>
                        <select
                          value={multiStartYear}
                          onChange={(e) => setMultiStartYear(Number(e.target.value))}
                          className="flex-1 border border-slate-200 rounded-xl p-2 bg-white text-xs font-bold"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>{y + 543}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-1.5 items-center">
                        <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">ถึง:</span>
                        <select
                          value={multiEndMonth}
                          onChange={(e) => setMultiEndMonth(Number(e.target.value))}
                          className="flex-1 border border-slate-200 rounded-xl p-2 bg-white text-xs font-bold"
                        >
                          {THAI_MONTHS.map((m, idx) => (
                            <option key={idx + 1} value={idx + 1}>{idx + 1}. {m}</option>
                          ))}
                        </select>
                        <select
                          value={multiEndYear}
                          onChange={(e) => setMultiEndYear(Number(e.target.value))}
                          className="flex-1 border border-slate-200 rounded-xl p-2 bg-white text-xs font-bold"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>{y + 543}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* การคิดเงินต้น */}
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-xs font-black text-slate-700 block mb-2">
                        อัตราเงินต้นต่อเดือน:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                          <input
                            type="radio"
                            name="multiFeeMode"
                            checked={multiFeeMode === 'house_rate'}
                            onChange={() => setMultiFeeMode('house_rate')}
                            className="accent-[#376B64]"
                          />
                          <span className="text-xs font-bold text-slate-700">
                            ใช้อัตราค่าส่วนกลางของแต่ละบ้านตามระบบ (แนะนำ)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                          <input
                            type="radio"
                            name="multiFeeMode"
                            checked={multiFeeMode === 'custom'}
                            onChange={() => setMultiFeeMode('custom')}
                            className="accent-[#376B64]"
                          />
                          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            กำหนดยอดคงที่เท่ากันทุกหลัง:
                          </span>
                          {multiFeeMode === 'custom' && (
                            <input
                              type="number"
                              value={multiCustomAmount}
                              onChange={(e) => setMultiCustomAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="500"
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs font-black text-center"
                            />
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">
                พร้อมบันทึก: <b className="text-[#376B64]">{multiSelectedHouseNos.length} หลัง</b>
                {!multiIsPaidFull && <span> (ค้างชำระ {multiTotalMonths} งวด/หลัง)</span>}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsMultiModalOpen(false)}
                  disabled={submittingMulti}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSubmitMultiHouses}
                  disabled={submittingMulti || multiSelectedHouseNos.length === 0}
                  className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                    submittingMulti || multiSelectedHouseNos.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-[#376B64] hover:bg-[#2A524C]'
                  }`}
                >
                  <Sparkles size={14} />
                  {submittingMulti ? 'กำลังบันทึก...' : `บันทึกทั้ง ${multiSelectedHouseNos.length} หลังพร้อมกัน`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
