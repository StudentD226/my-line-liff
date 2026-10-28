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

      // 4. ลบข้อมูลผู้พักอาศัยที่สังกัดบ้านเหล่านี้ออกจากระบบอย่างสิ้นเชิง
      const residentsToDelete = await tx.user.findMany({
        where: { residentHouseId: { in: ids } },
        select: { id: true, lineId: true }
      });

      for (const resUser of residentsToDelete) {
        if (resUser.lineId) {
          await tx.report.deleteMany({ where: { lineId: resUser.lineId } });
        }
      }

      await tx.user.deleteMany({
        where: { residentHouseId: { in: ids } }
      });

      // 5. ดำเนินการลบบ้านออกจากระบบ
      await tx.house.deleteMany({
        where: { id: { in: ids } }
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: `ลบข้อมูลบ้านพักและผู้พักอาศัยเรียบร้อยแล้ว (${ids.length} รายการ)` 
    });
  } catch (error: any) {
    console.error('Delete house error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดในการลบข้อมูลบ้านพัก' 
    }, { status: 500 });
  }
}

// 🌟 PATCH: สุ่มรหัสผ่านใหม่เป็นชุด หรือ ลบสมาชิกออกจากบ้านอย่างถาวร
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

    // 2. ลบสมาชิกออกจากบ้าน (บังคับลบข้อมูลผู้ใช้งานคนนั้นออกจากระบบอย่างสิ้นเชิง เพื่อให้คนใหม่เข้าได้)
    if (action === 'remove_resident' && userId) {
      await prisma.$transaction(async (tx) => {
        const targetUser = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, lineId: true, residentHouseId: true }
        });

        if (targetUser) {
          // ปลด ownerId ถ้าผู้ใช้นี้เป็นเจ้าของบ้าน
          await tx.house.updateMany({
            where: { ownerId: userId },
            data: { ownerId: null }
          });

          // ลบใบแจ้งซ่อมที่ผูกกับ LINE ID ของผู้ใช้คนนี้ (ถ้ามี)
          if (targetUser.lineId) {
            await tx.report.deleteMany({
              where: { lineId: targetUser.lineId }
            });
          }

          // สุ่มรหัสผ่านใหม่ให้บ้าน หากไม่มีผู้อยู่อาศัยอื่นเหลืออยู่แล้ว
          if (targetUser.residentHouseId) {
            const remainingResidents = await tx.user.count({
              where: { 
                residentHouseId: targetUser.residentHouseId,
                id: { not: userId }
              }
            });
            if (remainingResidents === 0) {
              const h = await tx.house.findUnique({
                where: { id: targetUser.residentHouseId },
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

          // ลบข้อมูลผู้ใช้งานนี้ออกจากตาราง User อย่างถาวร
          await tx.user.delete({
            where: { id: userId }
          });
        }
      });
      return NextResponse.json({ 
        success: true, 
        message: 'ลบข้อมูลผู้พักอาศัยออกจากระบบอย่างสมบูรณ์เรียบร้อยแล้ว คนใหม่สามารถลงทะเบียนได้ทันที' 
      });
    }

    return NextResponse.json({ success: false, error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 });
  } catch (error: any) {
    console.error('House PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message || 'ระบบขัดข้อง' }, { status: 500 });
  }
}
