'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const initSystem = async () => {
      try {
        await liff.init({ liffId: "2009290251-UZlxLIQJ" });
        
        // ตรวจสอบว่าเปิดเว็บจากในแอป LINE หรือไม่?
        if (liff.isInClient()) {
          // ฝั่งผู้ใช้งาน: เปิดจากแอป LINE -> บังคับล็อกอิน LIFF
          if (!liff.isLoggedIn()) {
            liff.login();
          } else {
            router.push('/dashboard'); // (เปลี่ยนเป็นหน้าหลักของลูกบ้านได้เลย)
          }
        } else {
          // ฝั่งผู้ดูแลระบบ: เปิดจากเว็บบราวเซอร์ปกติ -> นำทางไปยังหน้าเข้าสู่ระบบสำหรับผู้ดูแลระบบ
          router.push('/admin/login');
        }
      } catch (err) {
        // กรณีเกิดข้อผิดพลาดในการเชื่อมต่อ LIFF นำทางไปยังหน้าเข้าสู่ระบบสำหรับผู้ดูแลระบบ
        console.error(err);
        router.push('/admin/login');
      }
    };

    initSystem();
  }, [router]);

  // คืนค่า null เนื่องจากใช้ในการนำทาง (Redirect) เท่านั้น
  return null; 
}