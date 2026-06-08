'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, FileText, CheckCircle, Users, LayoutDashboard, 
  Wrench, Bell, UserCircle, PieChart, Menu, X, Megaphone 
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // 🌟 ตั้งค่าเริ่มต้น: ถ้าจอใหญ่เปิดค้างไว้ ถ้าจอเล็กปิดไว้ก่อน
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // เช็คขนาดหน้าจอตอนโหลดครั้งแรก (เพื่อซ่อนเมนูอัตโนมัติบนจอเล็ก)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  // 🌟 เพิ่มและแยกเมนู "จัดการข่าวประกาศ" กับ "ศูนย์รับเรื่อง/แจ้งซ่อม" ออกจากกัน
  const menuItems = [
    { icon: LayoutDashboard, label: 'ภาพรวมระบบ', href: '/admin' },
    { icon: Megaphone, label: 'จัดการข่าวประกาศ', href: '/admin/news' },
    { icon: Wrench, label: 'ศูนย์รับเรื่อง/แจ้งซ่อม', href: '/admin/maintenance' }, 
    { icon: Home, label: 'จัดการข้อมูลบ้าน', href: '/admin/houses' },
    { icon: FileText, label: 'จัดการบิล/เรียกเก็บ', href: '/admin/invoices' },
    { icon: CheckCircle, label: 'ตรวจสอบการโอน', href: '/admin/review-slips' },
    { icon: PieChart, label: 'รายงานการเงิน', href: '/admin/financial' },
    { icon: Users, label: 'สมาชิกลูกบ้าน', href: '/admin/users' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden w-full relative">
      
      {/* 🌟 Overlay พื้นหลังสีดำเบลอๆ เวลาเปิดเมนูบนหน้าจอต่ำกว่า lg (1024px) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 🌟 แถบเมนูด้านซ้าย (Sidebar) ผูกการแสดงผลกับ isSidebarOpen 100% */}
      <aside 
        className={`w-72 bg-white border-r border-slate-200 fixed h-full z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} 
      >
        <div className="p-7 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Logo Area */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-gradient-to-br from-[#376B64] to-[#2A524C] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#376B64]/30 shrink-0">
                A
              </div>
              <span className="text-2xl font-black text-slate-800 tracking-tight truncate">
                Admin<span className="text-[#376B64]">Panel</span>
              </span>
            </div>
            
            {/* 🌟 ปุ่ม X ปิดเมนู (โชว์เฉพาะจอเล็กกว่า lg เพราะจอใหญ่เรามีปุ่ม Hamburger ด้านบนแล้ว) */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors shrink-0"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
          
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">เมนูการจัดการ</p>
          
          {/* Navigation */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
              
              return (
                <Link 
                  key={item.label}
                  href={item.href} 
                  // 🌟 บนมือถือให้ปิดเมนูอัตโนมัติเมื่อกดเลือกลิงก์
                  onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)} 
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 font-bold group
                    ${isActive 
                      ? 'bg-[#376B64] text-white shadow-md shadow-[#376B64]/20 scale-[1.02]' 
                      : 'text-slate-500 hover:bg-[#376B64]/10 hover:text-[#376B64]'
                    }`}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#376B64]'}`} 
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area of Sidebar */}
        <div className="p-7 border-t border-slate-100 shrink-0">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <span className="text-xs font-bold text-slate-600 truncate">ระบบทำงานปกติ (Online)</span>
          </div>
        </div>
      </aside>

      {/* 🌟 พื้นที่แสดงเนื้อหา (Main Content) - ยืดหด margin-left ตามการเปิดปิดของ Sidebar (เฉพาะจอใหญ่) */}
      <main className={`flex-1 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        
        {/* Header แถบบน */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-10 w-full shrink-0">
          <div className="flex items-center gap-3">
            {/* 🌟 ปุ่ม Hamburger (โชว์ตลอดเวลา) ใช้เปิด/ปิด Sidebar */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 text-slate-500 hover:bg-[#376B64]/10 hover:text-[#376B64] rounded-xl transition-colors shrink-0"
            >
              <Menu size={24} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5 shrink-0">
            <button className="relative p-2 text-slate-400 hover:text-[#376B64] transition-colors bg-slate-50 hover:bg-[#376B64]/10 rounded-full hidden sm:block shrink-0">
              <Bell size={20} strokeWidth={2.5} />
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200 hidden sm:block shrink-0"></div>
            
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-slate-50 p-1 md:p-1.5 md:pr-3 rounded-full transition-colors">
              <div className="w-9 h-9 bg-slate-100 text-[#376B64] rounded-full flex items-center justify-center border border-slate-200 shrink-0">
                <UserCircle size={24} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-sm font-bold text-slate-700 leading-none">ผู้ดูแลระบบ</span>
                <span className="text-[10px] font-bold text-[#376B64] uppercase tracking-widest mt-1">นิติบุคคล</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - รองรับ Fluid ยืดหยุ่นทุกขนาดจอ */}
        <div className="flex-1 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
        
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #cbd5e1; }
      `}} />
    </div>
  );
}