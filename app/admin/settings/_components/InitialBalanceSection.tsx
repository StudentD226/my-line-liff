'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import Link from 'next/link';
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
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { MigrationCalculationResult } from '@/lib/initial-balance';

const SAMPLE_CSV = `# รูปแบบ: บ้านเลขที่, ปีค.ศ., เดือน(1-12), กำหนดชำระเดิม(YYYY-MM-DD), เงินต้น(บาท)
# 1. บ้านที่ชำระครบแล้ว (ระบุเฉพาะบ้านเลขที่)
101/1

# 2. บ้านที่ค้างชำระย้อนหลัง 2 ปี และค้างเดือนล่าสุด
101/2, 2024, 1, 2024-01-07, 500
101/2, 2026, 9, 2026-09-07, 500

# 3. บ้านที่ค้างชำระต่อเนื่อง 3 ปีย้อนหลัง
101/3, 2023, 6, 2023-06-07, 600
101/3, 2024, 6, 2024-06-07, 600
101/3, 2025, 6, 2025-06-07, 600`;

interface InitialBalanceSectionProps {
  isSuperAdmin: boolean;
}

export default function InitialBalanceSection({ isSuperAdmin }: InitialBalanceSectionProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [cutoffDate, setCutoffDate] = useState<string>(todayStr);
  const [rawText, setRawText] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [previewData, setPreviewData] = useState<MigrationCalculationResult | null>(null);
  const [expandedHouse, setExpandedHouse] = useState<string | null>(null);

  // โหลดตัวอย่างข้อมูล
  const handleLoadSample = () => {
    setRawText(SAMPLE_CSV);
    setPreviewData(null);
  };

  // ล้างข้อมูล
  const handleClear = () => {
    setRawText('');
    setPreviewData(null);
  };

  // 1. กด Preview เพื่อคำนวณ Step Rate
  const handlePreview = async () => {
    if (!cutoffDate) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุวันที่ตัดยอด',
        text: 'โปรดเลือกวัน Cut-off Date สำหรับคำนวณจำนวนวันที่ค้างชำระ',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    if (!rawText.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่มีข้อมูลนำเข้า',
        text: 'กรุณากรอกหรือวางข้อมูลประวัติค้างชำระ (หรือกดปุ่มโหลดตัวอย่าง)',
        confirmButtonColor: '#376B64',
        customClass: { popup: 'rounded-[2rem]' },
      });
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await fetch('/api/admin/initial-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          cutoffDate,
          rawCsvText: rawText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPreviewData(json.data);
        Swal.fire({
          icon: 'success',
          title: 'คำนวณยอดตั้งต้นสำเร็จ',
          text: `ประมวลผลบ้านทั้งหมด ${json.data.totalProperties} หลัง ตรวจสอบยอดก่อนกดยืนยัน`,
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' },
        });
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการคำนวณ',
        text: err.message || 'ไม่สามารถประมวลผลข้อมูลได้ กรุณาตรวจสอบรูปแบบข้อความ',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'rounded-[2rem]' },
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // 2. กดยืนยันบันทึกจริงเข้าฐานข้อมูล
  const handleConfirmSave = async () => {
    if (!previewData) return;

    const result = await Swal.fire({
      title: 'ยืนยันการนำเข้าข้อมูลจริง?',
      html: `ระบบจะสร้างบ้านและบันทึกประวัติบิลหนี้ย้อนหลังจำนวน <b>${previewData.totalProperties} หลัง</b><br/>ยอดหนี้รวมทั้งสิ้น <b>฿${previewData.grandTotalDebt.toLocaleString(
        'th-TH',
        { minimumFractionDigits: 2 }
      )}</b> บาท เข้าสู่ฐานข้อมูลจริง`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#376B64',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ยืนยันบันทึกข้อมูล',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl font-bold px-6',
        cancelButton: 'rounded-xl font-bold px-6',
      },
    });

    if (!result.isConfirmed) return;

    setLoadingConfirm(true);
    Swal.fire({
      title: 'กำลังบันทึกข้อมูลยอดยกมา...',
      text: 'ระบบกำลังดำเนินการสร้างประวัติและบันทึกข้อมูลระดับ Transaction กรุณารอสักครู่',
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
          rawCsvText: rawText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        await Swal.fire({
          icon: 'success',
          title: 'นำเข้าข้อมูลยอดยกมาสำเร็จ!',
          text: json.message,
          confirmButtonColor: '#376B64',
          confirmButtonText: 'ไปที่หน้ารายการหนี้สิน',
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-8 py-3' },
        });
        window.location.href = '/admin/debts';
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
      setLoadingConfirm(false);
    }
  };

  return (
    <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative mt-8">
      {!isSuperAdmin && (
        <div className="absolute inset-0 z-20 bg-slate-100/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center text-center max-w-sm">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert size={28} />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">สิทธิ์การเข้าถึงข้อมูลจำกัด</h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์ตั้งค่ายอดยกมาตั้งต้น
            </p>
          </div>
        </div>
      )}

      <div className={`p-5 sm:p-6 md:p-8 ${!isSuperAdmin ? 'opacity-30 pointer-events-none select-none' : ''}`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-lg shrink-0">
                <History size={20} />
              </span>
              <span className="truncate">ตั้งค่ายอดลูกหนี้ค้างชำระยกมา (Initial Balance Setup)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              นำเข้าประวัติค้างชำระย้อนหลัง (1-3 ปี) และคำนวณเบี้ยปรับตามอัตราขั้นบันได (Step Rate) อัตโนมัติ ณ วันตัดยอด
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
              Step Rate: 0% / 10% / 20%
            </span>
          </div>
        </div>

        {/* Rule explanation alert */}
        <div className="p-4 bg-emerald-50/70 border border-[#376B64]/20 rounded-2xl mb-6">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-[#376B64] shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-slate-700">
              <span className="font-bold text-[#376B64]">เกณฑ์การคำนวณเบี้ยปรับย้อนหลังตามจำนวนวันค้างชำระจริง (Days Overdue):</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 font-medium">
                <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-800">1 - 30 วัน:</span> เบี้ยปรับ <b className="text-emerald-600">0%</b>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-800">31 - 180 วัน:</span> เบี้ยปรับ <b className="text-amber-600">10%</b> ของเงินต้น
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-800">เกิน 180 วัน:</span> เบี้ยปรับ <b className="text-rose-600">20%</b> ของเงินต้น
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                วันที่ตัดยอดตั้งต้น (Cut-off Date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={cutoffDate}
                onChange={(e) => {
                  setCutoffDate(e.target.value);
                  setPreviewData(null);
                }}
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-sm font-bold text-sm"
              />
            </div>

            <div className="md:col-span-2 flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <FileText size={15} /> โหลดตัวอย่างข้อมูล
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <RotateCcw size={15} /> ล้างข้อมูล
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700">
                ข้อมูลบ้านและประวัติค้างชำระ (CSV / ข้อความคั่นด้วยจุลภาค)
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                รูปแบบ: บ้านเลขที่, ปีค.ศ., เดือน, วันครบกำหนด, เงินต้น
              </span>
            </div>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setPreviewData(null);
              }}
              placeholder={`พิมพ์หรือวางข้อมูล เช่น:\n101/1\n101/2, 2024, 1, 2024-01-07, 500\n101/2, 2026, 9, 2026-09-07, 500`}
              className="w-full border border-slate-200 rounded-2xl p-4 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#376B64]/50 focus:border-[#376B64] outline-none transition-all shadow-inner font-mono text-xs leading-relaxed text-slate-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={loadingPreview}
              className={`px-6 py-3.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 active:scale-95 ${
                loadingPreview
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#376B64] hover:bg-[#2A524C] text-white'
              }`}
            >
              <Calculator size={18} />
              {loadingPreview ? 'กำลังคำนวณยอด...' : '1. ตรวจสอบและคำนวณยอด (Preview)'}
            </button>

            {previewData && (
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={loadingConfirm}
                className={`px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 animate-in fade-in active:scale-95 ${
                  loadingConfirm
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Save size={18} />
                {loadingConfirm ? 'กำลังบันทึก...' : '2. ยืนยันบันทึกข้อมูลเข้าสู่ระบบ'}
              </button>
            )}
          </div>
        </div>

        {/* Preview Results Section */}
        {previewData && (
          <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in duration-200 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[#376B64]" />
                ผลลัพธ์การคำนวณยอดยกมา ณ วันที่ {previewData.cutoffDate}
              </h3>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-500 block">จำนวนบ้านทั้งหมด</span>
                <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1 block">
                  {previewData.totalProperties} หลัง
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  จ่ายครบ {previewData.fullyPaidProperties} / ค้าง {previewData.overdueProperties}
                </span>
              </div>

              <div className="bg-blue-50/60 border border-blue-200/60 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-blue-700 block">เงินต้นค้างชำระรวม</span>
                <span className="text-xl sm:text-2xl font-black text-blue-900 mt-1 block">
                  ฿{previewData.totalPrincipalDebt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-blue-600 mt-1 block">ยอดเงินต้นแท้จริง</span>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/60 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-amber-700 block">ดอกเบี้ยปรับรวม (Step Rate)</span>
                <span className="text-xl sm:text-2xl font-black text-amber-900 mt-1 block">
                  ฿{previewData.totalPenaltyDebt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-amber-600 mt-1 block">คำนวณตามจำนวนวันเกินกำหนด</span>
              </div>

              <div className="bg-[#376B64]/10 border border-[#376B64]/30 p-4 rounded-2xl">
                <span className="text-[11px] font-bold text-[#376B64] block">ยอดหนี้ยกมารวมทั้งสิ้น</span>
                <span className="text-xl sm:text-2xl font-black text-[#2A524C] mt-1 block">
                  ฿{previewData.grandTotalDebt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-[#376B64] mt-1 block">เงินต้น + เบี้ยปรับ</span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                <span>รายละเอียดแยกรายแปลง/บ้าน</span>
                <span>คลิกแถวเพื่อดูรายการงวดย่อย</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
                {previewData.details.map((house) => {
                  const isExpanded = expandedHouse === house.houseNo;
                  return (
                    <div key={house.houseNo} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <div
                        onClick={() => setExpandedHouse(isExpanded ? null : house.houseNo)}
                        className="p-4 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                            <Building size={16} />
                          </div>
                          <div>
                            <span className="font-black text-sm text-slate-800">{house.houseNo}</span>
                            <span className="block text-[11px] text-slate-400">
                              {house.isFullyPaid
                                ? 'ไม่มียอดค้างชำระ (จ่ายครบแล้ว)'
                                : `ค้างชำระ ${house.totalUnpaidMonths} งวด`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {house.isFullyPaid ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                                จ่ายครบแล้ว (฿0.00)
                              </span>
                            ) : (
                              <div>
                                <span className="font-black text-sm text-slate-800">
                                  ฿{house.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  เงินต้น ฿{house.totalPrincipal.toLocaleString()} + ปรับ ฿
                                  {house.totalPenalty.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {!house.isFullyPaid && (
                            <button className="text-slate-400 hover:text-slate-600">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Period Details */}
                      {isExpanded && house.periods.length > 0 && (
                        <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 text-xs">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-slate-400 font-bold border-b border-slate-200/60 pb-1">
                                <th className="py-1.5">งวดปี/เดือน</th>
                                <th className="py-1.5">กำหนดเดิม</th>
                                <th className="py-1.5">เกินกำหนด</th>
                                <th className="py-1.5 text-right">เงินต้น</th>
                                <th className="py-1.5 text-right">เบี้ยปรับ</th>
                                <th className="py-1.5 text-right">รวมงวดนี้</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {house.periods.map((p, idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5 font-bold">
                                    {p.billingMonth}/{p.billingYear}
                                  </td>
                                  <td className="py-1.5 text-slate-500">{p.dueDate}</td>
                                  <td className="py-1.5">
                                    {p.daysOverdue} วัน{' '}
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                        p.penaltyRatePercent === 0
                                          ? 'bg-slate-100 text-slate-600'
                                          : p.penaltyRatePercent === 10
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-rose-100 text-rose-700'
                                      }`}
                                    >
                                      ({p.penaltyRatePercent}%)
                                    </span>
                                  </td>
                                  <td className="py-1.5 text-right">฿{p.principalAmount.toLocaleString()}</td>
                                  <td className="py-1.5 text-right text-amber-700">
                                    ฿{p.penaltyAmount.toLocaleString()}
                                  </td>
                                  <td className="py-1.5 text-right font-bold text-slate-800">
                                    ฿{p.totalAmount.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
