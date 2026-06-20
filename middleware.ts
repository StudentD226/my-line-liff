import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 🌟 ถ้าพยายามเข้าหน้า จัดการทีมงาน แต่ไม่ใช่ ADMIN หรือ SUPER_ADMIN ให้เตะกลับไปหน้าแรก
    if (path.startsWith("/admin/staff") && token?.role !== "SUPER_ADMIN" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  },
  {
    callbacks: {
      // 🌟 อนุญาตให้เข้าได้เฉพาะคนที่มี Token (ล็อกอินแล้วเท่านั้น)
      authorized: ({ token }) => !!token,
    },
  }
);

// 🌟 บังคับให้ยามเฝ้าเฉพาะหน้าที่ขึ้นต้นด้วย /admin (ยกเว้นหน้า login)
export const config = { 
  matcher: ["/admin/:path*"] 
};