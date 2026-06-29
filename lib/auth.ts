// ไฟล์: lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
        }

        // 1. หา User จากอีเมลใน Database
        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("ไม่พบบัญชีผู้ใช้งานนี้ในระบบ");
        }

        // 2. เช็กรหัสผ่านว่าตรงกับที่เข้ารหัสไว้ไหม
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        // 3. ถ้าผ่านหมด ส่งข้อมูลกลับไปทำ Session
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // 🌟 ส่ง Role เข้าไปในระบบด้วย
        };
      }
    })
  ],
  callbacks: {
    // 🌟 1. ดักจับและฝังข้อมูลลงใน Token
    async jwt({ token, user, trigger, session }) {
      // ตอนล็อคอินครั้งแรก
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as any).role;
      }
      
      // 🌟 จุดสำคัญ: ดักจับตอนที่หน้าเว็บส่งคำสั่ง update() มา
      if (trigger === "update" && session?.name) {
        token.name = session.name; // สั่งให้ทับชื่อเก่าใน Token ด้วยชื่อใหม่
      }
      
      return token;
    },
    
    // 🌟 2. ส่งข้อมูลจาก Token ออกไปให้หน้าเว็บ (Session) ใช้งาน
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).name = token.name; // ชื่อใหม่จะถูกอัปเดตตรงนี้
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/admin/login', // 🌟 บอกระบบว่าหน้าต่าง Login เราอยู่ไหน
  },
  
  // 🌟 จุดที่เพิ่มเข้ามาที่ 1: ตั้งเวลาหมดอายุ
  session: { 
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // ⏰ บังคับเตะออกอัตโนมัติหากปล่อยทิ้งไว้ 2 ชั่วโมง
  },

  // 🌟 จุดที่เพิ่มเข้ามาที่ 2: ตั้งค่า Cookie ให้เป็นแบบ "Session" แท้ๆ
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // ❌ ไม่ใส่คำสั่ง maxAge ในนี้! เพื่อให้เบราว์เซอร์ลบคุกกี้ทิ้งทันทีที่กดปิด (X)
      }
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
};