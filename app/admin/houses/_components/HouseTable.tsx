"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Key, Trash2, Pencil, Phone, Search } from "lucide-react";
import Swal from "sweetalert2";
import PasscodeCell from "./PasscodeCell";

export interface HouseItem {
  id: string;
  houseNo: string;
  houseSize: number;
  feeType: string;
  feeRate: number;
  passcode: string | null;
  residents: Array<{
    id: string;
    name: string | null;
    phone?: string | null;
  }>;
}

interface HouseTableProps {
  houses: HouseItem[];
  unitLabel: string;
  sizeLabel: string;
  isSuperAdmin: boolean;
  searchQuery?: string;
  alertMessage?: string;
}

export default function HouseTable({
  houses,
  unitLabel,
  sizeLabel,
  isSuperAdmin,
  searchQuery = "",
  alertMessage = ""
}: HouseTableProps) {
  const router = useRouter();
  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // อัปเดตสถานะ indeterminate ของ checkbox ทั้งหมดในหัวตาราง
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate =
        selectedHouseIds.length > 0 && selectedHouseIds.length < houses.length;
    }
  }, [selectedHouseIds, houses.length]);

  // แสดงผล Popup แจ้งเตือนเมื่อมี ?alert=... ส่งมาจาก Server
  useEffect(() => {
    if (!alertMessage) return;

    const messages: Record<string, string> = {
      add_success: "เพิ่มข้อมูลอ้างอิงยูนิตใหม่เรียบร้อยแล้ว",
      update_success: "ปรับปรุงข้อมูลยูนิตเรียบร้อยแล้ว",
      delete_success: "ลบข้อมูลและประวัติที่เกี่ยวข้องทั้งหมดเรียบร้อยแล้ว",
      delete_multiple_success: "ลบรายการข้อมูลยูนิตที่เลือกเรียบร้อยแล้ว",
      remove_success: "นำรายชื่อผู้พักอาศัยออกจากระบบเรียบร้อยแล้ว",
      generate_multiple_success: "สร้างรหัสผ่านชั่วคราวให้ยูนิตที่เลือกเรียบร้อยแล้ว"
    };

    const text = messages[alertMessage] || "ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว";

    Swal.fire({
      icon: "success",
      title: "ดำเนินการเสร็จสิ้น",
      text: text,
      confirmButtonText: "รับทราบ",
      reverseButtons: false,
      confirmButtonColor: "#376B64",
      timer: 3000,
      timerProgressBar: true,
      customClass: { popup: "rounded-[2rem]", confirmButton: "rounded-xl font-bold px-8" }
    });

    // ลบ param alert ออกจาก URL โดยไม่ต้อง reload หน้า
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("alert");
    window.history.replaceState({}, "", newUrl.toString());
  }, [alertMessage]);

  // เลือก / ยกเลิกการเลือกทั้งหมด
  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedHouseIds(houses.map((h) => h.id));
      } else {
        setSelectedHouseIds([]);
      }
    },
    [houses]
  );

  // เลือกทีละหลัง
  const handleSelectOne = useCallback((id: string) => {
    setSelectedHouseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  // ลบบ้านทีละหลัง (Single Delete)
  const handleSingleDelete = async (houseId: string, houseNo: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบข้อมูล?",
      html: `ต้องการลบข้อมูลบ้านเลขที่ <b>${houseNo || ""}</b> ใช่หรือไม่?<br/><span class="text-xs text-slate-400">ข้อมูลและประวัติที่เกี่ยวข้องทั้งหมดจะถูกลบออกจากระบบ</span>`,
      icon: "warning",
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ยืนยันการลบข้อมูล",
      cancelButtonText: "ยกเลิกรายการ",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        confirmButton: "rounded-xl font-bold px-6 py-2.5",
        cancelButton: "rounded-xl font-bold px-6 py-2.5"
      }
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "กำลังลบข้อมูล...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const res = await fetch("/api/admin/houses", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: houseId })
        });
        const data = await res.json();
        if (data.success) {
          await Swal.fire({
            icon: "success",
            title: "ดำเนินการเสร็จสิ้น",
            text: data.message || "ลบข้อมูลบ้านพักเรียบร้อยแล้ว",
            confirmButtonColor: "#376B64",
            confirmButtonText: "รับทราบ",
            customClass: { popup: "rounded-[2rem]", confirmButton: "rounded-xl font-bold px-8" }
          });
          setSelectedHouseIds((prev) => prev.filter((id) => id !== houseId));
          router.refresh();
        } else {
          Swal.fire({
            icon: "error",
            title: "ไม่สามารถลบข้อมูลได้",
            text: data.error || "เกิดข้อผิดพลาดในการลบข้อมูล",
            confirmButtonColor: "#ef4444",
            customClass: { popup: "rounded-[2rem]" }
          });
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
          confirmButtonColor: "#ef4444",
          customClass: { popup: "rounded-[2rem]" }
        });
      }
    }
  };

  // ลบบ้านเป็นชุด (Bulk Delete)
  const handleBulkDelete = async () => {
    if (selectedHouseIds.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกรายการ",
        text: "โปรดเลือกบ้านเลขที่ที่ต้องการลบอย่างน้อย 1 รายการ",
        confirmButtonColor: "#376B64",
        customClass: { popup: "rounded-[2rem]" }
      });
      return;
    }

    const result = await Swal.fire({
      title: "ยืนยันการลบข้อมูล?",
      html: `ต้องการลบข้อมูลบ้านที่เลือกทั้งหมด <b>${selectedHouseIds.length} รายการ</b> ใช่หรือไม่?<br/><span class="text-xs text-slate-400">ข้อมูลที่ถูกเลือกรวมถึงประวัติที่เกี่ยวข้องจะถูกลบและไม่สามารถกู้คืนได้</span>`,
      icon: "warning",
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ยืนยันการลบข้อมูล",
      cancelButtonText: "ยกเลิกรายการ",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        confirmButton: "rounded-xl font-bold px-6 py-2.5",
        cancelButton: "rounded-xl font-bold px-6 py-2.5"
      }
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "กำลังลบข้อมูล...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const res = await fetch("/api/admin/houses", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedHouseIds })
        });
        const data = await res.json();
        if (data.success) {
          await Swal.fire({
            icon: "success",
            title: "ดำเนินการเสร็จสิ้น",
            text: data.message || "ลบข้อมูลบ้านพักเรียบร้อยแล้ว",
            confirmButtonColor: "#376B64",
            confirmButtonText: "รับทราบ",
            customClass: { popup: "rounded-[2rem]", confirmButton: "rounded-xl font-bold px-8" }
          });
          setSelectedHouseIds([]);
          router.refresh();
        } else {
          Swal.fire({
            icon: "error",
            title: "ไม่สามารถลบข้อมูลได้",
            text: data.error || "เกิดข้อผิดพลาดในการลบข้อมูล",
            confirmButtonColor: "#ef4444",
            customClass: { popup: "rounded-[2rem]" }
          });
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
          confirmButtonColor: "#ef4444",
          customClass: { popup: "rounded-[2rem]" }
        });
      }
    }
  };

  // สุ่มรหัสผ่านใหม่เป็นชุด (Bulk Generate Passcode)
  const handleBulkGeneratePasscode = async () => {
    if (selectedHouseIds.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกรายการ",
        text: "โปรดเลือกบ้านเลขที่ที่ต้องการสุ่มรหัสผ่านอย่างน้อย 1 รายการ",
        confirmButtonColor: "#376B64",
        customClass: { popup: "rounded-[2rem]" }
      });
      return;
    }

    const result = await Swal.fire({
      title: "ยืนยันการสุ่มรหัสผ่านใหม่?",
      html: `ระบบจะดำเนินการสร้างรหัสผ่านชั่วคราวชุดใหม่ให้ <b>${selectedHouseIds.length} ยูนิต</b> ที่เลือก ข้อมูลเดิมจะถูกระงับทันที`,
      icon: "warning",
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: "#376B64",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ดำเนินการสุ่มรหัสใหม่",
      cancelButtonText: "ยกเลิกรายการ",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        confirmButton: "rounded-xl font-bold px-6 py-2.5",
        cancelButton: "rounded-xl font-bold px-6 py-2.5"
      }
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "กำลังสุ่มรหัสผ่านใหม่...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const res = await fetch("/api/admin/houses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "regenerate_passcode", ids: selectedHouseIds })
        });
        const data = await res.json();
        if (data.success) {
          await Swal.fire({
            icon: "success",
            title: "ดำเนินการเสร็จสิ้น",
            text: data.message || "สร้างรหัสผ่านชั่วคราวให้ยูนิตที่เลือกเรียบร้อยแล้ว",
            confirmButtonColor: "#376B64",
            confirmButtonText: "รับทราบ",
            customClass: { popup: "rounded-[2rem]", confirmButton: "rounded-xl font-bold px-8" }
          });
          setSelectedHouseIds([]);
          router.refresh();
        } else {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: data.error || "ไม่สามารถสุ่มรหัสผ่านได้",
            confirmButtonColor: "#ef4444",
            customClass: { popup: "rounded-[2rem]" }
          });
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
          confirmButtonColor: "#ef4444",
          customClass: { popup: "rounded-[2rem]" }
        });
      }
    }
  };

  const isAllSelected = houses.length > 0 && selectedHouseIds.length === houses.length;

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative w-full">
      {/* Bulk Action Bar (แสดงผลเฉพาะ Admin เมื่อมีการเลือกอย่างน้อย 1 รายการ) */}
      {isSuperAdmin && selectedHouseIds.length > 0 && (
        <div
          id="bulkActionBar"
          className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in slide-in-from-top duration-300 z-10 relative"
        >
          <span className="text-sm font-bold flex items-center gap-2 whitespace-nowrap">
            <span
              id="selectedCount"
              className="flex items-center justify-center bg-[#376B64] text-white w-6 h-6 rounded-full text-xs shadow-sm font-black shrink-0"
            >
              {selectedHouseIds.length}
            </span>{" "}
            รายการที่เลือก
          </span>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
            <button
              type="button"
              onClick={handleBulkGeneratePasscode}
              className="generate-passcode-btn flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-[0.98] whitespace-nowrap"
            >
              <Key size={14} className="mr-1.5 shrink-0" /> สุ่มรหัสผ่านใหม่
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="bulk-delete-btn flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-[0.98] whitespace-nowrap"
            >
              <Trash2 size={14} className="mr-1.5 shrink-0" /> ลบข้อมูลรายการที่เลือก
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full border-collapse min-w-[1050px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
              {isSuperAdmin && (
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    id="selectAllBtn"
                    ref={selectAllCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                    aria-label="เลือกทั้งหมด"
                  />
                </th>
              )}
              <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">
                {unitLabel}
              </th>
              <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">
                ขนาดพื้นที่
              </th>
              <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">
                รหัสผ่านชั่วคราว (Passcode)
              </th>
              <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">
                รูปแบบการประเมินค่าใช้จ่าย
              </th>
              <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">
                อัตราอ้างอิง
              </th>
              <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">
                ข้อมูลการติดต่อ
              </th>
              <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">
                การจัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {houses.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 8 : 7} className="py-24 text-center">
                  <Search className="mx-auto text-slate-300 mb-4 shrink-0" size={48} />
                  <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบรายการข้อมูล</h3>
                  <p className="text-slate-500 text-sm">
                    ไม่พบ{unitLabel} {searchQuery && `"${searchQuery}"`} ในระบบ
                  </p>
                </td>
              </tr>
            ) : (
              houses.map((house) => {
                const isSelected = selectedHouseIds.includes(house.id);
                return (
                  <tr
                    key={house.id}
                    style={{
                      backgroundColor: isSelected ? "rgba(55, 107, 100, 0.05)" : undefined
                    }}
                    className={`house-row transition-all duration-200 ${
                      isSelected ? "" : "hover:bg-slate-50/50"
                    }`}
                  >
                    {isSuperAdmin && (
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          name="houseIds"
                          value={house.id}
                          checked={isSelected}
                          onChange={() => handleSelectOne(house.id)}
                          className="house-checkbox rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                          aria-label={`เลือกบ้าน ${house.houseNo}`}
                        />
                      </td>
                    )}
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-sm border bg-slate-100 text-slate-700 border-slate-200">
                        {house.houseNo}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-slate-700 font-bold text-sm text-center whitespace-nowrap">
                      {house.houseSize}{" "}
                      <span className="text-slate-400 font-normal">{sizeLabel}</span>
                    </td>

                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <div className="flex justify-center">
                        <PasscodeCell
                          houseId={house.id}
                          houseNo={house.houseNo}
                          passcode={house.passcode || null}
                        />
                      </div>
                    </td>

                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          house.feeType === "FIXED"
                            ? "bg-[#376B64]/10 text-[#376B64]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {house.feeType === "FIXED" ? "อัตราคงที่" : "คำนวณตามพื้นที่"}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <span className="text-slate-900 font-bold text-base">
                        {Number(house.feeRate).toLocaleString("th-TH")} ฿
                      </span>
                    </td>

                    <td className="py-4 px-4 border-l border-slate-50 whitespace-nowrap">
                      {house.residents && house.residents.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="flex flex-nowrap items-center justify-center gap-1.5">
                            <span className="text-sm font-bold text-slate-800 text-center leading-tight">
                              {house.residents[0].name || "ไม่ได้ระบุชื่อ"}
                            </span>
                            {house.residents.length > 1 && (
                              <span className="text-[10px] font-bold text-[#376B64] bg-[#376B64]/10 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
                                +{house.residents.length - 1} ท่าน
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-1 text-slate-500 whitespace-nowrap">
                            <Phone size={11} className="shrink-0" />
                            <span className="text-xs font-medium">
                              {house.residents[0].phone || "ไม่มีข้อมูลติดต่อ"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-400">
                            ไม่มีข้อมูล
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 border-l border-slate-50 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="flex bg-slate-50 p-1.5 rounded-xl gap-1.5 border border-slate-200/60 shadow-sm">
                          <Link
                            href={`/admin/houses?edit=${house.id}${
                              searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
                            }`}
                            className="p-2 text-slate-500 hover:text-[#376B64] hover:bg-[#376B64]/10 rounded-lg transition-all shadow-sm hover:shadow"
                            title="แก้ไขข้อมูล"
                          >
                            <Pencil size={16} className="shrink-0" />
                          </Link>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSingleDelete(house.id, house.houseNo)}
                              className="single-delete-btn p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm hover:shadow"
                              title="ลบข้อมูล"
                            >
                              <Trash2 size={16} className="shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
