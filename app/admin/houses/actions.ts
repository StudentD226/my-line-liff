"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// 1. เพิ่มบ้านแบบปกติ (ทีละหลัง)
export async function addHouse(formData: FormData) {
  const houseNo = formData.get("houseNo")?.toString();
  const houseSize = parseFloat(formData.get("houseSize")?.toString() || "0");
  
  const feeType = (formData.get("feeType")?.toString() as 'CALCULATED' | 'FIXED') || 'CALCULATED';
  const feeRate = parseFloat(formData.get("feeRate")?.toString() || "0");

  if (!houseNo) return;

  await prisma.house.create({ 
    data: { 
      houseNo, 
      houseSize,
      feeType, 
      feeRate  
    } 
  });
  revalidatePath("/admin/houses");
}

// 2. แก้ไขบ้าน
export async function updateHouse(formData: FormData) {
  const id = formData.get("id")?.toString();
  const houseSize = parseFloat(formData.get("houseSize")?.toString() || "0");
  
  const feeType = (formData.get("feeType")?.toString() as 'CALCULATED' | 'FIXED') || 'CALCULATED';
  const feeRate = parseFloat(formData.get("feeRate")?.toString() || "0");

  if (!id) return;

  await prisma.house.update({
    where: { id },
    data: { 
      houseSize,
      feeType, 
      feeRate 
    },
  });
  
  revalidatePath("/admin/houses");
}

// 3. ลบบ้าน
export async function deleteHouse(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  await prisma.house.delete({ where: { id } });
  revalidatePath("/admin/houses");
}

// 4. ลบสมาชิกออกจากบ้าน (เตะออก)
export async function removeResident(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { 
      residentHouse: { disconnect: true } 
    } 
  });
  
  revalidatePath("/admin/houses");
}

// 5. รันเลขที่บ้านอัตโนมัติเป็นชุด
export async function autoGenerateHouses(formData: FormData) {
  const prefix = formData.get("prefix")?.toString() || "";
  const startNum = parseInt(formData.get("startNum")?.toString() || "1");
  const endNum = parseInt(formData.get("endNum")?.toString() || "10");
  const houseSize = parseFloat(formData.get("houseSize")?.toString() || "50");
  
  const feeType = (formData.get("feeType")?.toString() as 'CALCULATED' | 'FIXED') || 'CALCULATED';
  const feeRate = parseFloat(formData.get("feeRate")?.toString() || "0");

  if (startNum > endNum) return; 

  for (let i = startNum; i <= endNum; i++) {
    const houseNo = `${prefix}${i}`; 
    
    const existing = await prisma.house.findFirst({ where: { houseNo } });
    if (!existing) {
      await prisma.house.create({ 
        data: { 
          houseNo, 
          houseSize,
          feeType, 
          feeRate  
        } 
      });
    }
  }
  
  revalidatePath("/admin/houses");
}