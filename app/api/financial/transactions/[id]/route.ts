export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. แก้ไขรายการ (PUT)
// ==========================================
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { type, categoryId, title, amount, date, description, receiptUrl } = body;

    const finalDescription = title ? (description ? `${title} - ${description}` : title) : description;

    const updatedTx = await prisma.financialTransaction.update({
      where: { id: params.id },
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
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.financialTransaction.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Transaction Error:', error);
    return NextResponse.json({ success: false, error: 'ลบรายการล้มเหลว' }, { status: 500 });
  }
}