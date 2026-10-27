"use client";

import React, { useState } from "react";
import { UserMinus } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function RemoveResidentButton({ 
  userId, 
  userName 
}: { 
  userId: string; 
  userName: string; 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (loading) return;

    const result = await Swal.fire({
      title: "นำผู้พักอาศัยออกจากบ้าน?",
      html: `ต้องการนำ <b>${userName || "ผู้พักอาศัย"}</b> ออกจากบ้านหลังนี้ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      showCloseButton: true,
      reverseButtons: false,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ยืนยันนำออก",
      cancelButtonText: "ยกเลิก",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        confirmButton: "rounded-xl font-bold px-6 py-2.5",
        cancelButton: "rounded-xl font-bold px-6 py-2.5"
      }
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/houses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove_resident", userId })
        });
        const data = await res.json();
        if (data.success) {
          await Swal.fire({
            icon: "success",
            title: "ดำเนินการเสร็จสิ้น",
            text: data.message || "นำผู้พักอาศัยออกจากบ้านเรียบร้อยแล้ว",
            confirmButtonColor: "#376B64",
            confirmButtonText: "รับทราบ",
            customClass: { popup: "rounded-[2rem]", confirmButton: "rounded-xl font-bold px-8" }
          });
          router.refresh();
        } else {
          Swal.fire({ 
            icon: "error", 
            title: "ผิดพลาด", 
            text: data.error || "ไม่สามารถนำข้อมูลออกได้", 
            confirmButtonColor: "#ef4444",
            customClass: { popup: "rounded-[2rem]" }
          });
        }
      } catch (err) {
        Swal.fire({ 
          icon: "error", 
          title: "ผิดพลาด", 
          text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", 
          confirmButtonColor: "#ef4444",
          customClass: { popup: "rounded-[2rem]" }
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleRemove}
      disabled={loading}
      className={`p-1.5 sm:p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-colors shrink-0 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      title="นำข้อมูลออก"
    >
      <UserMinus size={16} className="shrink-0" />
    </button>
  );
}
