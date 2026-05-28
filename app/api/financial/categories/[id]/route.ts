export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. แก้ไขชื่อหมวดหมู่ (PUT)
// ==========================================
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name) return NextResponse.json({ success: false, error: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });

    const updatedCategory = await prisma.transactionCategory.update({
      where: { id },
      data: { name }
    });

    return NextResponse.json({ success: true, data: updatedCategory });
  } catch (error) {
    console.error('Update Category Error:', error);
    return NextResponse.json({ success: false, error: 'แก้ไขหมวดหมู่ล้มเหลว' }, { status: 500 });
  }
}

// ==========================================
// 2. ลบหมวดหมู่ (DELETE)
// ==========================================
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // สั่งลบหมวดหมู่ในฐานข้อมูล
    await prisma.transactionCategory.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Category Error:', error);
    // 🌟 ดักจับ Error กรณีที่หมวดหมู่นี้ถูกใช้งานไปแล้ว (มีรายจ่ายผูกอยู่) ระบบจะห้ามลบเพื่อความปลอดภัย
    if (error.code === 'P2003') {
      return NextResponse.json({ success: false, error: 'ไม่สามารถลบได้ เนื่องจากมีรายการบัญชีใช้หมวดหมู่นี้อยู่' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'ลบหมวดหมู่ล้มเหลว' }, { status: 500 });
  }
}