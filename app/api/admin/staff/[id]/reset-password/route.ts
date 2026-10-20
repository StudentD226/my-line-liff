import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

/**
 * PUT: รีเซ็ตรหัสผ่านพนักงาน
 * สิทธิ์: เฉพาะ SUPER_ADMIN เท่านั้น
 */
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;

    if (!session || currentUserRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'ท่านไม่มีสิทธิ์ในการรีเซ็ตรหัสผ่าน (เฉพาะผู้ดูแลระบบสูงสุด)' },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const body = await request.json();
    const { newPassword } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสผู้ใช้งานที่ต้องการรีเซ็ต' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.adminUser.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ' },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.adminUser.update({
      where: { id },
      data: {
        password: hashedPassword,
        isDefaultPassword: true,
        passwordChangedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' },
      { status: 500 }
    );
  }
}
