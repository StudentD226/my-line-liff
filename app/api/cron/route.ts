export const dynamic = 'force-dynamic';
import { GET as billingGET, POST as billingPOST } from './billing/route';

// 🌟 Route กลางสำหรับ /api/cron ให้ forward ไปที่ /api/cron/billing เพื่อรองรับ backward compatibility
export async function GET(request: Request) {
  return billingGET(request);
}

export async function POST(request: Request) {
  return billingPOST(request);
}
