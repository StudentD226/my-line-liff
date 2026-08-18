import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. ถ้ามี Token (ล็อกอินแล้ว) แต่ดันกดมาหน้า Login ให้เตะเข้าหน้า Dashboard เลย
    if (path === "/admin/login" && token) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // 2. ถ้าพยายามเข้าหน้า จัดการทีมงาน แต่ไม่ใช่ ADMIN หรือ SUPER_ADMIN ให้เตะกลับไปหน้าแรก
    if (path.startsWith("/admin/staff") && token?.role !== "SUPER_ADMIN" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // 3. ป้องกัน API ข้อมูลสำคัญ (RBAC Backend Security)
    const adminApiPaths = [
      "/api/admin/staff",
      "/api/admin/settings",
      "/api/admin/delete-invoices"
    ];
    if (adminApiPaths.some(p => path.startsWith(p)) && token?.role !== "SUPER_ADMIN" && token?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์เข้าถึง (Unauthorized)" }, { status: 403 });
    }
  },
  {
    callbacks: {
      // 3. กฎการอนุญาต: ถ้าเป็นหน้า Login ให้ปล่อยผ่านไปเลย (แก้ปัญหาลูปนรก) ถ้าหน้าอื่นต้องมี Token
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname === "/admin/login") {
          return true; 
        }
        return !!token;
      },
    },
    pages: {
      signIn: "/admin/login", // บอกระบบว่าหน้า Login อยู่ไหน
    }
  }
);

export const config = { 
  matcher: ["/admin/:path*", "/api/admin/:path*"] 
};