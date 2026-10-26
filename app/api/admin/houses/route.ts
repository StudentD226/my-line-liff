import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

function generatePasscode(houseNo: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${houseNo}-${randomPart}`;
}

export async function GET() {
  try {
    const houses = await prisma.house.findMany({
      orderBy: { houseNo: 'asc' },
    });
    
    return NextResponse.json({ success: true, houses });
  } catch (error) {
    console.error('Error fetching houses:', error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลบ้านไม่สำเร็จ' }, { status: 500 });
  }
}

// 🌟 DELETE: ลบข้อมูลบ้าน (รองรับทั้งลบเดี่ยว และลบเป็นชุด)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะแอดมิน)' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body.id;
    const ids: string[] = body.ids || (id ? [id] : []);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุบ้านที่ต้องการลบ' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. ลบ Invoices ที่ผูกกับบ้านเหล่านี้
      await tx.invoice.deleteMany({
        where: { residentHouseId: { in: ids } }
      });

      // 2. ลบ Reports ที่ผูกกับบ้านเหล่านี้
      await tx.report.deleteMany({
        where: { residentHouseId: { in: ids } }
      });

      // 3. ปลด ownerId ออกจากบ้านก่อน เพื่อป้องกันปัญหา Foreign Key ติดขัด
      await tx.house.updateMany({
        where: { id: { in: ids } },
        data: { ownerId: null }
      });

      // 4. ปลดความสัมพันธ์ของผู้อยู่อาศัยออกจากบ้านนี้
      await tx.user.updateMany({
        where: { residentHouseId: { in: ids } },
        data: { residentHouseId: null }
      });

      // 5. ดำเนินการลบบ้านออกจากระบบ
      await tx.house.deleteMany({
        where: { id: { in: ids } }
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: `ลบข้อมูลบ้านพักเรียบร้อยแล้ว (${ids.length} รายการ)` 
    });
  } catch (error: any) {
    console.error('Delete house error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดในการลบข้อมูลบ้านพัก' 
    }, { status: 500 });
  }
}

// 🌟 PATCH: สุ่มรหัสผ่านใหม่เป็นชุด หรือ นำสมาชิกออกจากบ้าน
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะแอดมิน)' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ids, userId } = body;

    // 1. สุ่มรหัสผ่านใหม่ให้บ้านที่เลือก
    if (action === 'regenerate_passcode' && ids && ids.length > 0) {
      const targetHouses = await prisma.house.findMany({
        where: { id: { in: ids } },
        select: { id: true, houseNo: true }
      });

      for (const h of targetHouses) {
        await prisma.house.update({
          where: { id: h.id },
          data: { passcode: generatePasscode(h.houseNo) }
        });
      }

      return NextResponse.json({ success: true, message: `สุ่มรหัสผ่านใหม่ให้ ${targetHouses.length} ยูนิตเรียบร้อยแล้ว` });
    }

    // 2. นำสมาชิกออกจากบ้าน
    if (action === 'remove_resident' && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { residentHouseId: null }
      });
      return NextResponse.json({ success: true, message: 'นำผู้พักอาศัยออกจากบ้านเรียบร้อยแล้ว' });
    }

    return NextResponse.json({ success: false, error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
  } catch (error: any) {
    console.error('House PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message || 'ระบบขัดข้อง' }, { status: 500 });
  }
}