'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';

export default function LiffIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: "2009290251-UZlxLIQJ" });
        
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          // 🌟 วาร์ปผู้ใช้ไปหน้าหลักของระบบ (ลูกพี่เปลี่ยน "/dashboard" เป็นหน้าเว็บของลูกบ้านได้เลยครับ)
          router.push('/dashboard'); 
        }
      } catch (err) {
        console.error("LIFF Initialization failed", err);
      }
    };

    initLiff();
  }, [router]);

  // 🌟 จุดสำคัญ: คืนค่า null เพื่อไม่ให้วาด UI อะไรบนหน้าจอเลย (จะเห็นแค่หน้าขาวแวบเดียวแล้ววาร์ปทันที)
  return null; 
}