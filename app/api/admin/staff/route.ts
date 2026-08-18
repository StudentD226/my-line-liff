import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

// เพิ่มฟังก์ชัน GET สำหรับดึงรายชื่อไปแสดงในตาราง (Tab: รายชื่อทีมงาน)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }
    const staffList = await prisma.adminUser.findMany({
      select: {
        id: true,
        staffCode: true,
        name: true,
        email: true,
        role: true,
        isDefaultPassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, data: staffList });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'ไม่สามารถดึงข้อมูลได้' }, { status: 500 });
  }
}

// อัปเกรดฟังก์ชัน POST เดิม ให้รองรับการรันรหัสอัตโนมัติ
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any).role !== 'SUPER_ADMIN' && (session.user as any).role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    // เช็กว่าอีเมลนี้ซ้ำไหม
    const existingUser = await prisma.adminUser.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'อีเมลนี้มีในระบบแล้ว' }, { status: 400 });
    }

    // ระบบสร้างรหัสพนักงานอัตโนมัติ (staffCode)
    const prefix = (role === 'SUPER_ADMIN' || role === 'ADMIN') ? 'SP' : 'NITI';
    const currentCount = await prisma.adminUser.count({
      where: { staffCode: { startsWith: prefix } }
    });
    const nextNumber = String(currentCount + 1).padStart(4, '0');
    const staffCode = `${prefix}-${nextNumber}`; // จะได้ออกมาเป็น SP-0001 หรือ NITI-0001

    // เข้ารหัสผ่านก่อนลง Database (ป้องกันข้อมูลหลุด)
    const hashedPassword = await bcrypt.hash(password, 10);

    // บันทึกลง Database
    const newUser = await prisma.adminUser.create({
      data: {
        staffCode, // เพิ่มรหัสประจำตัวที่รันอัตโนมัติ
        name,
        email,
        password: hashedPassword,
        role,
        isDefaultPassword: true, // ตั้งค่าบอกระบบว่าเป็นรหัสตั้งต้น
      }
    });

    return NextResponse.json({ success: true, message: 'สร้างบัญชีสำเร็จ!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'ระบบขัดข้อง' }, { status: 500 });
  }
}