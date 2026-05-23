import { NextResponse } from 'next/server';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================================
// 1. ดึงข้อมูลรายรับ-รายจ่าย (สำหรับไปทำกราฟและตารางสรุปผล)
// ========================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // เช่น '7' (กรกฎาคม)
    const year = searchParams.get('year');   // เช่น '2026'

    // ตั้งค่าตัวกรองเริ่มต้นเป็นเดือนปัจจุบันถ้าแอดมินไม่ได้เลือก
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // กำหนดวันเริ่มต้นและสิ้นสุดของเดือนนั้นๆ
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // ดึงข้อมูลรายการทั้งหมดในเดือนนั้น พร้อมดึงชื่อหมวดหมู่มาด้วย
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true, // ดึงข้อมูลจากตาราง TransactionCategory มาร่วมด้วย
      },
      orderBy: {
        date: 'desc', // เอาวิหารล่าสุดขึ้นก่อน
      },
    });

    // คำนวณสรุปยอดรวมส่งกลับไปให้หน้าบ้านใช้ง่ายๆ
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      if (tx.type === 'EXPENSE') totalExpense += tx.amount;
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        remaining: totalIncome - totalExpense, // ยอดคงเหลือสะสมในเดือน
      },
      data: transactions,
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
    const { type, categoryId, description, amount, date, recordedBy } = body;

    // ตรวจสอบข้อมูลจำเป็น
    if (!type || !categoryId || !amount || !date) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลจำเป็นให้ครบถ้วน' }, { status: 400 });
    }

    const newTransaction = await prisma.financialTransaction.create({
      data: {
        type: type as TransactionType,
        categoryId,
        description,
        amount: parseFloat(amount),
        date: new Date(date),
        recordedBy: recordedBy || 'Admin',
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