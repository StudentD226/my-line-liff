import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 🌟 สร้างชื่อไฟล์ใหม่ไม่ให้ซ้ำกัน (ใช้ Timestamp)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${uniqueSuffix}-${file.name.replace(/\s/g, '_')}`;
    
    // 🌟 กำหนดที่เก็บไฟล์ ไว้ในโฟลเดอร์ public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // ถ้ายังไม่มีโฟลเดอร์ uploads ให้สร้างใหม่
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // 🌟 ส่ง URL ของรูปกลับไปให้หน้าเว็บ
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: 'อัปโหลดล้มเหลว' }, { status: 500 });
  }
}