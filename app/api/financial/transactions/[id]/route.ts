export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. แก้ไขรายการ (PUT)
// ==========================================
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> } // 🌟 แก้ 1: เปลี่ยนเป็น Promise
) {
  try {
    const { id } = await params; // 🌟 แก้ 2: สั่ง await ดึงค่า id ออกมาก่อน

    const body = await request.json();
    const { type, categoryId, title, amount, date, description, receiptUrl } = body;

    const finalDescription = title ? (description ? `${title} - ${description}` : title) : description;

    const updatedTx = await prisma.financialTransaction.update({
      where: { id: id }, // 🌟 แก้ 3: ใช้ id ที่ได้มา
      data: {
        type: type as TransactionType,
        categoryId,
        description: finalDescription,
        amount: parseFloat(amount),
        date: new Date(date),
        receiptUrl: receiptUrl || null
      }
    });

    return NextResponse.json({ success: true, data: updatedTx });
  } catch (error) {
    console.error('Update Transaction Error:', error);
    return NextResponse.json({ success: false, error: 'แก้ไขรายการล้มเหลว' }, { status: 500 });
  }
}

// ==========================================
// 2. ลบรายการ (DELETE)
// ==========================================
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> } // 🌟 แก้ 1: เปลี่ยนเป็น Promise
) {
  try {
    const { id } = await params; // 🌟 แก้ 2: สั่ง await ดึงค่า id ออกมาก่อน

    await prisma.financialTransaction.delete({
      where: { id: id } // 🌟 แก้ 3: ใช้ id ที่ได้มา
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Transaction Error:', error);
    return NextResponse.json({ success: false, error: 'ลบรายการล้มเหลว' }, { status: 500 });
  }
}