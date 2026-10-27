'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Clock,
  RefreshCw,
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
  const [multiIsAdvance, setMultiIsAdvance] = useState<boolean>(false);
  const [multiAdvanceUntilYear, setMultiAdvanceUntilYear] = useState<number>(2026);
  const [multiAdvanceUntilMonth, setMultiAdvanceUntilMonth] = useState<number>(12);
  const [multiStartYear, setMultiStartYear] = useState<number>(2021);
  const [multiStartMonth, setMultiStartMonth] = useState<number>(9);
  const [multiEndYear, setMultiEndYear] = useState<number>(2026);
  const [multiEndMonth, setMultiEndMonth] = useState<number>(12);
  const [multiFeeMode, setMultiFeeMode] = useState<'house_rate' | 'custom'>('house_rate');
  const [multiCustomAmount, setMultiCustomAmount] = useState<number | ''>(500);
  const [submittingMulti, setSubmittingMulti] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // ----------------------------------------------------
  // History & Summary State (ประวัติการตั้งค่ายอดยกมา)
  // ----------------------------------------------------
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<{
    totalHouses?: number;
    totalHousesWithDebt: number;
    fullyPaidHousesCount?: number;
    totalInvoices: number;
    totalPrincipal: number;
    totalPenalty: number;
    grandTotal: number;
    paidInvoicesCount?: number;
    totalPaidAmount?: number;
    paidInitCount?: number;
    paidInitAmount?: number;
  } | null>(null);
  const [resettingAll, setResettingAll] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/admin/initial-balance');
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.history || []);
        setHistorySummary(data.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch initial balance history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, [fetchHistory]);

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

  // คำนวณเดือนและปีของวันตัดยอด (Cut-off Month/Year)
  const [cutoffYear, cutoffMonth] = useMemo(() => {
    if (cutoffDate) {
      const parts = cutoffDate.split('-');
      if (parts.length >= 2) {
        return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
      }
    }
    const d = new Date();
    return [d.getFullYear(), d.getMonth() + 1];
  }, [cutoffDate]);

  // จำนวนเดือนทั้งหมดใน Modal
  const multiTotalMonths = useMemo(() => {
    const start = multiStartYear * 12 + multiStartMonth;
    const end = multiEndYear * 12 + multiEndMonth;
    return Math.max(0, end - start + 1);
  }, [multiStartYear, multiStartMonth, multiEndYear, multiEndMonth]);

  // จำนวนเดือนล่วงหน้าใน Modal (เริ่มจากเดือนถัดไปของวันตัดยอด)
  const multiAdvanceMonthsCount = useMemo(() => {
    let startY = cutoffYear;
    let startM = cutoffMonth + 1;
    if (startM > 12) {
      startY += 1;
      startM = 1;
    }
    const startTotal = startY * 12 + startM;
    const endTotal = multiAdvanceUntilYear * 12 + multiAdvanceUntilMonth;
    return Math.max(0, endTotal - startTotal + 1);
  }, [cutoffYear, cutoffMonth, multiAdvanceUntilYear, multiAdvanceUntilMonth]);

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
  const [isAdvancePaid, setIsAdvancePaid] = useState<boolean>(false);
  const [advanceUntilYear, setAdvanceUntilYear] = useState<number>(2026);
  const [advanceUntilMonth, setAdvanceUntilMonth] = useState<number>(12);
  const [advanceMonthlyRate, setAdvanceMonthlyRate] = useState<number | ''>('');
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [savingSingle, setSavingSingle] = useState(false);

  // ข้อมูลบ้านที่เลือก
  const currentHouse = useMemo(() => {
    return houses.find((h) => h.houseNo === selectedHouseNo);
  }, [houses, selectedHouseNo]);

  // ซิงค์อัตราล่วงหน้าเริ่มต้นกับอัตราค่าส่วนกลางของบ้าน
  useEffect(() => {
    if (currentHouse && advanceMonthlyRate === '') {
      setAdvanceMonthlyRate(Number(currentHouse.feeRate) || 500);
    }
  }, [currentHouse, advanceMonthlyRate]);

  // ซิงค์ค่างวดล่วงหน้าเริ่มต้นให้อยู่หลังวันตัดยอด
  useEffect(() => {
    let nextY = cutoffYear;
    let nextM = cutoffMonth + 2;
    while (nextM > 12) {
      nextY += 1;
      nextM -= 12;
    }
    setAdvanceUntilYear(nextY);
    setAdvanceUntilMonth(nextM);
  }, [cutoffYear, cutoffMonth]);

  // คำนวณรายการงวดล่วงหน้า (Advance Periods List)
  const advancePeriodsList = useMemo(() => {
    if (!isAdvancePaid) return [];
    let startY = cutoffYear;
    let startM = cutoffMonth + 1;
    if (startM > 12) {
      startY += 1;
      startM = 1;
    }

    const startTotal = startY * 12 + startM;
    const endTotal = advanceUntilYear * 12 + advanceUntilMonth;

    if (startTotal > endTotal) return [];

    const rate = advanceMonthlyRate !== '' ? Number(advanceMonthlyRate) : (Number(currentHouse?.feeRate) || 500);
    const cleanHouse = selectedHouseNo ? selectedHouseNo.replace(/[^a-zA-Z0-9]/g, '-') : '';
    const list: Array<{
      billingYear: number;
      billingMonth: number;
      amount: number;
      dueDate: string;
      invoiceNo: string;
    }> = [];

    for (let cur = startTotal; cur <= endTotal; cur++) {
      const y = Math.floor((cur - 1) / 12);
      const m = ((cur - 1) % 12) + 1;
      const padMonth = String(m).padStart(2, '0');
      list.push({
        billingYear: y,
        billingMonth: m,
        amount: rate,
        dueDate: `${y}-${padMonth}-07`,
        invoiceNo: `ADV-${cleanHouse}-${padMonth}${y}`,
      });
    }

    return list;
  }, [isAdvancePaid, cutoffYear, cutoffMonth, advanceUntilYear, advanceUntilMonth, advanceMonthlyRate, currentHouse, selectedHouseNo]);

  const totalAdvanceAmount = useMemo(() => {
    return advancePeriodsList.reduce((sum, p) => sum + p.amount, 0);
  }, [advancePeriodsList]);

  // ปุ่มลัดเพิ่มจำนวนเดือนล่วงหน้า
  const handleSetAdvanceMonthsAhead = (count: number) => {
    const targetTotal = cutoffYear * 12 + cutoffMonth + count;
    const y = Math.floor((targetTotal - 1) / 12);
    const m = ((targetTotal - 1) % 12) + 1;
    setAdvanceUntilYear(y);
    setAdvanceUntilMonth(m);
  };

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
      // ถ้างวดว่าง ให้สร้างงวดเริ่มต้น 1 งวด (เฉพาะเมื่อไม่ได้เลือกจ่ายครบ และไม่ได้เลือกจ่ายล่วงหน้า)
      if (periods.length === 0 && !isPaidFull && !isAdvancePaid) {
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
  }, [selectedHouseNo, currentHouse, isPaidFull, isAdvancePaid, currentYear, periods.length]);

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
        fetchHistory();
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
    if (!multiIsPaidFull && !multiIsAdvance && startTotal > endTotal) {
      Swal.fire({
        icon: 'warning',
        title: 'ช่วงเวลาไม่ถูกต้อง',
        text: 'เดือน/ปีเริ่มต้น ต้องมาก่อนหรือเท่ากับเดือน/ปีสิ้นสุด',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    // กรณีเลือกชำระล่วงหน้าใน Modal
    if (multiIsAdvance) {
      let startY = cutoffYear;
      let startM = cutoffMonth + 1;
      if (startM > 12) {
        startY += 1;
        startM = 1;
      }
      const advStartTotal = startY * 12 + startM;
      const advEndTotal = multiAdvanceUntilYear * 12 + multiAdvanceUntilMonth;
      if (advStartTotal > advEndTotal) {
        Swal.fire({
          icon: 'warning',
          title: 'ช่วงเวลาล่วงหน้าไม่ถูกต้อง',
          text: 'เดือน/ปีสิ้นสุด ต้องอยู่หลังเดือนตัดยอดอย่างน้อย 1 เดือน',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
        return;
      }

      const advMonthsCount = advEndTotal - advStartTotal + 1;
      const firstM = ((advStartTotal - 1) % 12) + 1;
      const firstY = Math.floor((advStartTotal - 1) / 12);
      const startText = `${THAI_MONTHS[firstM - 1]} ${firstY + 543}`;
      const endText = `${THAI_MONTHS[multiAdvanceUntilMonth - 1]} ${multiAdvanceUntilYear + 543}`;

      const confirmHtml = `
        ต้องการบันทึกสถานะ <b>"ชำระล่วงหน้า"</b> จำนวน <b>${advMonthsCount} งวด</b><br/>
        (ตั้งแต่ <b>${startText}</b> ถึง <b>${endText}</b>)<br/>
        ให้กับบ้านที่เลือกทั้งหมด <b>${multiSelectedHouseNos.length} หลัง</b> ใช่หรือไม่?<br/>
        <span class="text-xs text-slate-500">*ระบบจะสร้างบิลสถานะ PAID ให้อัตโนมัติ</span>
      `;

      const result = await Swal.fire({
        ...defaultSwalConfig,
        title: `ยืนยันบันทึกชำระล่วงหน้า ${multiSelectedHouseNos.length} หลังพร้อมกัน?`,
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
        const advList: Array<{ year: number; month: number }> = [];
        for (let cur = advStartTotal; cur <= advEndTotal; cur++) {
          const y = Math.floor((cur - 1) / 12);
          const m = ((cur - 1) % 12) + 1;
          advList.push({ year: y, month: m });
        }

        const itemsPayload: HouseMigrationInput[] = multiSelectedHouseNos.map((hNo) => {
          const houseObj = houses.find((h) => h.houseNo === hNo);
          const defaultHouseRate = Number(houseObj?.feeRate) || 500;
          const rate = multiFeeMode === 'custom' ? Number(multiCustomAmount) || defaultHouseRate : defaultHouseRate;

          return {
            houseNo: hNo,
            unpaidPeriods: [],
            advancePeriods: advList.map((p) => ({
              billingYear: p.year,
              billingMonth: p.month,
              amount: rate,
            })),
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
          setIsMultiModalOpen(false);
          setMultiSelectedHouseNos([]);
          onRefreshHouses?.();
          fetchHistory();
          await Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ!',
            html: `บันทึกข้อมูลชำระล่วงหน้าบ้านที่เลือกทั้ง <b>${multiSelectedHouseNos.length} หลัง</b> เรียบร้อยแล้ว`,
            confirmButtonColor: '#376B64',
            customClass: { popup: 'rounded-[2rem]' },
          });
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
        setIsMultiModalOpen(false);
        setMultiSelectedHouseNos([]);
        onRefreshHouses?.();
        fetchHistory();
        await Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          html: `บันทึกข้อมูลบ้านที่เลือกทั้ง <b>${multiSelectedHouseNos.length} หลัง</b> เรียบร้อยแล้ว`,
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
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

  // 🌟 ฟังก์ชันรีเซ็ตข้อมูลยอดยกมาทั้งหมด (ลบบิล INIT- และประวัติทั้งหมด)
  const handleResetAllInitialBalances = async () => {
    const result = await Swal.fire({
      ...defaultSwalConfig,
      title: 'ยืนยันรีเซ็ตข้อมูลยอดยกมาทั้งหมด?',
      html: `
        <div class="text-left text-xs text-slate-600 leading-relaxed space-y-2">
          <p>ระบบจะทำการล้างข้อมูลยอดยกมาตั้งต้นทั้งหมดในระบบ ได้แก่:</p>
          <ul class="list-disc list-inside space-y-1 font-semibold text-slate-700">
            <li>บิลยอดยกมา (INIT-) ทั้งหมดในฐานข้อมูล</li>
            <li>ประวัติการตั้งค่ายอดยกมา (History Log) ทั้งหมด</li>
          </ul>
          <div class="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>ข้อมูลที่ถูกรีเซ็ตจะไม่สามารถกู้คืนได้ และจะคืนสถานะให้สามารถบันทึกใหม่ได้</span>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันรีเซ็ตทั้งหมด',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#e11d48',
      customClass: { popup: 'rounded-[2rem]' },
    });

    if (!result.isConfirmed) return;

    setResettingAll(true);
    Swal.fire({
      title: 'กำลังรีเซ็ตข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-[2rem]' },
    });

    try {
      const res = await fetch('/api/admin/initial-balance', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'รีเซ็ตข้อมูลสำเร็จ!',
          text: data.message || 'ระบบได้ล้างข้อมูลยอดยกมาทั้งหมดเรียบร้อยแล้ว',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
        onRefreshHouses?.();
        fetchHistory();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถรีเซ็ตข้อมูลได้',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' },
      });
    } finally {
      setResettingAll(false);
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

    // กรณีเลือกชำระล่วงหน้า (Advance Payment)
    if (isAdvancePaid) {
      if (advancePeriodsList.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'ช่วงเวลาล่วงหน้าไม่ถูกต้อง',
          text: 'งวดสิ้นสุดต้องอยู่หลังเดือนตัดยอดอย่างน้อย 1 เดือน (เริ่มคิดตั้งแต่เดือนถัดไปของวันตัดยอด)',
          confirmButtonColor: '#376B64',
          customClass: { popup: 'rounded-[2rem]' },
        });
        return;
      }

      const firstPeriod = advancePeriodsList[0];
      const lastPeriod = advancePeriodsList[advancePeriodsList.length - 1];
      const startText = `${THAI_MONTHS[firstPeriod.billingMonth - 1]} ${firstPeriod.billingYear + 543}`;
      const endText = `${THAI_MONTHS[lastPeriod.billingMonth - 1]} ${lastPeriod.billingYear + 543}`;

      const confirmHtml = `
        ต้องการบันทึกสถานะ <b>"ชำระล่วงหน้า"</b> สำหรับบ้านเลขที่ <b>${selectedHouseNo}</b><br/>
        ช่วงเวลา: <b>${startText}</b> ถึง <b>${endText}</b><br/>
        จำนวน: <b>${advancePeriodsList.length} งวด</b> (อัตราเดือนละ ฿${(Number(advanceMonthlyRate) || Number(currentHouse?.feeRate) || 500).toLocaleString()})<br/>
        <div class="mt-2 text-base font-black text-teal-700">รวมยอดชำระล่วงหน้าทั้งสิ้น: ฿${totalAdvanceAmount.toLocaleString()}</div>
        <div class="mt-2 text-xs text-slate-500">*ระบบจะสร้างบิลสถานะ PAID ให้อัตโนมัติ เพื่อป้องกัน Cron สร้างบิลซ้ำ และแสดงใน LINE ว่าชำระถึง ${endText}</div>
      `;

      const result = await Swal.fire({
        ...defaultSwalConfig,
        title: 'ยืนยันบันทึกยอดชำระล่วงหน้า?',
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
        const res = await fetch('/api/admin/initial-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm',
            cutoffDate,
            penaltyCalcMode: 'NO_PENALTY',
            flatPenaltyPerMonth: 0,
            items: [
              {
                houseNo: selectedHouseNo,
                unpaidPeriods: [],
                advancePeriods: advancePeriodsList.map((p) => ({
                  billingYear: p.billingYear,
                  billingMonth: p.billingMonth,
                  amount: p.amount,
                })),
              },
            ],
          }),
        });

        const json = await res.json();
        if (json.success) {
          await Swal.fire({
            icon: 'success',
            title: 'บันทึกยอดชำระล่วงหน้าสำเร็จ!',
            html: `บันทึกข้อมูลชำระล่วงหน้าบ้านเลขที่ <b>${selectedHouseNo}</b> จำนวน <b>${advancePeriodsList.length} งวด</b> เรียบร้อยแล้ว`,
            confirmButtonColor: '#376B64',
            customClass: { popup: 'rounded-[2rem]' },
          });

          onRefreshHouses?.();
          fetchHistory();
          setPeriods([]);
          setIsPaidFull(false);
          setIsAdvancePaid(false);
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
      return;
    }

    if (!isPaidFull && periods.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่มีงวดค้างชำระ',
        text: 'หากบ้านหลังนี้ไม่มีหนี้ค้าง กรุณากดเลือก "จ่ายครบแล้ว" หรือ "ชำระล่วงหน้า" หรือเพิ่มงวดค้างชำระ',
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
        fetchHistory();
        // เคลียร์ฟอร์ม
        setPeriods([]);
        setIsPaidFull(false);
        setIsAdvancePaid(false);
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
        fetchHistory();
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
        <div className="flex flex-col gap-5 mb-6 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg shrink-0">
                <History size={20} />
              </span>
              <span>ตั้งค่ายอดลูกหนี้ค้างชำระยกมา (Initial Balance Setup)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              นำเข้ายอดค้างชำระย้อนหลัง (ตั้งแต่ ก.ย. 2564 ถึง ธ.ค. 2569) หรือระบุบ้านที่จ่ายครบแล้ว พร้อมคำนวณหรือยกเว้นเบี้ยปรับแยกรายแปลงอย่างปลอดภัย
            </p>
          </div>

          {/* Mode Switcher Tabs & Multi-House Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            {/* View Mode Tabs: Single vs Batch */}
            <div className="inline-flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'single'
                    ? 'bg-white text-[#376B64] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home size={15} className="text-[#376B64]" /> กำหนดรายหลัง (แนะนำ)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('batch')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'batch'
                    ? 'bg-white text-[#376B64] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet size={15} className="text-[#376B64]" /> นำเข้าข้อมูลชุด (CSV)
              </button>
            </div>

            {/* Quick Action Button: เลือกหลายหลังพร้อมกัน (Popup) */}
            <button
              type="button"
              onClick={() => {
                setMultiSelectedHouseNos([]);
                setMultiSearchQuery('');
                setIsMultiModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 bg-[#376B64] hover:bg-[#2A524C] text-white shadow-md active:scale-95 shrink-0"
            >
              <Users size={16} />
              เลือกหลายหลังพร้อมกัน (Popup)
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
                      setIsAdvancePaid(false);
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
                      setIsAdvancePaid(false);
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* ตัวเลือก 1: ชำระครบถ้วนพอดี */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidFull(true);
                      setIsAdvancePaid(false);
                      setPeriods([]);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      isPaidFull && !isAdvancePaid
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isPaidFull && !isAdvancePaid ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isPaidFull && !isAdvancePaid && <Check size={14} />}
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 font-black text-sm text-slate-800">
                        <CheckCircle2 size={16} className="text-emerald-600" /> ชำระครบถ้วนพอดี
                      </span>
                      <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                        จ่ายครบถึงรอบบิลปัจจุบัน ({THAI_MONTHS[cutoffMonth - 1]} {cutoffYear + 543}) ไม่มียอดหนี้ค้าง ฿0.00
                      </span>
                    </div>
                  </button>

                  {/* ตัวเลือก 2: ชำระล่วงหน้า / จ่ายเกินรอบบิล */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdvancePaid(true);
                      setIsPaidFull(false);
                      setPeriods([]);
                      if (advanceMonthlyRate === '' && currentHouse) {
                        setAdvanceMonthlyRate(Number(currentHouse.feeRate) || 500);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      isAdvancePaid
                        ? 'border-teal-600 bg-teal-50/80 shadow-sm ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isAdvancePaid ? 'bg-teal-600 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isAdvancePaid && <Check size={14} />}
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 font-black text-sm text-teal-800">
                        <Sparkles size={16} className="text-teal-600" /> ชำระล่วงหน้า / จ่ายเกิน
                      </span>
                      <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                        จ่ายค่าส่วนกลางล่วงหน้าข้ามรอบบิล (เช่น ถึงสิ้นปี หรือปีหน้า)
                      </span>
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold rounded-md">
                        สร้างบิล PAID อัตโนมัติ
                      </span>
                    </div>
                  </button>

                  {/* ตัวเลือก 3: มียอดค้างชำระย้อนหลัง */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidFull(false);
                      setIsAdvancePaid(false);
                      if (periods.length === 0) handleAddPeriod();
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      !isPaidFull && !isAdvancePaid
                        ? 'border-[#376B64] bg-[#376B64]/5 shadow-sm ring-2 ring-[#376B64]/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        !isPaidFull && !isAdvancePaid ? 'bg-[#376B64] text-white' : 'border border-slate-300'
                      }`}
                    >
                      {!isPaidFull && !isAdvancePaid && <Check size={14} />}
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 font-black text-sm text-slate-800">
                        <AlertTriangle size={16} className="text-[#376B64]" /> มียอดค้างชำระย้อนหลัง
                      </span>
                      <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                        ระบุงวดที่ค้างและเลือกวิธีคิดเบี้ยปรับแต่ละงวดได้
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* แบนเนอร์กรณีชำระครบถ้วนพอดี */}
            {selectedHouseNo && isPaidFull && !isAdvancePaid && (
              <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-emerald-900">
                    บ้านเลขที่ {selectedHouseNo} ชำระครบถ้วนพอดีถึงรอบบิลปัจจุบัน ({THAI_MONTHS[cutoffMonth - 1]} {cutoffYear + 543})
                  </h4>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    ไม่มียอดหนี้ค้างชำระยกมา (฿0.00) พร้อมเริ่มรอบบิลใหม่ในเดือนถัดไปได้ทันที
                  </p>
                </div>
              </div>
            )}

            {/* Step 3 (กรณีชำระล่วงหน้า): แผงกำหนดงวดล่วงหน้าและพรีวิว */}
            {selectedHouseNo && isAdvancePaid && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Sparkles size={18} className="text-teal-600" />
                      3. กำหนดรอบบิลที่ชำระล่วงหน้า (Advance Periods)
                    </h3>
                    <span className="text-xs text-slate-500">
                      ตัดรอบปัจจุบัน ณ วันที่: <b>{cutoffDate}</b> ({THAI_MONTHS[cutoffMonth - 1]} {cutoffYear + 543}) · งวดล่วงหน้าเริ่มจากเดือนถัดไป (<b>{THAI_MONTHS[(cutoffMonth % 12)]} {cutoffMonth === 12 ? cutoffYear + 544 : cutoffYear + 543}</b>)
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 font-black text-xs rounded-xl self-start sm:self-auto">
                    รวม {advancePeriodsList.length} งวด (฿{totalAdvanceAmount.toLocaleString()})
                  </span>
                </div>

                {/* แผงควบคุมกำหนดเดือนสิ้นสุดและอัตราค่าส่วนกลาง */}
                <div className="p-5 bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-slate-50 border border-teal-200 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                      <Calendar size={15} className="text-teal-600" />
                      ระบุงวดสิ้นสุดที่ชำระล่วงหน้าถึง:
                    </span>
                    {/* ปุ่มลัดช่วงเวลายอดนิยม */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">ปุ่มลัด:</span>
                      <button
                        type="button"
                        onClick={() => handleSetAdvanceMonthsAhead(1)}
                        className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        +1 เดือน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAdvanceMonthsAhead(2)}
                        className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        +2 เดือน (ถึงสิ้นปี 69)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAdvanceMonthsAhead(3)}
                        className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        +3 เดือน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAdvanceMonthsAhead(6)}
                        className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        +6 เดือน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAdvanceMonthsAhead(12)}
                        className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        +12 เดือน (1 ปี)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdvanceUntilYear(2027);
                          setAdvanceUntilMonth(12);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        ถึงสิ้นปี 2570
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* เดือนสิ้นสุด */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        เดือนสิ้นสุดที่จ่ายล่วงหน้าถึง <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={advanceUntilMonth}
                        onChange={(e) => setAdvanceUntilMonth(Number(e.target.value))}
                        className="w-full border border-teal-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 outline-none"
                      >
                        {THAI_MONTHS.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {idx + 1}. {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ปีสิ้นสุด */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ปีสิ้นสุด (พ.ศ.) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={advanceUntilYear}
                        onChange={(e) => setAdvanceUntilYear(Number(e.target.value))}
                        className="w-full border border-teal-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 outline-none"
                      >
                        {AVAILABLE_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y + 543} ({y})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* อัตราค่าส่วนกลางต่อเดือน */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        อัตราค่าส่วนกลางต่องวด (บาท) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={advanceMonthlyRate}
                        onChange={(e) => setAdvanceMonthlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={String(Number(currentHouse?.feeRate) || 500)}
                        className="w-full border border-teal-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 outline-none"
                      />
                    </div>
                  </div>

                  {/* พรีวิวรายการงวดล่วงหน้าที่จะถูกสร้าง */}
                  <div className="pt-3 border-t border-teal-200/60">
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      รายการงวดบิลชำระล่วงหน้าที่จะถูกสร้างอัตโนมัติ (สถานะ: ชำระแล้ว PAID):
                    </span>
                    {advancePeriodsList.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {advancePeriodsList.map((p, pIdx) => (
                          <div
                            key={p.invoiceNo}
                            className="p-2.5 bg-white border border-teal-200 rounded-xl shadow-xs text-center space-y-0.5"
                          >
                            <span className="block text-[10px] font-bold text-teal-700">
                              งวด #{pIdx + 1}
                            </span>
                            <span className="block text-xs font-black text-slate-800">
                              {THAI_MONTHS[p.billingMonth - 1]} {p.billingYear + 543}
                            </span>
                            <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              ฿{p.amount.toLocaleString()} (PAID)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                        ⚠️ งวดสิ้นสุดที่เลือกต้องอยู่หลังเดือนตัดยอด ({THAI_MONTHS[cutoffMonth - 1]} {cutoffYear + 543}) กรุณาเลือกเดือน/ปีสิ้นสุดใหม่
                      </div>
                    )}
                  </div>

                  {/* ข้อมูลอธิบายการทำงาน */}
                  <div className="p-3 bg-white/80 rounded-xl border border-teal-200/60 text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-teal-900 flex items-center gap-1.5">
                      <Info size={14} className="text-teal-600 shrink-0" />
                      ระบบจะสร้างบิลรหัส ADV (สถานะ PAID) ให้อัตโนมัติ:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                      <li><b>ระบบ Cron บิลประจำเดือน:</b> จะตรวจพบว่าเดือนดังกล่าวมีบิล PAID แล้ว จึงข้ามการสร้างบิลซ้ำโดยอัตโนมัติ</li>
                      <li><b>การแจ้งเตือนและตรวจสอบใน LINE:</b> ลูกบ้านจะเห็นว่าชำระครบถ้วนจนถึงเดือน {THAI_MONTHS[advanceUntilMonth - 1]} {advanceUntilYear + 543}</li>
                      <li><b>รายงานสรุป:</b> ยอดที่ชำระล่วงหน้าจะถูกนับรวมใน &quot;ยอดชำระแล้ว&quot; ของโครงการอย่างถูกต้อง</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 (กรณีมียอดค้างชำระย้อนหลัง): รายการงวดค้างชำระ */}
            {selectedHouseNo && !isPaidFull && !isAdvancePaid && (
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
                      <span className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">ตั้งแต่:</span>
                      <select
                        value={rangeStartMonth}
                        onChange={(e) => setRangeStartMonth(Number(e.target.value))}
                        className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                      >
                        {THAI_MONTHS.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1} className="text-slate-900 bg-white font-bold py-1">
                            {idx + 1}. {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={rangeStartYear}
                        onChange={(e) => setRangeStartYear(Number(e.target.value))}
                        className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                      >
                        {AVAILABLE_YEARS.map((y) => (
                          <option key={y} value={y} className="text-slate-900 bg-white font-bold py-1">
                            {y + 543}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ถึง */}
                    <div className="sm:col-span-2 flex gap-1.5 items-center">
                      <span className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">ถึง:</span>
                      <select
                        value={rangeEndMonth}
                        onChange={(e) => setRangeEndMonth(Number(e.target.value))}
                        className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                      >
                        {THAI_MONTHS.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1} className="text-slate-900 bg-white font-bold py-1">
                            {idx + 1}. {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={rangeEndYear}
                        onChange={(e) => setRangeEndYear(Number(e.target.value))}
                        className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                      >
                        {AVAILABLE_YEARS.map((y) => (
                          <option key={y} value={y} className="text-slate-900 bg-white font-bold py-1">
                            {y + 543}
                          </option>
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
                            className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-black text-xs text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                          >
                            {AVAILABLE_YEARS.map((y) => (
                              <option key={y} value={y} className="text-slate-900 bg-white font-bold py-1">
                                {y} (พ.ศ. {y + 543})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* เดือน */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                            เดือน
                          </label>
                          <select
                            value={row.billingMonth}
                            onChange={(e) =>
                              handleUpdatePeriod(row.id, 'billingMonth', Number(e.target.value))
                            }
                            className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-black text-xs text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                          >
                            {THAI_MONTHS.map((mName, mIdx) => (
                              <option key={mIdx + 1} value={mIdx + 1} className="text-slate-900 bg-white font-bold py-1">
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
                  {isAdvancePaid ? (
                    <div className="mt-1">
                      <span className="text-2xl sm:text-3xl font-black text-teal-700">
                        ฿{totalAdvanceAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-teal-700 ml-2">
                        (ชำระล่วงหน้า {advancePeriodsList.length} งวด · บิล PAID)
                      </span>
                    </div>
                  ) : isPaidFull ? (
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
                      : isAdvancePaid
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-[#376B64] hover:bg-[#2A524C] text-white'
                  }`}
                >
                  <Save size={18} />
                  {savingSingle
                    ? 'กำลังบันทึก...'
                    : isAdvancePaid
                    ? `บันทึกยอดชำระล่วงหน้า (${advancePeriodsList.length} งวด)`
                    : `บันทึกข้อมูลบ้านเลขที่ ${selectedHouseNo}`}
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

        {/* ============================================================== */}
        {/* 📜 ส่วนแสดงประวัติและภาพรวมการตั้งค่ายอดยกมา (History Log & Summary) */}
        {/* ============================================================== */}
        <div className="mt-8 pt-8 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg">
                  <Clock size={18} />
                </span>
                <span>ประวัติและภาพรวมการตั้งค่ายอดยกมา (Setup History & Summary)</span>
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                ตรวจสอบยอดยกมาในระบบ และประวัติการบันทึกการตั้งค่าที่ถูกบันทึกลงฐานข้อมูล
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={fetchHistory}
                disabled={loadingHistory || resettingAll}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <RefreshCw size={13} className={loadingHistory ? 'animate-spin text-[#376B64]' : ''} />
                {loadingHistory ? 'กำลังโหลด...' : 'รีเฟรชประวัติ'}
              </button>

              <button
                type="button"
                onClick={handleResetAllInitialBalances}
                disabled={loadingHistory || resettingAll}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95"
              >
                <Trash2 size={13} className="text-rose-600" />
                {resettingAll ? 'กำลังรีเซ็ต...' : 'รีเซ็ตข้อมูลยอดยกมาทั้งหมด'}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {historySummary && (
            <div className="space-y-4 mb-6">
              {/* 🟢 แถวที่ 1: สรุปข้อมูลที่ชำระครบถ้วน / ได้รับชำระเงินแล้ว (Paid & Settled Status) */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white rounded-2xl border border-emerald-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    สรุปข้อมูลที่ชำระครบถ้วน / ได้รับชำระแล้ว (Paid & Settled)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100/90 text-emerald-800 rounded-full border border-emerald-200/50">
                    ชำระเงินเรียบร้อย
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3.5 bg-white/95 backdrop-blur-sm rounded-xl border border-emerald-100/80 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-700 block">ยอดเงินที่จ่ายครบแล้วรวม</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-900 mt-1 block">
                      ฿{(historySummary.totalPaidAmount ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600/80 mt-0.5 block">
                      ยอดเงินที่ได้รับชำระแล้วทั้งหมดในระบบ
                    </span>
                  </div>

                  <div className="p-3.5 bg-white/95 backdrop-blur-sm rounded-xl border border-teal-100/80 shadow-xs">
                    <span className="text-[11px] font-bold text-teal-700 block">จำนวนงวดที่จ่ายเข้ามาแล้ว</span>
                    <span className="text-xl sm:text-2xl font-black text-teal-900 mt-1 block">
                      {(historySummary.paidInvoicesCount ?? 0).toLocaleString()} <span className="text-xs font-bold text-teal-600">งวด</span>
                    </span>
                    <span className="text-[10px] font-semibold text-teal-600/80 mt-0.5 block">
                      งวดบิลที่สถานะชำระเรียบร้อย (PAID)
                    </span>
                  </div>

                  <div className="p-3.5 bg-white/95 backdrop-blur-sm rounded-xl border border-[#376B64]/20 shadow-xs">
                    <span className="text-[11px] font-bold text-[#376B64] block">บ้านที่ชำระครบถ้วน (ไม่มีหนี้ค้าง)</span>
                    <span className="text-xl sm:text-2xl font-black text-[#2A524C] mt-1 block">
                      {(historySummary.fullyPaidHousesCount ?? 0).toLocaleString()} <span className="text-xs font-bold text-[#376B64]">หลัง</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">
                      จากบ้านทั้งหมด {(historySummary.totalHouses ?? houses.length).toLocaleString()} หลัง
                    </span>
                  </div>
                </div>
              </div>

              {/* 🔴 แถวที่ 2: สรุปยอดหนี้ค้างชำระยกมา (Overdue Debts) */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <AlertCircle size={15} className="text-amber-600" />
                    สรุปยอดหนี้ค้างชำระยกมา (Overdue Debts)
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    รายการหนี้ย้อนหลังที่ยังค้างชำระ
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500 block">บ้านที่มียอดค้างยกมา</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1 block">
                      {historySummary.totalHousesWithDebt.toLocaleString()} <span className="text-xs font-bold text-slate-500">หลัง</span>
                    </span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-50/50 to-white rounded-2xl border border-blue-100 shadow-sm">
                    <span className="text-[11px] font-bold text-blue-600 block">จำนวนงวดค้างชำระรวม</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-900 mt-1 block">
                      {historySummary.totalInvoices.toLocaleString()} <span className="text-xs font-bold text-blue-600">งวด</span>
                    </span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-amber-50/50 to-white rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-[11px] font-bold text-amber-700 block">เงินต้นค้างชำระรวม</span>
                    <span className="text-xl sm:text-2xl font-black text-amber-800 mt-1 block">
                      ฿{historySummary.totalPrincipal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-[#376B64]/10 to-[#376B64]/5 rounded-2xl border border-[#376B64]/20 shadow-sm">
                    <span className="text-[11px] font-bold text-[#376B64] block">ยอดหนี้ยกมารวมทั้งสิ้น</span>
                    <span className="text-xl sm:text-2xl font-black text-[#2A524C] mt-1 block">
                      ฿{historySummary.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black">
                    <th className="py-3 px-4">วัน-เวลาบันทึก</th>
                    <th className="py-3 px-4">การดำเนินการ</th>
                    <th className="py-3 px-4">บ้านเลขที่ / จำนวน</th>
                    <th className="py-3 px-4 text-center">งวดค้าง</th>
                    <th className="py-3 px-4 text-right">เงินต้น</th>
                    <th className="py-3 px-4 text-right">เบี้ยปรับ</th>
                    <th className="py-3 px-4 text-right">ยอดรวม</th>
                    <th className="py-3 px-4 text-center">โหมดเบี้ยปรับ</th>
                    <th className="py-3 px-4">ผู้บันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {historyList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        {loadingHistory ? 'กำลังโหลดประวัติ...' : 'ยังไม่มีประวัติการตั้งค่ายอดยกมา'}
                      </td>
                    </tr>
                  ) : (
                    historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                          {new Date(item.createdAt).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px]">
                            {item.action === 'SINGLE'
                              ? 'รายหลัง'
                              : item.action === 'MULTI'
                              ? 'กลุ่มบ้าน'
                              : item.action === 'MARK_ALL_PAID'
                              ? 'จ่ายครบทั้งหมด'
                              : 'นำเข้าไฟล์ CSV'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-black text-slate-800 block">
                            {item.houseNo ? `บ้านเลขที่ ${item.houseNo}` : `${item.houseCount} หลัง`}
                          </span>
                          {item.note && (
                            <span className="text-[10px] text-slate-500 font-normal block max-w-sm truncate" title={item.note}>
                              {item.note}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {item.periodCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                              {item.periodCount} งวด
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                              จ่ายครบ (0)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          ฿{Number(item.principalDebt || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          ฿{Number(item.penaltyDebt || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-black text-[#2A524C]">
                          ฿{Number(item.totalDebt || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                            item.penaltyMode === 'NO_PENALTY'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.penaltyMode === 'NO_PENALTY'
                              ? 'ปลอดเบี้ยปรับ'
                              : item.penaltyMode === 'STEP_RATE_PERCENT'
                              ? 'ขั้นบันได %'
                              : 'รายเดือน'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                          {item.recordedBy || 'Admin'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* POPUP MODAL: เลือกบ้านหลายหลังพร้อมกัน (Batch Multi-House)       */}
      {/* ============================================================== */}
      {mounted && isMultiModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setIsMultiModalOpen(false)}
        >
          <div 
            className="bg-white text-slate-900 w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-[#376B64]/10 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#376B64] text-white rounded-xl shadow-md">
                  <Users size={20} />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    กำหนดงวดค้างชำระหลายบ้านพร้อมกัน (Batch Multi-House)
                  </h3>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* ตัวเลือก 1: จ่ายครบ */}
                  <button
                    type="button"
                    onClick={() => {
                      setMultiIsPaidFull(true);
                      setMultiIsAdvance(false);
                    }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      multiIsPaidFull && !multiIsAdvance
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        multiIsPaidFull && !multiIsAdvance ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {multiIsPaidFull && !multiIsAdvance && <Check size={12} />}
                    </div>
                    <div>
                      <span className="block font-black text-xs text-slate-900">
                        ชำระครบถ้วนพอดี (฿0.00)
                      </span>
                      <span className="block text-[11px] text-slate-700 font-medium mt-0.5">
                        ไม่มียอดหนี้ยกมาสำหรับทุกบ้านที่เลือก
                      </span>
                    </div>
                  </button>

                  {/* ตัวเลือก 2: ชำระล่วงหน้า */}
                  <button
                    type="button"
                    onClick={() => {
                      setMultiIsAdvance(true);
                      setMultiIsPaidFull(false);
                    }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      multiIsAdvance
                        ? 'border-teal-600 bg-teal-50 shadow-sm ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        multiIsAdvance ? 'bg-teal-600 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {multiIsAdvance && <Check size={12} />}
                    </div>
                    <div>
                      <span className="block font-black text-xs text-teal-900">
                        ชำระล่วงหน้า / จ่ายเกินรอบบิล
                      </span>
                      <span className="block text-[11px] text-slate-700 font-medium mt-0.5">
                        สร้างบิลสถานะ PAID อัตโนมัติ
                      </span>
                    </div>
                  </button>

                  {/* ตัวเลือก 3: ค้างชำระย้อนหลัง */}
                  <button
                    type="button"
                    onClick={() => {
                      setMultiIsPaidFull(false);
                      setMultiIsAdvance(false);
                    }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      !multiIsPaidFull && !multiIsAdvance
                        ? 'border-[#376B64] bg-[#376B64]/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        !multiIsPaidFull && !multiIsAdvance ? 'bg-[#376B64] text-white' : 'border border-slate-300'
                      }`}
                    >
                      {!multiIsPaidFull && !multiIsAdvance && <Check size={12} />}
                    </div>
                    <div>
                      <span className="block font-black text-xs text-slate-900">
                        มียอดค้างชำระย้อนหลัง
                      </span>
                      <span className="block text-[11px] text-slate-700 font-medium mt-0.5">
                        กำหนดช่วงเดือนที่ค้างชำระให้เหมือนกัน
                      </span>
                    </div>
                  </button>
                </div>

                {/* ฟอร์มระบุงวดล่วงหน้า (แสดงเมื่อเลือกชำระล่วงหน้า) */}
                {multiIsAdvance && (
                  <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                        <Sparkles size={15} className="text-teal-600" /> ระบุงวดสิ้นสุดที่ชำระล่วงหน้าถึง:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500">ปุ่มลัด:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const targetTotal = cutoffYear * 12 + cutoffMonth + 1;
                            setMultiAdvanceUntilYear(Math.floor((targetTotal - 1) / 12));
                            setMultiAdvanceUntilMonth(((targetTotal - 1) % 12) + 1);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-md text-[11px] font-black"
                        >
                          +1 เดือน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const targetTotal = cutoffYear * 12 + cutoffMonth + 2;
                            setMultiAdvanceUntilYear(Math.floor((targetTotal - 1) / 12));
                            setMultiAdvanceUntilMonth(((targetTotal - 1) % 12) + 1);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-md text-[11px] font-black"
                        >
                          +2 เดือน (ถึงสิ้นปี 69)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const targetTotal = cutoffYear * 12 + cutoffMonth + 3;
                            setMultiAdvanceUntilYear(Math.floor((targetTotal - 1) / 12));
                            setMultiAdvanceUntilMonth(((targetTotal - 1) % 12) + 1);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-md text-[11px] font-black"
                        >
                          +3 เดือน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const targetTotal = cutoffYear * 12 + cutoffMonth + 6;
                            setMultiAdvanceUntilYear(Math.floor((targetTotal - 1) / 12));
                            setMultiAdvanceUntilMonth(((targetTotal - 1) % 12) + 1);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-md text-[11px] font-black"
                        >
                          +6 เดือน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const targetTotal = cutoffYear * 12 + cutoffMonth + 12;
                            setMultiAdvanceUntilYear(Math.floor((targetTotal - 1) / 12));
                            setMultiAdvanceUntilMonth(((targetTotal - 1) % 12) + 1);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-md text-[11px] font-black"
                        >
                          +12 เดือน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiAdvanceUntilYear(2027);
                            setMultiAdvanceUntilMonth(12);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 rounded-md text-[11px] font-black"
                        >
                          ถึงสิ้นปี 2570
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="flex gap-1.5 items-center">
                        <span className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">เดือนสิ้นสุด:</span>
                        <select
                          value={multiAdvanceUntilMonth}
                          onChange={(e) => setMultiAdvanceUntilMonth(Number(e.target.value))}
                          className="flex-1 border border-teal-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 outline-none"
                        >
                          {THAI_MONTHS.map((m, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              {idx + 1}. {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-1.5 items-center">
                        <span className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">ปีสิ้นสุด:</span>
                        <select
                          value={multiAdvanceUntilYear}
                          onChange={(e) => setMultiAdvanceUntilYear(Number(e.target.value))}
                          className="flex-1 border border-teal-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 outline-none"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y + 543} ({y})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* การคิดเงินต้น */}
                    <div className="pt-2 border-t border-teal-200">
                      <span className="text-xs font-black text-slate-900 block mb-2">
                        อัตราเงินต้นต่อเดือน:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-teal-600/50 transition-colors">
                          <input
                            type="radio"
                            name="multiFeeModeAdv"
                            checked={multiFeeMode === 'house_rate'}
                            onChange={() => setMultiFeeMode('house_rate')}
                            className="accent-teal-600 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-900">
                            ใช้อัตราค่าส่วนกลางของแต่ละบ้านตามระบบ (แนะนำ)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-teal-600/50 transition-colors">
                          <input
                            type="radio"
                            name="multiFeeModeAdv"
                            checked={multiFeeMode === 'custom'}
                            onChange={() => setMultiFeeMode('custom')}
                            className="accent-teal-600 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-900 whitespace-nowrap">
                            กำหนดยอดคงที่เท่ากันทุกหลัง:
                          </span>
                          {multiFeeMode === 'custom' && (
                            <input
                              type="number"
                              value={multiCustomAmount}
                              onChange={(e) => setMultiCustomAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="500"
                              className="w-24 px-2.5 py-1 bg-white border border-teal-300 rounded-lg text-xs font-black text-slate-900 text-center shadow-sm focus:border-teal-600 outline-none"
                            />
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-teal-200 text-xs text-teal-800 font-bold flex items-center justify-between">
                      <span>จำนวนงวดที่ชำระล่วงหน้าต่อหลัง:</span>
                      <span className="px-2 py-0.5 bg-teal-100 rounded text-teal-900 font-black">
                        {multiAdvanceMonthsCount} งวด
                      </span>
                    </div>
                  </div>
                )}

                {/* ฟอร์มระบุช่วงเวลา (แสดงเมื่อมียอดค้าง) */}
                {!multiIsPaidFull && !multiIsAdvance && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Calendar size={15} className="text-[#376B64]" /> ช่วงเดือนที่ค้างชำระ:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-600">ปุ่มลัด:</span>
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
                        <span className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">ตั้งแต่:</span>
                        <select
                          value={multiStartMonth}
                          onChange={(e) => setMultiStartMonth(Number(e.target.value))}
                          className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                        >
                          {THAI_MONTHS.map((m, idx) => (
                            <option key={idx + 1} value={idx + 1} className="text-slate-900 bg-white font-bold py-1">
                              {idx + 1}. {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={multiStartYear}
                          onChange={(e) => setMultiStartYear(Number(e.target.value))}
                          className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y} className="text-slate-900 bg-white font-bold py-1">
                              {y + 543}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-1.5 items-center">
                        <span className="text-xs font-black text-slate-700 whitespace-nowrap shrink-0">ถึง:</span>
                        <select
                          value={multiEndMonth}
                          onChange={(e) => setMultiEndMonth(Number(e.target.value))}
                          className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                        >
                          {THAI_MONTHS.map((m, idx) => (
                            <option key={idx + 1} value={idx + 1} className="text-slate-900 bg-white font-bold py-1">
                              {idx + 1}. {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={multiEndYear}
                          onChange={(e) => setMultiEndYear(Number(e.target.value))}
                          className="flex-1 border border-slate-300 rounded-xl p-2.5 bg-white text-xs font-black text-slate-900 shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y} className="text-slate-900 bg-white font-bold py-1">
                              {y + 543}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* การคิดเงินต้น */}
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-xs font-black text-slate-900 block mb-2">
                        อัตราเงินต้นต่อเดือน:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#376B64]/50 transition-colors">
                          <input
                            type="radio"
                            name="multiFeeMode"
                            checked={multiFeeMode === 'house_rate'}
                            onChange={() => setMultiFeeMode('house_rate')}
                            className="accent-[#376B64] w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-900">
                            ใช้อัตราค่าส่วนกลางของแต่ละบ้านตามระบบ (แนะนำ)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#376B64]/50 transition-colors">
                          <input
                            type="radio"
                            name="multiFeeMode"
                            checked={multiFeeMode === 'custom'}
                            onChange={() => setMultiFeeMode('custom')}
                            className="accent-[#376B64] w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-900 whitespace-nowrap">
                            กำหนดยอดคงที่เท่ากันทุกหลัง:
                          </span>
                          {multiFeeMode === 'custom' && (
                            <input
                              type="number"
                              value={multiCustomAmount}
                              onChange={(e) => setMultiCustomAmount(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="500"
                              className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 text-center shadow-sm focus:border-[#376B64] focus:ring-2 focus:ring-[#376B64]/30 outline-none"
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
                {multiIsAdvance ? (
                  <span className="text-teal-700 font-bold"> (ชำระล่วงหน้า {multiAdvanceMonthsCount} งวด/หลัง)</span>
                ) : !multiIsPaidFull ? (
                  <span> (ค้างชำระ {multiTotalMonths} งวด/หลัง)</span>
                ) : (
                  <span className="text-emerald-700 font-bold"> (ชำระครบถ้วน ฿0.00)</span>
                )}
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
