import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('lineId');

    if (!lineId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ lineId' }, { status: 400 });
    }

    const rawReports = await prisma.report.findMany({
      where: { lineId: lineId },
      orderBy: { createdAt: 'desc' },
    });

    const tickets = rawReports.map((r) => {
      let extraData = { expectedDate: '', history: [] as any[] };
      if (r.adminNote) {
        try {
          extraData = JSON.parse(r.adminNote);
        } catch (e) {}
      }

      return {
        id: r.id,
        ticketNo: r.ticketNo,
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        reportedDate: r.createdAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        expectedDate: extraData.expectedDate,
        history: extraData.history,
        imageUrl: r.imageUrl, // รูปลูกบ้าน
      };
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error("GET Maintenance History Error:", error);
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}