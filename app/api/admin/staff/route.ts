import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 🌟 ดักสิทธิ์ตรงนี้: (สมมติว่าลูกพี่ดึง Session มาเช็ก)
    // if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 403 });

    const body = await request.json();
    const { name, email, password, role } = body;

    // เช็กว่าอีเมลนี้ซ้ำไหม
    const existingUser = await prisma.adminUser.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'อีเมลนี้มีในระบบแล้ว' }, { status: 400 });
    }

    // 🌟 เข้ารหัสผ่านก่อนลง Database (ป้องกันข้อมูลหลุด)
    const hashedPassword = await bcrypt.hash(password, 10);

    // บันทึกลง Database
    const newUser = await prisma.adminUser.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      }
    });

    return NextResponse.json({ success: true, message: 'สร้างบัญชีสำเร็จ!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'ระบบขัดข้อง' }, { status: 500 });
  }
}