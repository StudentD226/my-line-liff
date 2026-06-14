export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// เรียกใช้งาน Google Gemini SDK ด้วยคีย์ใน Vercel / .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('slip') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์สลิปโอนเงิน' }, { status: 400 });
    }

    // 1. แปลงไฟล์รูปภาพสลิปให้อยู่ในรูปแบบ Buffer และ Base64 เพื่อส่งให้ Gemini อ่าน
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    // 2. เรียกใช้โมเดลระดับท็อปด้านการอ่านภาพสลิป
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    // 3. ส่ง Prompt ไม้ตายเพื่อสั่งให้ AI แกะข้อมูลสลิปธนาคารไทยอย่างแม่นยำ
    const prompt = `
      You are an expert OCR system specializing in Thai Bank transfer slips.
      Analyze the attached slip image and extract the following information into a strict JSON format.
      
      Do not include any markdown formatting, only valid JSON.
      If any field cannot be read or found, set it to null.

      The JSON structure MUST be exactly like this:
      {
        "amount": number (Total transfer amount, e.g. 500.00),
        "date": "YYYY-MM-DD" (Transfer date in Gregorian calendar format, e.g. "2026-06-14"),
        "time": "HH:mm" (Transfer time in 24-hour format, e.g. "15:42"),
        "senderName": "string" (Full name of the sender person in Thai or English),
        "receiverName": "string" (Full name of the receiver/juristic office),
        "bankRef": "string" (Transaction ID / Reference Number)
      }
    `;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type,
      },
    };

    // 4. ยิงสั่งให้ AI ประมวลผลภาพสลิป
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // แปลงข้อความสติง JSON จาก AI ให้กลายเป็น Object
    const extractedData = JSON.parse(responseText);

    return NextResponse.json({ success: true, data: extractedData });

  } catch (error: any) {
    console.error('Gemini Scan Slip Error:', error);
    return NextResponse.json({ success: false, error: 'AI ไม่สามารถอ่านข้อมูลสลิปนี้ได้' }, { status: 500 });
  }
}