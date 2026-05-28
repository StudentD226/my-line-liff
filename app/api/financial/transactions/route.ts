export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================================
// 1. ดึงข้อมูลรายรับ-รายจ่าย (รวมบิลค่าส่วนกลางอัตโนมัติ)
// ========================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // เดือนที่เลือกจากหน้าบ้าน (1-12)
    const year = searchParams.get('year');   // ปีที่เลือก

    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // 🌟 หาวันที่ตัดรอบบิล (วันที่ 27 เดือนก่อนหน้า - วันที่ 26 เดือนที่เลือก)
    const startMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const startYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    
    const startDate = new Date(startYear, startMonth - 1, 27, 0, 0, 0); 
    const endDate = new Date(targetYear, targetMonth - 1, 26, 23, 59, 59, 999);

    // ดึงรายจ่ายและรายได้ (ที่แอดมินคีย์มือ) จาก FinancialTransaction
    const manualTransactions = await prisma.financialTransaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    // ดึงรายรับอัตโนมัติ (เงินที่ลูกบ้านโอนจริง) จาก Invoice (สถานะ PAID / PARTIAL)
    const autoInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PAID', 'PARTIAL'] },
        invoiceNo: { not: { startsWith: 'TR-' } }, 
        OR: [
          { paidAt: { gte: startDate, lte: endDate } },
          { updatedAt: { gte: startDate, lte: endDate } } 
        ]
      },
      include: { house: true }
    });

    // แปลงบิล Invoice ให้หน้าตาเหมือน Transaction เพื่อส่งไปโชว์ในตารางเดียวกัน
    const autoTransactions = autoInvoices.map(inv => ({
      id: `AUTO-${inv.id}`,
      type: 'INCOME' as TransactionType,
      categoryId: 'AUTO-INCOME', 
      category: { id: 'AUTO-INCOME', name: 'รายรับค่าส่วนกลาง', type: 'INCOME', isFavorite: true },
      description: `ชำระบิลเดือน ${inv.billingMonth}/${inv.billingYear}`,
      title: `รับโอนค่าส่วนกลาง (บ้านเลขที่ ${inv.house.houseNo})`,
      amount: inv.paidAmount > 0 ? inv.paidAmount : inv.baseAmount,
      date: inv.paidAt || inv.updatedAt,
      recordedBy: 'System',
      isAuto: true, // ป้ายกำกับอัตโนมัติ
      receiptUrl: inv.slipUrl // แปะรูปลงมาเผื่ออยากโชว์
    }));

    // เอามารวมร่างกัน แล้วเรียงวันที่ล่าสุดขึ้นก่อน
    const allTransactions = [...manualTransactions.map(t => ({...t, title: t.description || 'รายการบัญชี', isAuto: false})), ...autoTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // คำนวณสรุปยอดรวมส่งกลับไปให้หน้าบ้าน
    let totalIncome = 0;
    let totalExpense = 0;

    allTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      if (tx.type === 'EXPENSE') totalExpense += tx.amount;
    });

    return NextResponse.json({
      success: true,
      summary: { totalIncome, totalExpense, remaining: totalIncome - totalExpense },
      data: allTransactions,
    });
  } catch (error) {
    console.error('GET Transactions Error:', error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลบัญชีล้มเหลว' }, { status: 500 });
  }
}

// ========================================================
// 2. บันทึกรายการรายรับ-รายจ่ายใหม่ (จากฟอร์มที่แอดมินกรอก)
// ========================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, categoryId, description, title, amount, date, recordedBy, receiptUrl } = body;

    if (!type || !categoryId || !amount || !date) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลจำเป็นให้ครบถ้วน' }, { status: 400 });
    }

    // เอา title มารวมกับ description เพื่อเก็บในฟิลด์ description
    const finalDescription = title ? (description ? `${title} - ${description}` : title) : description;

    const newTransaction = await prisma.financialTransaction.create({
      data: {
        type: type as TransactionType,
        categoryId,
        description: finalDescription,
        amount: parseFloat(amount),
        date: new Date(date),
        recordedBy: recordedBy || 'Admin',
        receiptUrl: receiptUrl || null 
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: newTransaction });
  } catch (error) {
    console.error('POST Transaction Error:', error);
    return NextResponse.json({ success: false, error: 'บันทึกรายการบัญชีล้มเหลว' }, { status: 500 });
  }
}