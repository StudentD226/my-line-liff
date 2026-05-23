'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// 🌟 1. เพิ่มไอคอน PieChart นำเข้าจาก lucide-react
import { Home, FileText, CheckCircle, Users, LayoutDashboard, Wrench, Bell, UserCircle, PieChart } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // ใช้เพื่อเช็คว่าตอนนี้อยู่หน้าไหน

  const menuItems = [
    { icon: LayoutDashboard, label: 'ภาพรวมระบบ', href: '/admin' },
    { icon: Home, label: 'จัดการข้อมูลบ้าน', href: '/admin/houses' },
    { icon: FileText, label: 'จัดการบิล/เรียกเก็บ', href: '/admin/invoices' },
    { icon: CheckCircle, label: 'ตรวจสอบการโอน', href: '/admin/review-slips' },
    { icon: PieChart, label: 'รายงานการเงิน', href: '/admin/financial' }, // 🌟 2. เพิ่มเมนูใหม่ตรงนี้ครับ
    { icon: Wrench, label: 'ศูนย์รับเรื่อง/แจ้งซ่อม', href: '/admin/maintenance' }, 
    { icon: Users, label: 'สมาชิกลูกบ้าน', href: '/admin/users' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* 🌟 แถบเมนูด้านซ้าย (Sidebar) */}
      <aside className="w-72 bg-white border-r border-slate-200 fixed h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col">
        <div className="p-7 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Logo Area */}
          <div className="flex items-center gap-3.5 mb-10">
            <div className="w-11 h-11 bg-gradient-to-br from-[#376B64] to-[#2A524C] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#376B64]/30">
              A
            </div>
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              Admin<span className="text-[#376B64]">Panel</span>
            </span>
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
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 font-bold group
                    ${isActive 
                      ? 'bg-[#376B64] text-white shadow-md shadow-[#376B64]/20 scale-[1.02]' 
                      : 'text-slate-500 hover:bg-[#376B64]/10 hover:text-[#376B64]'
                    }`}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#376B64]'}`} 
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area of Sidebar */}
        <div className="p-7 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-600">ระบบทำงานปกติ (Online)</span>
          </div>
        </div>
      </aside>

      {/* 🌟 พื้นที่แสดงเนื้อหาตรงกลาง (Main Content) */}
      <main className="ml-72 flex-1 flex flex-col min-h-screen">
        
        {/* Header แถบบน */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            {/* ปล่อยว่างไว้ หรือใส่ Breadcrumb ในอนาคต */}
          </div>
          
          <div className="flex items-center gap-5">
            <button className="relative p-2 text-slate-400 hover:text-[#376B64] transition-colors bg-slate-50 hover:bg-[#376B64]/10 rounded-full">
              <Bell size={20} strokeWidth={2.5} />
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200"></div>
            
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors">
              <div className="w-9 h-9 bg-slate-100 text-[#376B64] rounded-full flex items-center justify-center border border-slate-200">
                <UserCircle size={24} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700 leading-none">ผู้ดูแลระบบ</span>
                <span className="text-[10px] font-bold text-[#376B64] uppercase tracking-widest mt-1">นิติบุคคล</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1">
          {children}
        </div>
        
      </main>

      {/* สไตล์สำหรับ Scrollbar ของ Sidebar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #cbd5e1; }
      `}} />
    </div>
  );
}