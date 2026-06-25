import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs"; 

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบ Session ว่าล็อกอินอยู่จริงไหม
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "ไม่พบสิทธิ์การเข้าถึง" }, { status: 401 });
    }

    const { name, password } = await req.json();

    if (!name) {
      return NextResponse.json({ success: false, error: "กรุณาระบุชื่อแสดงผล" }, { status: 400 });
    }

    // 2. เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = { name };

    // 3. ถ้าระบุรหัสผ่านใหม่มาด้วย ให้ทำการเข้ารหัสก่อนบันทึก
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
      updateData.isDefaultPassword = false; // ปลดล็อกสถานะรหัสผ่านเริ่มต้น
      updateData.passwordChangedAt = new Date(); // บันทึกเวลาที่เปลี่ยนรหัส
    }

    // 4. บันทึกลงตาราง AdminUser
    const updatedUser = await prisma.adminUser.update({
      where: { email: session.user.email },
      data: updateData,
    });

    return NextResponse.json({ 
      success: true, 
      message: "อัปเดตข้อมูลสำเร็จ", 
      user: { name: updatedUser.name, email: updatedUser.email } 
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ success: false, error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" }, { status: 500 });
  }
}