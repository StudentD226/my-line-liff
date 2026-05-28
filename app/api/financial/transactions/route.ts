export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================================
// 1. ดึงข้อมูลรายรับ-รายจ่าย (รองรับทั้ง รายเดือน และ รายปี)
// ========================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month'); // ส่งมาถ้าดูหน้า "จัดการบัญชีรายเดือน"
    const yearStr = searchParams.get('year');   // ส่งมาทั้งสองหน้า

    let startDate: Date;
    let endDate: Date;

    // 🌟 เช็คว่าหน้าเว็บส่งอะไรมา (รายเดือน หรือ รายปี)
    if (monthStr && yearStr) {
      // 📅 โหมด 1: หน้าจอ "รายเดือน" (ตัดรอบบิล 27 - 26)
      const targetMonth = parseInt(monthStr);
      const targetYear = parseInt(yearStr);
      const startMonth = targetMonth === 1 ? 12 : targetMonth - 1;
      const startYear = targetMonth === 1 ? targetYear - 1 : targetYear;
      
      startDate = new Date(startYear, startMonth - 1, 27, 0, 0, 0); 
      endDate = new Date(targetYear, targetMonth - 1, 26, 23, 59, 59, 999);
    } else if (yearStr) {
      // 📅 โหมด 2: หน้าจอ "ภาพรวมรายปี" ของแอดมินหน้าแรก (1 ม.ค. - 31 ธ.ค.)
      const targetYear = parseInt(yearStr);
      startDate = new Date(targetYear, 0, 1, 0, 0, 0);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    } else {
      // กรณี Default ถ้าไม่ส่งอะไรมาเลย เอาเดือนปัจจุบัน
      const targetMonth = new Date().getMonth() + 1;
      const targetYear = new Date().getFullYear();
      const startMonth = targetMonth === 1 ? 12 : targetMonth - 1;
      const startYear = targetMonth === 1 ? targetYear - 1 : targetYear;
      startDate = new Date(startYear, startMonth - 1, 27, 0, 0, 0); 
      endDate = new Date(targetYear, targetMonth - 1, 26, 23, 59, 59, 999);
    }

    // 1️⃣ ดึงรายจ่ายและรายได้ (ที่แอดมินคีย์มือ) จากช่วงเวลาที่กำหนด
    const manualTransactions = await prisma.financialTransaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    // 2️⃣ ดึงรายรับอัตโนมัติ (เงินที่ลูกบ้านโอนจริง) จาก Invoice
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

    // 3️⃣ แปลงบิล Invoice ให้หน้าตาเหมือน Transaction
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
      isAuto: true,
      receiptUrl: inv.slipUrl
    }));

    // 4️⃣ เอามารวมร่างกัน แล้วเรียงวันที่ล่าสุดขึ้นก่อน
    const allTransactions = [...manualTransactions.map(t => ({...t, title: t.description || 'รายการบัญชี', isAuto: false})), ...autoTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 5️⃣ คำนวณสรุปยอดรวมส่งกลับไปให้หน้าบ้าน
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
// 2. บันทึกรายการรายรับ-รายจ่ายใหม่ (POST)
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