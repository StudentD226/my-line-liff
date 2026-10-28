import { PrismaClient } from "@prisma/client";
import { 
  Plus, MapPin, Maximize2, Pencil, 
  X, Calculator, Coins, Search, Phone,
  ChevronDown, Building, Users, ShieldAlert
} from 'lucide-react';
import Link from "next/link";
import { addHouse, updateHouse, autoGenerateHouses } from './actions';
import AutoGenerateButton from './AutoGenerateButton';
import HouseTable from "./_components/HouseTable";
import RemoveResidentButton from "./_components/RemoveResidentButton";
import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export default async function AdminHousePage(props: { searchParams: Promise<{ edit?: string, add?: string, q?: string, alert?: string }> }) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isSuperAdmin = isAdmin;

  const searchParams = await props.searchParams;
  const editId = searchParams?.edit;
  const isAdding = searchParams?.add === 'true';
  const searchQuery = searchParams?.q || ''; 
  const alertMessage = searchParams?.alert || '';

  const systemConfig = await prisma.systemConfig.findFirst();
  const globalFlatRate = systemConfig?.flatRateAmount || 500;
  const projectType = systemConfig?.projectType || 'HOUSING_ESTATE';
  const unitLabel = projectType === 'CONDO' ? 'ห้องเลขที่' : 'เลขที่บ้าน';
  const sizeLabel = projectType === 'CONDO' ? 'ตร.ม.' : 'ตร.ว.';

  const allHouses = await prisma.house.findMany({
    include: { 
      owner: true,
      residents: true, 
      _count: { select: { residents: true } }
    }
  });

  let houses = [...allHouses].sort((a, b) => 
    a.houseNo.localeCompare(b.houseNo, undefined, { numeric: true, sensitivity: 'base' })
  );

  if (searchQuery) {
    houses = houses.filter(h => h.houseNo.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  const serializedHouses = houses.map(h => ({
    id: h.id,
    houseNo: h.houseNo,
    houseSize: h.houseSize,
    feeType: h.feeType,
    feeRate: h.feeRate,
    passcode: h.passcode,
    residents: h.residents.map(r => ({
      id: r.id,
      name: r.name,
      phone: (r as any).phone || null
    }))
  }));

  const editHouse = editId ? allHouses.find((h) => h.id === editId) : null;
  const showModal = isAdding || !!editHouse;

  const handleAddHouse = async (formData: FormData) => {
    'use server';
    await addHouse(formData);
    redirect('/admin/houses?alert=add_success');
  };

  const handleUpdateHouse = async (formData: FormData) => {
    'use server';
    await updateHouse(formData);
    redirect('/admin/houses?alert=update_success');
  };

  const handleRemoveResident = async (formData: FormData) => {
    'use server';
    if (!isSuperAdmin) return;
    const userId = formData.get('userId') as string;
    if (userId) {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user) {
          await tx.house.updateMany({ where: { ownerId: userId }, data: { ownerId: null } });
          if (user.lineId) {
            await tx.report.deleteMany({ where: { lineId: user.lineId } });
          }
          await tx.user.delete({ where: { id: userId } });
        }
      });
    }
    redirect(`/admin/houses${editId ? `?edit=${editId}&` : '?'}alert=remove_success`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 w-full">
        
        {/* Header Action Card */}
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building className="text-[#376B64] shrink-0" size={32} /> ระบบจัดการข้อมูล{projectType === 'CONDO' ? 'ห้องพัก' : 'บ้านพัก'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">เพิ่ม แก้ไข ตรวจสอบข้อมูล และจัดการรายชื่อผู้พักอาศัยภายในโครงการ</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
            <Link 
              href="/admin/houses?add=true" 
              className="flex items-center justify-center w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={18} className="mr-1 shrink-0" /> <span className="whitespace-nowrap">เพิ่มข้อมูลยูนิตใหม่</span>
            </Link>
            {isSuperAdmin && (
              <div className="w-full sm:w-auto">
                <AutoGenerateButton autoGenerateAction={autoGenerateHouses} />
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <form method="GET" className="relative w-full md:w-1/3 flex items-center">
            <Search className="absolute left-4 text-slate-400 shrink-0" size={18} />
            <input 
              type="text" 
              name="q" 
              defaultValue={searchQuery}
              autoComplete="off"
              placeholder={`ค้นหา${unitLabel}...`} 
              className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-[#376B64]/10 focus:border-[#376B64] outline-none transition-all font-medium text-slate-700"
            />
            {searchQuery && (
              <Link href="/admin/houses" className="absolute right-3 p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 rounded-full transition-colors">
                <X size={14} strokeWidth={3} className="shrink-0" />
              </Link>
            )}
          </form>
        </div>

        {/* Table Component (Client-side interactive table with Select All & Bulk actions) */}
        <HouseTable
          houses={serializedHouses}
          unitLabel={unitLabel}
          sizeLabel={sizeLabel}
          isSuperAdmin={isSuperAdmin}
          searchQuery={searchQuery}
          alertMessage={alertMessage}
        />
      </div>

      {/* Modal เพิ่ม / แก้ไขข้อมูลยูนิต */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 animate-in zoom-in-95 duration-200 relative my-4 sm:my-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
            
            <Link 
              href="/admin/houses" 
              className="absolute top-4 sm:top-6 right-4 sm:right-6 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 sm:p-2.5 rounded-full transition-colors z-10 shrink-0"
            >
              <X size={20} className="shrink-0" />
            </Link>

            <div className="mb-6 mt-2 pr-8 sm:pr-0 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
                {editHouse ? (
                  <><div className="p-2 sm:p-2.5 bg-[#376B64]/10 text-[#376B64] rounded-xl sm:rounded-2xl shrink-0"><Pencil size={20} className="shrink-0" /></div> <span className="truncate">แก้ไขข้อมูลยูนิต</span></>
                ) : (
                  <><div className="p-2 sm:p-2.5 bg-[#376B64]/10 text-[#376B64] rounded-xl sm:rounded-2xl shrink-0"><Plus size={20} className="shrink-0" /></div> <span className="truncate">เพิ่มข้อมูลยูนิตใหม่</span></>
                )}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <form action={editHouse ? handleUpdateHouse : handleAddHouse} className="space-y-4 sm:space-y-5">
                {editHouse && <input type="hidden" name="id" value={editHouse.id} />}
                
                <div>
                  <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">
                    {unitLabel} {editHouse && <span className="text-red-500 ml-1 lowercase font-medium tracking-normal">(ข้อมูลอ้างอิงหลัก ไม่สามารถเปลี่ยนแปลงได้)</span>}
                  </label>
                  <div className="relative">
                    <MapPin className={`absolute left-4 top-3 sm:top-3.5 shrink-0 ${editHouse ? 'text-slate-300' : 'text-slate-400'}`} size={18} />
                    <input suppressHydrationWarning name="houseNo" type="text" defaultValue={editHouse?.houseNo || ""} placeholder="ตัวอย่าง 99/1" required readOnly={!!editHouse} className={`w-full pl-11 pr-4 py-2.5 sm:py-3 border border-slate-200 rounded-2xl outline-none transition-all font-medium text-sm sm:text-base ${editHouse ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-dashed' : 'bg-white focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10'}`} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">ขนาดพื้นที่อ้างอิง ({sizeLabel})</label>
                  <div className="relative">
                    <Maximize2 className="absolute left-4 top-3 sm:top-3.5 text-slate-400 shrink-0" size={18} />
                    <input suppressHydrationWarning name="houseSize" type="number" step="0.1" defaultValue={editHouse?.houseSize || ""} placeholder="ตัวอย่าง 50.0" required className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-medium text-sm sm:text-base focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10" />
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-[#F8FAFC] rounded-2xl sm:rounded-[1.5rem] space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">รูปแบบการประเมินค่าใช้จ่าย</label>
                    <div className="relative">
                      <Calculator className="absolute left-4 top-3 sm:top-3.5 text-slate-400 shrink-0" size={18} />
                      <select name="feeType" defaultValue={editHouse?.feeType || "CALCULATED"} className="w-full pl-11 pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-medium text-sm sm:text-base focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 appearance-none cursor-pointer">
                        <option value="CALCULATED">คำนวณตามพื้นที่ตารางหน่วย</option>
                        <option value="FIXED">จัดเก็บตามอัตราเหมาจ่ายคงที่</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-3 sm:top-3.5 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">อัตราอ้างอิง</label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-3 sm:top-3.5 text-slate-400 shrink-0" size={18} />
                      <input 
                        suppressHydrationWarning 
                        name="feeRate" 
                        type="number" 
                        step="0.01" 
                        defaultValue={editHouse?.feeRate || globalFlatRate} 
                        required 
                        className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-bold text-sm sm:text-base text-slate-800 focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  {/* ปุ่มยืนยัน/ตกลงอยู่ด้านซ้ายเสมอ ปุ่มยกเลิกอยู่ด้านขวา */}
                  <button suppressHydrationWarning type="submit" className="flex-1 text-white font-bold py-3 sm:py-3.5 rounded-2xl transition-all shadow-md active:scale-[0.98] bg-[#376B64] hover:bg-[#2A524C] text-sm sm:text-base shrink-0 order-1">
                    {editHouse ? 'บันทึกข้อมูลการเปลี่ยนแปลง' : 'ยืนยันการเพิ่มข้อมูลยูนิต'}
                  </button>
                  <Link href="/admin/houses" className="flex-1 text-center bg-gray-100 text-gray-700 font-bold py-3 sm:py-3.5 rounded-2xl hover:bg-gray-200 transition-colors text-sm sm:text-base order-2">
                    ยกเลิกรายการ
                  </Link>
                </div>
              </form>

              {/* ส่วนของสมาชิกจะโชว์เฉพาะตอนเปิด Popup แก้ไข */}
              {editHouse && (
                <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-100 shrink-0">
                  <h3 className="text-xs sm:text-[14px] font-bold text-slate-800 mb-3 sm:mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Users size={16} className="text-slate-500" /> รายชื่อผู้พักอาศัยอ้างอิง</span>
                    <span className="bg-[#376B64]/10 text-[#376B64] px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold">{editHouse.residents.length} รายการ</span>
                  </h3>
                  {editHouse.residents.length === 0 ? (
                    <div className="text-center py-5 sm:py-6 bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed flex flex-col items-center gap-2">
                      <ShieldAlert size={24} className="text-slate-300" />
                      <p className="text-xs sm:text-sm font-medium text-slate-400">ยังไม่มีข้อมูลผู้พักอาศัยลงทะเบียน</p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5 max-h-32 sm:max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {editHouse.residents.map((user) => (
                        <li key={user.id} className="flex justify-between items-center bg-white border border-slate-100 p-2.5 sm:p-3 rounded-2xl shadow-sm">
                          <div className="flex flex-col pr-2 min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-700 whitespace-normal break-words leading-tight">{user.name || 'ไม่ปรากฏชื่อ'}</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <Phone size={10} className="shrink-0" /> {(user as any).phone || 'ไม่มีข้อมูลอ้างอิง'}
                            </span>
                          </div>
                          {isSuperAdmin && (
                            <RemoveResidentButton 
                              userId={user.id} 
                              userName={user.name || ''} 
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}