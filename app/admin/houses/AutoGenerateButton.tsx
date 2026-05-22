"use client";
import React from "react";
import { Wand2 } from "lucide-react";
import Swal from "sweetalert2";

export default function AutoGenerateButton({ autoGenerateAction }: { autoGenerateAction: (formData: FormData) => void }) {
  
  const handleAutoGenerate = async () => {
    let defaultRate = 500;
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        defaultRate = data.config.flatRateAmount;
      }
    } catch (e) {
      console.error("Failed to fetch default rate", e);
    }

    Swal.fire({
      // 🌟 ใช้ HTML จัด Layout เต็มรูปแบบ และดึง Icon จากภายนอกมาใช้แทน Emoji
      html: `
        <div class="flex flex-col items-center mt-2 mb-4">
          <img src="https://img.icons8.com/fluency-systems-filled/48/f59e0b/magic-wand.png" style="width: 48px; height: 48px; margin-bottom: 12px;" />
          <h2 class="text-2xl font-extrabold text-slate-800 tracking-tight">รันข้อมูลอัตโนมัติ</h2>
        </div>
        
        <div class="text-left text-sm text-slate-500 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          ระบบจะสร้างข้อมูลให้เรียงตามตัวเลขที่กำหนดให้อัตโนมัติ<br/>
          <span class="text-xs text-amber-600 font-bold mt-1.5 inline-block">ตัวอย่าง: นำหน้า "99/" เริ่ม "1" ถึง "50" (จะได้ 99/1 ถึง 99/50)</span>
        </div>
        
        <div class="grid grid-cols-3 gap-3 mb-5">
          <div class="col-span-1">
            <div class="text-left text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">คำนำหน้า (ถ้ามี)</div>
            <input id="auto-prefix" class="swal2-input !m-0 !w-full !rounded-xl !text-sm border-slate-200 focus:border-amber-500" placeholder="เช่น 99/">
          </div>
          <div class="col-span-1">
            <div class="text-left text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">เลขเริ่มต้น *</div>
            <input id="auto-start" class="swal2-input !m-0 !w-full !rounded-xl !text-sm border-slate-200 focus:border-amber-500" type="number" value="1">
          </div>
          <div class="col-span-1">
            <div class="text-left text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">เลขสิ้นสุด *</div>
            <input id="auto-end" class="swal2-input !m-0 !w-full !rounded-xl !text-sm border-slate-200 focus:border-amber-500" type="number" value="10">
          </div>
        </div>

        <div class="text-left text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">ขนาดพื้นที่ *ใช้ค่าเดียวกันทุกหลัง</div>
        <input id="auto-size" class="swal2-input !m-0 !w-full !rounded-xl !text-sm mb-5 border-slate-200 focus:border-amber-500" type="number" step="0.1" placeholder="เช่น 50">

        <div class="text-left text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">รูปแบบการคิดเงิน</div>
        <select id="auto-fee-type" class="swal2-select !m-0 !w-full !rounded-xl !text-sm !bg-white mb-5 border-slate-200 focus:border-amber-500 text-slate-700">
          <option value="CALCULATED">คำนวณตามพื้นที่</option>
          <option value="FIXED" selected>เหมาจ่ายเป็นรายเดือน</option>
        </select>

        <div class="text-left text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">อัตราเรทราคา (บาท)</div>
        <input id="auto-fee-rate" class="swal2-input !m-0 !w-full !rounded-xl font-bold text-amber-600 !text-sm border-slate-200 focus:border-amber-500" type="number" step="0.01" value="${defaultRate}">
      `,
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonText: 'ดำเนินการสร้าง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#F59E0B', 
      cancelButtonColor: '#94a3b8',
      customClass: { popup: 'rounded-[2rem]' },
      preConfirm: () => {
        const prefix = (document.getElementById('auto-prefix') as HTMLInputElement).value;
        const startNum = parseInt((document.getElementById('auto-start') as HTMLInputElement).value);
        const endNum = parseInt((document.getElementById('auto-end') as HTMLInputElement).value);
        const houseSize = (document.getElementById('auto-size') as HTMLInputElement).value;
        const feeType = (document.getElementById('auto-fee-type') as HTMLSelectElement).value;
        const feeRate = (document.getElementById('auto-fee-rate') as HTMLInputElement).value;
        
        if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
          Swal.showValidationMessage('กรุณากรอกตัวเลขเริ่มต้น และสิ้นสุดให้ถูกต้อง');
        }
        if (endNum - startNum > 500) {
           Swal.showValidationMessage('สร้างได้สูงสุด 500 รายการต่อครั้งเพื่อป้องกันระบบค้าง');
        }
        return { prefix, startNum, endNum, houseSize, feeType, feeRate };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        // 🌟 อัปเกรดหน้าต่าง Loading ให้นุ่มนวลขึ้น
        Swal.fire({ 
          title: 'กำลังสร้างข้อมูล...', 
          html: 'กรุณารอสักครู่ ระบบกำลังรันเลขที่บ้านให้คุณ',
          allowOutsideClick: false, 
          didOpen: () => Swal.showLoading() 
        });

        try {
          const formData = new FormData();
          formData.append("prefix", result.value.prefix);
          formData.append("startNum", result.value.startNum.toString());
          formData.append("endNum", result.value.endNum.toString());
          formData.append("houseSize", result.value.houseSize || "0");
          formData.append("feeType", result.value.feeType);
          formData.append("feeRate", result.value.feeRate || "0");
          
          await autoGenerateAction(formData);
          
          // 🌟 Alert สำเร็จ!
          Swal.fire({
            icon: 'success', 
            title: 'เสร็จสิ้น!', 
            text: 'สร้างข้อมูลบ้านอัตโนมัติเรียบร้อยแล้ว',
            confirmButtonColor: '#3b82f6', // สีน้ำเงินให้เข้ากับหน้าหลัก
            customClass: { popup: 'rounded-[2rem]' },
            timer: 3000,
            timerProgressBar: true
          }).then(() => {
            window.location.reload(); 
          });
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถสร้างข้อมูลได้ โปรดลองอีกครั้ง',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'rounded-[2rem]' }
          });
        }
      }
    });
  };

  return (
    <button 
      type="button" 
      onClick={handleAutoGenerate}
      className="w-full mt-3 flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold py-3.5 px-4 rounded-2xl transition-all active:scale-[0.98] border border-amber-100 shadow-sm">
      {/* 🌟 ใช้ Lucide Icon สวยงามแทน Emoji */}
      <Wand2 size={20} strokeWidth={2.5} />
      รันเลขที่อัตโนมัติ (เช่น 1-100)
    </button>
  );
}