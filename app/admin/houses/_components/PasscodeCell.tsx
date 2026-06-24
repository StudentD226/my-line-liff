"use client";

import React, { useState, useTransition } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { resetHousePasscode } from "../actions"; 
import Swal from "sweetalert2";

export default function PasscodeCell({ houseId, houseNo, passcode }: { houseId: string; houseNo: string; passcode: string | null }) {
  const [copied, setCopied] = useState(false);
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
      confirmButtonColor: "#EA580C", 
      cancelButtonColor: "#F3F4F6",
      confirmButtonText: "ตกลง, เปลี่ยนรหัส",
      cancelButtonText: "<span style='color: #4B5563'>ยกเลิก</span>",
      customClass: { popup: 'rounded-[2rem]' }
    });

    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append("id", houseId);
      formData.append("houseNo", houseNo);

      startTransition(async () => {
        await resetHousePasscode(formData);
        Swal.fire({
          icon: "success",
          title: "เปลี่ยนรหัสสำเร็จ!",
          text: "ระบบสร้างรหัสลับใหม่ให้เรียบร้อยแล้ว",
          confirmButtonColor: "#376B64",
          customClass: { popup: 'rounded-[2rem]' },
          reverseButtons: true,
        });
      });
    }
  };

  if (!passcode) return <span className="text-gray-400 font-medium text-xs">ไม่มีรหัส</span>;

  return (
    <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-max font-mono text-sm font-bold text-slate-700 shadow-sm">
      <span>{passcode}</span>
      <button
        type="button"
        onClick={handleCopy}
        className={`p-1.5 rounded-lg transition-colors ${copied ? "bg-emerald-50 text-emerald-600" : "bg-white text-slate-400 hover:text-[#1A534B] hover:bg-slate-100 border border-slate-200"}`}
        title="คัดลอกรหัสลับ"
      >
        {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
      </button>
      <button
        type="button"
        onClick={handleReset}
        disabled={isPending}
        className={`p-1.5 rounded-lg border border-slate-200 transition-colors bg-white text-slate-400 hover:text-orange-600 hover:bg-orange-50 ${isPending ? "opacity-50" : ""}`}
        title="เปลี่ยนรหัสลับใหม่"
      >
        <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
      </button>
    </div>
  );
}