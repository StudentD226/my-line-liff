import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./Providers"; // นำเข้า Providers ที่เราเพิ่งสร้าง

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. เปลี่ยนชื่อ Title ตรงนี้ครับ
export const metadata: Metadata = {
  title: "ระบบจัดการค่าส่วนกลาง",
  description: "ระบบบริหารจัดการนิติบุคคล",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2. เปลี่ยนภาษาจาก en เป็น th (ไทย)
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* นำ Providers มาครอบ children ให้รองรับ Session */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}