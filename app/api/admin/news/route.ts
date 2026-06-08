import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendLineBroadcast } from '@/lib/line'; // 🌟 นำเข้าฟังก์ชันส่ง LINE

const prisma = new PrismaClient();

// ... (ฟังก์ชัน GET และ DELETE เก็บไว้เหมือนเดิมได้เลยครับ) ...

// 2. สร้าง หรือ แก้ไข ข่าวประกาศ (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, category, content, status, sendLine, scheduledAt } = body;

    let savedNews;

    // ถ้ามี id ส่งมา แสดงว่าเป็นการ "แก้ไข" (Update)
    if (id) {
      savedNews = await prisma.news.update({
        where: { id: id },
        data: {
          title, category, content, status,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
      });
    } 
    // ถ้าไม่มี id แสดงว่าเป็นการ "สร้างใหม่" (Create)
    else {
      savedNews = await prisma.news.create({
        data: {
          title, category, content, status,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
      });
    }

    // 🌟 ถ้ายืนยันการเผยแพร่ และเลือกให้ส่ง LINE ด้วย
    if (sendLine && status === 'PUBLISHED') {
      const isSuccess = await sendLineBroadcast(title, content, category);
      
      // ถ้าส่ง LINE สำเร็จ ให้ไปบวกเลขจำนวนผู้รับเพิ่ม (อัปเดต recipients)
      if (isSuccess) {
        // สมมติว่าดึงจำนวนลูกบ้านทั้งหมดที่มีอยู่ในระบบ
        const userCount = await prisma.user.count({ where: { isNotify: true } });
        await prisma.news.update({
          where: { id: savedNews.id },
          data: { recipients: userCount }
        });
      }
    }

    return NextResponse.json({ success: true, data: savedNews });
  } catch (error) {
    console.error("POST News Error:", error);
    return NextResponse.json({ success: false, error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}