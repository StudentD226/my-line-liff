export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// เชื่อมต่อ Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    
    // รับข้อมูล ประเภท และ วันที่ ที่หน้าบ้านส่งมา
    const type = (data.get('type') as string) || 'OTHER'; 
    const dateStr = (data.get('date') as string) || new Date().toISOString(); 

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 });
    }

    // แปลงไฟล์เป็น Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // แปลงวันที่เป็น ปี-เดือน เช่น "2026-05"
    const dateObj = new Date(dateStr);
    const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    // สร้าง Path โฟลเดอร์ใน Cloudinary (ผลลัพธ์เช่น: financial_receipts/EXPENSE/2026-05)
    const folderPath = `financial_receipts/${type}/${yearMonth}`;

    // สั่งอัปโหลด
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
      folder: folderPath,
    });

    return NextResponse.json({ 
      success: true, 
      url: uploadResponse.secure_url 
    });

  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return NextResponse.json({ success: false, error: 'อัปโหลดขึ้น Cloudinary ล้มเหลว' }, { status: 500 });
  }
}