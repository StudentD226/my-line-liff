"use client";

import React, { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, Eye, EyeOff } from "lucide-react";
import { resetHousePasscode } from "../actions";
import Swal from "sweetalert2";

export default function PasscodeCell({ houseId, houseNo, passcode }: { houseId: string; houseNo: string; passcode: string | null }) {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = async () => {
    if (!passcode) return;
    try {
      await navigator.clipboard.writeText(passcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "เปลี่ยนรหัสผ่านใหม่?",
      text: `ต้องการยกเลิกรหัสเดิม แล้วสร้างรหัสลับใหม่ให้บ้านเลขที่ ${houseNo} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      reverseButtons: false, // ปุ่มยืนยันอยู่ด้านซ้ายเสมอ
      confirmButtonColor: "#376B64",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ยืนยันการเปลี่ยนรหัส",
      cancelButtonText: "ยกเลิกรายการ",
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl font-bold px-6 py-2.5',
        cancelButton: 'rounded-xl font-bold px-6 py-2.5'
      }
    });

    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append("id", houseId);
      formData.append("houseNo", houseNo);

      startTransition(async () => {
        await resetHousePasscode(formData);
        Swal.fire({
          icon: "success",
          title: "ดำเนินการเสร็จสิ้น",
          text: "ระบบสร้างรหัสลับใหม่ให้เรียบร้อยแล้ว",
          confirmButtonColor: "#376B64",
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-8' }
        });
        setIsVisible(false);
      });
    }
  };

  if (!passcode) return <span className="text-gray-400 font-medium text-xs">ไม่มีรหัส</span>;

  return (
    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-max font-mono text-sm font-bold text-slate-700 shadow-sm">

      <span className="w-24 text-center tracking-widest">
        {isVisible ? passcode : "••••••••"}
      </span>

      <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-2">
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="p-1.5 rounded-lg transition-colors bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm"
          title={isVisible ? "ซ่อนรหัสลับ" : "แสดงรหัสลับ"}
        >
          {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className={`p-1.5 rounded-lg transition-colors border shadow-sm ${copied ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-slate-400 hover:text-[#376B64] hover:bg-slate-100 border-slate-200"}`}
          title="คัดลอกรหัสลับ"
        >
          {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className={`p-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors bg-white text-slate-400 hover:text-[#376B64] hover:bg-[#376B64]/10 ${isPending ? "opacity-50" : ""}`}
          title="เปลี่ยนรหัสลับใหม่"
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}