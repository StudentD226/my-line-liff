import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function getMimeType(filename: string, originalType: string): string {
  if (originalType && originalType !== 'application/octet-stream' && originalType !== '') {
    return originalType;
  }
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return map[ext || ''] || 'image/jpeg';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('slip') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์สลิป' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = getMimeType(file.name, file.type);

    console.log('[ScanSlip] file:', file.name, '| type:', file.type, '| resolved:', mimeType);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are an expert OCR system for Thai bank transfer slips (ใบสลิปธนาคารไทย).
This image is a screenshot from a Thai banking app on a smartphone.

Carefully read ALL text visible in the image, then respond ONLY with a raw JSON object.
No markdown, no backticks, no explanation. Just the JSON.

{
  "amount": <number e.g. 500.00, or null>,
  "date": "<YYYY-MM-DD in Gregorian calendar, or null>",
  "time": "<HH:mm in 24-hour format, or null>",
  "senderName": "<full name of sender in Thai or English, or null>",
  "receiverName": "<full name of receiver in Thai or English, or null>",
  "bankRef": "<transaction reference number, or null>",
  "bankName": "<bank name e.g. ธนาคารกสิกรไทย, or null>"
}

Thai keywords to look for:
- ยอดเงิน / จำนวนเงิน / โอนเงิน = amount
- ชื่อผู้โอน / จาก / บัญชีต้นทาง = senderName
- ชื่อผู้รับ / ถึง / ไปยัง / บัญชีปลายทาง = receiverName
- เลขที่อ้างอิง / รหัสอ้างอิง / Ref / Transaction ID = bankRef
- วันที่ / Date = date (convert Buddhist year to Gregorian if needed, e.g. 2568 → 2025)
- เวลา / Time = time
`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64Image, mimeType } },
    ]);

    let responseText = result.response.text().trim();
    console.log('[ScanSlip] RAW GEMINI:', responseText);

    // ลบ markdown wrapper ถ้ามี
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const extractedData = JSON.parse(responseText);
    console.log('[ScanSlip] Parsed:', extractedData);

    return NextResponse.json({ success: true, data: extractedData });

  } catch (error: any) {
    console.error('[ScanSlip] Error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'ไม่สามารถอ่านสลิปได้' },
      { status: 500 }
    );
  }
}