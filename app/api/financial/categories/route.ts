export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. ดึงข้อมูลหมวดหมู่ทั้งหมด (GET)
// ==========================================
export async function GET() {
  try {
    const categories = await prisma.transactionCategory.findMany({
      orderBy: {
        name: 'asc' // เรียงตามตัวอักษร
      }
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถดึงข้อมูลหมวดหมู่ได้" }, { status: 500 });
  }
}

// ==========================================
// 2. สร้างหมวดหมู่ใหม่ (POST) - สำหรับตอนกด "+ สร้างหมวดหมู่ใหม่"
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, error: "กรุณาระบุชื่อและประเภทหมวดหมู่" }, { status: 400 });
    }

    const newCategory = await prisma.transactionCategory.create({
      data: {
        name: name,
        type: type as TransactionType,
      }
    });

    return NextResponse.json({ success: true, data: newCategory });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ success: false, error: "ไม่สามารถสร้างหมวดหมู่ได้" }, { status: 500 });
  }
}