import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

/**
 * DELETE: ลบบัญชีผู้ใช้งานระบบ
 * สิทธิ์: เฉพาะ SUPER_ADMIN เท่านั้น และไม่อนุญาตให้ลบบัญชีตนเอง
 */
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (!session || currentUserRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'ท่านไม่มีสิทธิ์ในการลบบัญชีผู้ใช้งาน (เฉพาะผู้ดูแลระบบสูงสุด)' },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสผู้ใช้งานที่ต้องการลบ' },
        { status: 400 }
      );
    }

    if (id === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถลบบัญชีที่กำลังลงชื่อเข้าใช้งานอยู่ในปัจจุบันได้' },
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

    await prisma.adminUser.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Delete Staff Error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
