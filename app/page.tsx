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
        
        // 🌟 เซ็นเซอร์แยกคน: ตรวจสอบว่าเปิดเว็บจากในแอป LINE หรือไม่?
        if (liff.isInClient()) {
          // 📱 ฝั่งลูกบ้าน: เปิดจากแอป LINE -> บังคับล็อกอิน LIFF
          if (!liff.isLoggedIn()) {
            liff.login();
          } else {
            router.push('/dashboard'); // (เปลี่ยนเป็นหน้าหลักของลูกบ้านได้เลย)
          }
        } else {
          // 💻 ฝั่งแอดมิน: เปิดจากเว็บปกติ -> วาร์ปหนีไปหน้า Login หลังบ้านทันที!!
          router.push('/admin/login');
        }
      } catch (err) {
        // ถ้า LIFF มีปัญหา หรือรันใน Localhost คอมพิวเตอร์ ให้วาร์ปไปหน้าแอดมินเลย
        console.error(err);
        router.push('/admin/login');
      }
    };

    initSystem();
  }, [router]);

  // คืนค่า null เพื่อไม่ให้แสดง UI อะไรเลย (เห็นแค่หน้าขาวเสี้ยววินาทีแล้ววาร์ปทันที)
  return null; 
}