import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // 🌟 รองรับทั้งการส่งมาแบบบ้านหลังเดียว (houseId) และส่งมาหลายหลัง (houseIds เป็น Array)
    const houseIds = body.houseIds || (body.houseId ? [body.houseId] : []);
    const { feeType, feeRate } = body;

    if (houseIds.length === 0 || !feeType || feeRate === undefined) {
      return NextResponse.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 🌟 อัปเดตข้อมูลรวดเดียวหลายหลังด้วย updateMany
    const updatedHouses = await prisma.house.updateMany({
      where: { id: { in: houseIds } },
      data: { 
        feeType: feeType, 
        feeRate: Number(feeRate) 
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `อัปเดตเรทราคาสำเร็จ ${updatedHouses.count} รายการ`,
    });

  } catch (error: any) {
    console.error('❌ Update House Fee Error:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' }, { status: 500 });
  }
}