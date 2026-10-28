"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// ฟังก์ชันสร้างรหัสลับ (เอาเลขบ้านมาต่อด้วยสุ่ม 4 ตัวอักษร)
function generatePasscode(houseNo: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${houseNo}-${randomPart}`;
}

// 1. เพิ่มบ้านแบบปกติ (ทีละหลัง)
export async function addHouse(formData: FormData) {
  const houseNo = formData.get("houseNo")?.toString()?.trim();
  const houseSize = parseFloat(formData.get("houseSize")?.toString() || "0");

  const feeType = (formData.get("feeType")?.toString() as 'CALCULATED' | 'FIXED') || 'CALCULATED';
  const feeRate = parseFloat(formData.get("feeRate")?.toString() || "0");

  if (!houseNo) return;

  // ตรวจสอบว่ามีบ้านเลขที่นี้อยู่แล้วหรือไม่ เพื่อป้องกัน Duplicate Key P2002 Error
  const existing = await prisma.house.findUnique({ where: { houseNo } });
  if (existing) return;

  const passcode = generatePasscode(houseNo); // สร้างรหัสลับ

  await prisma.house.create({
    data: {
      houseNo,
      houseSize,
      feeType,
      feeRate,
      passcode // บันทึกลง Database
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

// 3. ลบบ้าน (แบบปลอดภัย ปลดความสัมพันธ์ทั้งหมด และลบผู้ใช้ที่เกี่ยวข้องออกจากระบบ)
export async function deleteHouse(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  await prisma.$transaction(async (tx) => {
    await tx.invoice.deleteMany({ where: { residentHouseId: id } });
    await tx.report.deleteMany({ where: { residentHouseId: id } });
    await tx.house.updateMany({ where: { id }, data: { ownerId: null } });

    // ลบผู้พักอาศัยที่สังกัดบ้านนี้ออกจากระบบอย่างสิ้นเชิง
    const residents = await tx.user.findMany({
      where: { residentHouseId: id },
      select: { id: true, lineId: true }
    });
    for (const r of residents) {
      if (r.lineId) {
        await tx.report.deleteMany({ where: { lineId: r.lineId } });
      }
    }
    await tx.user.deleteMany({ where: { residentHouseId: id } });

    await tx.house.delete({ where: { id } });
  });

  revalidatePath("/admin/houses");
}

// 4. ลบสมาชิกออกจากบ้าน (ลบข้อมูลผู้ใช้งานคนนั้นออกจากระบบอย่างสิ้นเชิง)
export async function removeResident(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  if (!userId) return;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, lineId: true, residentHouseId: true }
    });
    if (user) {
      await tx.house.updateMany({
        where: { ownerId: userId },
        data: { ownerId: null }
      });
      if (user.lineId) {
        await tx.report.deleteMany({ where: { lineId: user.lineId } });
      }

      // สุ่มรหัสผ่านใหม่ให้บ้าน หากไม่มีผู้อยู่อาศัยอื่นเหลืออยู่
      if (user.residentHouseId) {
        const remaining = await tx.user.count({
          where: {
            residentHouseId: user.residentHouseId,
            id: { not: userId }
          }
        });
        if (remaining === 0) {
          const h = await tx.house.findUnique({
            where: { id: user.residentHouseId },
            select: { id: true, houseNo: true }
          });
          if (h) {
            await tx.house.update({
              where: { id: h.id },
              data: { passcode: generatePasscode(h.houseNo) }
            });
          }
        }
      }

      await tx.user.delete({ where: { id: userId } });
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

  const houseNumbers = Array.from({ length: endNum - startNum + 1 }, (_, idx) => `${prefix}${startNum + idx}`);

  const existingHouses = await prisma.house.findMany({
    where: { houseNo: { in: houseNumbers } },
    select: { houseNo: true }
  });
  const existingSet = new Set(existingHouses.map((h) => h.houseNo));

  const newHouses = houseNumbers
    .filter((houseNo) => !existingSet.has(houseNo))
    .map((houseNo) => ({
      houseNo,
      houseSize,
      feeType,
      feeRate,
      passcode: generatePasscode(houseNo)
    }));

  if (newHouses.length > 0) {
    await prisma.house.createMany({ data: newHouses });
  }

  revalidatePath("/admin/houses");
}

// 6. รีเซ็ตรหัสลับใหม่
export async function resetHousePasscode(formData: FormData) {
  const id = formData.get("id")?.toString();
  const houseNo = formData.get("houseNo")?.toString();

  if (!id || !houseNo) return;

  const newPasscode = generatePasscode(houseNo);

  await prisma.house.update({
    where: { id },
    data: { passcode: newPasscode },
  });

  revalidatePath("/admin/houses");
}
