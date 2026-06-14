import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function getMimeType(filename: string, originalType: string): string {
  if (originalType && originalType !== 'application/octet-stream') return originalType;
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
  };
  return map[ext || ''] || 'image/jpeg';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('slip') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = getMimeType(file.name, file.type);

    // ลอง gemini-2.0-flash ซึ่ง support vision ได้ดีกว่า 1.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are an expert OCR system for Thai bank transfer slips.
Extract data from the image and respond ONLY with a valid JSON object. No markdown, no explanation.

JSON format:
{
  "amount": <number or null>,
  "date": "<YYYY-MM-DD or null>",
  "time": "<HH:mm or null>",
  "senderName": "<string or null>",
  "receiverName": "<string or null>",
  "bankRef": "<string or null>",
  "bankName": "<string or null>"
}

If the image is a Thai bank app screenshot, look for:
- ยอดเงิน / จำนวนเงิน = amount
- ชื่อผู้โอน / จากบัญชี = senderName  
- ชื่อผู้รับ / ไปยัง = receiverName
- เลขที่อ้างอิง / รหัสอ้างอิง = bankRef
    `;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64Image, mimeType } },
    ]);

    let responseText = result.response.text().trim();
    
    // กัน case ที่ Gemini ห่อด้วย ```json ... ```
    responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');

    const extractedData = JSON.parse(responseText);
    return NextResponse.json({ success: true, data: extractedData });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'อ่านสลิปไม่ได้' 
    }, { status: 500 });
  }
}