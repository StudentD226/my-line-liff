import { PrismaClient } from "@prisma/client";
import { 
  Plus, MapPin, Home, Maximize2, Pencil, Trash2, 
  X, UserMinus, Calculator, Coins, Search, Phone, Key 
} from 'lucide-react';
import Link from "next/link";
import { addHouse, updateHouse, autoGenerateHouses } from './actions';
import AutoGenerateButton from './AutoGenerateButton';
import PasscodeCell from "./_components/PasscodeCell";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

// 🌟 ฟังก์ชันสุ่มรหัสใช้สำหรับทำงานแบบกลุ่ม
function generatePasscodeInline(houseNo: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${houseNo}-${randomPart}`;
}

export default async function AdminHousePage(props: { searchParams: Promise<{ edit?: string, add?: string, q?: string, alert?: string }> }) {
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
    const userId = formData.get('userId') as string;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        if (user.lineId) {
          await prisma.report.deleteMany({ where: { lineId: user.lineId } });
        }
        await prisma.user.delete({ where: { id: userId } });
      }
    }
    redirect(`/admin/houses${editId ? `?edit=${editId}&` : '?'}alert=remove_success`);
  };

  const deleteMultipleHouses = async (formData: FormData) => {
    'use server';
    const ids = formData.getAll('houseIds') as string[];
    if (ids.length > 0) {
      await prisma.invoice.deleteMany({ where: { residentHouseId: { in: ids } } });
      await prisma.report.deleteMany({ where: { residentHouseId: { in: ids } } });
      await prisma.user.deleteMany({ where: { residentHouseId: { in: ids } } });
      await prisma.house.deleteMany({ where: { id: { in: ids } } });
      redirect('/admin/houses?alert=delete_multiple_success');
    }
  };

  const generateMultiplePasscodes = async (formData: FormData) => {
    'use server';
    const ids = formData.getAll('houseIds') as string[];
    if (ids.length > 0) {
      const targetHouses = await prisma.house.findMany({
        where: { id: { in: ids } },
        select: { id: true, houseNo: true }
      });
      for (const h of targetHouses) {
        await prisma.house.update({
          where: { id: h.id },
          data: { passcode: generatePasscodeInline(h.houseNo) }
        });
      }
      redirect('/admin/houses?alert=generate_multiple_success');
    }
  };

  const deleteSingleHouse = async (id: string) => {
    'use server';
    await prisma.invoice.deleteMany({ where: { residentHouseId: id } });
    await prisma.report.deleteMany({ where: { residentHouseId: id } });
    await prisma.user.deleteMany({ where: { residentHouseId: id } });
    await prisma.house.delete({ where: { id } });
    redirect('/admin/houses?alert=delete_success');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 w-full">
        
        {/* โหลด Library ปกติ 1 ครั้ง */}
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

        {/* 🌟 Top Action Card */}
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Home className="text-[#376B64] shrink-0" size={32} /> ระบบจัดการ{projectType === 'CONDO' ? 'ห้องพัก' : 'บ้านพัก'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">เพิ่ม แก้ไข ลบข้อมูล และจัดการสมาชิกลูกบ้านทั้งหมดในโครงการ</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
            <Link 
              href="/admin/houses?add=true" 
              className="flex items-center justify-center w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-[#376B64] hover:bg-[#2A524C] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <Plus size={18} className="mr-1 shrink-0" /> <span className="whitespace-nowrap">เพิ่ม{unitLabel}ใหม่</span>
            </Link>
            <div className="w-full sm:w-auto">
              <AutoGenerateButton autoGenerateAction={autoGenerateHouses} />
            </div>
          </div>
        </div>

        {/* 🌟 Search & Filter Section */}
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
              <Link href="/admin/houses" className="absolute right-3 p-1.5 bg-slate-200 hover:bg-rose-200 text-slate-500 hover:text-rose-600 rounded-full transition-colors">
                <X size={14} strokeWidth={3} className="shrink-0" />
              </Link>
            )}
          </form>
        </div>

        {/* 🌟 Table Card */}
        <form action={deleteMultipleHouses} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative w-full">
          
          {/* Bulk Action Bar */}
          <div id="bulkActionBar" className="hidden bg-slate-900 text-white px-4 sm:px-6 py-4 flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in slide-in-from-top duration-300 z-10 relative">
            <span className="text-sm font-bold flex items-center gap-2 whitespace-nowrap">
              <span id="selectedCount" className="flex items-center justify-center bg-[#376B64] text-white w-6 h-6 rounded-full text-xs shadow-sm font-black shrink-0">0</span> รายการที่เลือก
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              
              <button type="button" className="generate-passcode-btn flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-[#EA580C] hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-[0.98] whitespace-nowrap">
                <Key size={14} className="mr-1.5 shrink-0" /> สุ่มรหัสลับให้ยูนิตที่เลือก
              </button>
              <button formAction={generateMultiplePasscodes} type="submit" className="hidden hidden-submit-generate" />

              <button type="button" className="delete-btn flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-[0.98] whitespace-nowrap">
                <Trash2 size={14} className="mr-1.5 shrink-0" /> ลบยูนิตที่เลือกทั้งหมด
              </button>
              <button type="submit" className="hidden hidden-submit-delete" />
            </div>
          </div>

          {/* 🌟 Table Container */}
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      id="selectAllBtn"
                      className="rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">{unitLabel}</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">ขนาดพื้นที่</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">รหัสลับ (Passcode)</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">รูปแบบการคิดเงิน</th>
                  <th className="py-4 px-2 text-sm font-bold tracking-wide text-center whitespace-nowrap">อัตราเรทราคา</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">ข้อมูลติดต่อ</th>
                  <th className="py-4 px-4 text-sm font-bold tracking-wide text-center border-l border-slate-100 whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {houses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center">
                      <Search className="mx-auto text-slate-300 mb-4 shrink-0" size={48} />
                      <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบข้อมูล</h3>
                      <p className="text-slate-500 text-sm">ไม่พบ{unitLabel} {searchQuery && `"${searchQuery}"`} ในระบบ</p>
                    </td>
                  </tr>
                ) : (
                  houses.map((house) => (
                    <tr key={house.id} className="house-row transition-all duration-200 hover:bg-slate-50/50">
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          name="houseIds" 
                          value={house.id} 
                          className="house-checkbox rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-sm border bg-slate-100 text-slate-700 border-slate-200">
                          {house.houseNo}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-slate-700 font-bold text-sm text-center whitespace-nowrap">
                        {house.houseSize} <span className="text-slate-400 font-normal">{sizeLabel}</span>
                      </td>

                      <td className="py-4 px-2 text-center whitespace-nowrap">
                        <div className="flex justify-center">
                          <PasscodeCell houseId={house.id} houseNo={house.houseNo} passcode={house.passcode || null} />
                        </div>
                      </td>

                      <td className="py-4 px-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${house.feeType === 'FIXED' ? 'bg-[#376B64]/10 text-[#376B64]' : 'bg-slate-100 text-slate-600'}`}>
                          {house.feeType === 'FIXED' ? 'เหมาจ่ายรายเดือน' : 'ตามพื้นที่'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-center whitespace-nowrap">
                        <span className="text-slate-900 font-bold text-base">{Number(house.feeRate).toLocaleString('th-TH')} ฿</span>
                      </td>
                      
                      <td className="py-4 px-4 border-l border-slate-50 whitespace-nowrap">
                        {house.residents && house.residents.length > 0 ? (
                          <div className="flex flex-col items-center">
                            <div className="flex flex-nowrap items-center justify-center gap-1.5">
                              <span className="text-sm font-bold text-slate-800 text-center leading-tight">
                                {house.residents[0].name || 'ไม่ได้ระบุชื่อ'}
                              </span>
                              {house.residents.length > 1 && (
                                <span className="text-[10px] font-bold text-[#376B64] bg-[#376B64]/10 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
                                  +{house.residents.length - 1} คน
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-center gap-1 mt-1 text-slate-500 whitespace-nowrap">
                              <Phone size={11} className="shrink-0" />
                              <span className="text-xs font-medium">
                                {(house.residents[0] as any).phone || 'ไม่มีเบอร์โทร'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-400">
                              ว่างเปล่า
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 border-l border-slate-50 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="flex bg-slate-50 p-1.5 rounded-xl gap-1.5 border border-slate-200/60 shadow-sm">
                            <Link href={`/admin/houses?edit=${house.id}${searchQuery ? `&q=${searchQuery}` : ''}`} className="p-2 text-slate-500 hover:text-[#376B64] hover:bg-[#376B64]/10 rounded-lg transition-all shadow-sm hover:shadow">
                              <Pencil size={16} className="shrink-0" />
                            </Link>
                            <div className="relative">
                              <button type="button" className="delete-btn p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shadow-sm hover:shadow">
                                <Trash2 size={16} className="shrink-0" />
                              </button>
                              <button formAction={deleteSingleHouse.bind(null, house.id)} type="submit" className="hidden hidden-submit-delete" />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </form>
      </div>

      {/* =======================================================
          🌟 ระบบ POPUP (MODAL)
          ======================================================= */}
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
                  <><div className="p-2 sm:p-2.5 bg-[#376B64]/10 text-[#376B64] rounded-xl sm:rounded-2xl shrink-0"><Plus size={20} className="shrink-0" /></div> <span className="truncate">เพิ่มยูนิตใหม่</span></>
                )}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <form action={editHouse ? handleUpdateHouse : handleAddHouse} className="space-y-4 sm:space-y-5">
                {editHouse && <input type="hidden" name="id" value={editHouse.id} />}
                
                <div>
                  <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">
                    {unitLabel} {editHouse && <span className="text-rose-500 ml-1 lowercase font-medium tracking-normal">(เปลี่ยนไม่ได้)</span>}
                  </label>
                  <div className="relative">
                    <MapPin className={`absolute left-4 top-3 sm:top-3.5 shrink-0 ${editHouse ? 'text-slate-300' : 'text-slate-400'}`} size={18} />
                    <input suppressHydrationWarning name="houseNo" type="text" defaultValue={editHouse?.houseNo || ""} placeholder="เช่น 99/1" required readOnly={!!editHouse} className={`w-full pl-11 pr-4 py-2.5 sm:py-3 border border-slate-200 rounded-2xl outline-none transition-all font-medium text-sm sm:text-base ${editHouse ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-dashed' : 'bg-white focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10'}`} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">ขนาดพื้นที่ ({sizeLabel})</label>
                  <div className="relative">
                    <Maximize2 className="absolute left-4 top-3 sm:top-3.5 text-slate-400 shrink-0" size={18} />
                    <input suppressHydrationWarning name="houseSize" type="number" step="0.1" defaultValue={editHouse?.houseSize || ""} placeholder="เช่น 50.0" required className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-medium text-sm sm:text-base focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10" />
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-[#F8FAFC] rounded-2xl sm:rounded-[1.5rem] space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">รูปแบบการคิดเงิน</label>
                    <div className="relative">
                      <Calculator className="absolute left-4 top-3 sm:top-3.5 text-slate-400 shrink-0" size={18} />
                      <select name="feeType" defaultValue={editHouse?.feeType || "CALCULATED"} className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-medium text-sm sm:text-base focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 appearance-none">
                        <option value="CALCULATED">คำนวณตามพื้นที่</option>
                        <option value="FIXED">เหมาจ่ายเป็นรายเดือน</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-bold text-slate-700 mb-1 sm:mb-1.5 tracking-wide">อัตราเรทราคา</label>
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
                
                <button suppressHydrationWarning type="submit" className={`w-full text-white font-bold py-3 sm:py-3.5 rounded-2xl transition-all shadow-md active:scale-[0.98] bg-[#376B64] hover:bg-[#2A524C] text-sm sm:text-base mt-2 shrink-0`}>
                  {editHouse ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลยูนิต'}
                </button>
              </form>

              {/* ส่วนของสมาชิกจะโชว์เฉพาะตอนเปิด Popup แก้ไข */}
              {editHouse && (
                <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-100 shrink-0">
                  <h3 className="text-xs sm:text-[14px] font-bold text-slate-800 mb-3 sm:mb-4 flex items-center justify-between">
                    <span>สมาชิกลูกบ้าน</span>
                    <span className="bg-[#376B64]/10 text-[#376B64] px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold">{editHouse.residents.length} คน</span>
                  </h3>
                  {editHouse.residents.length === 0 ? (
                    <div className="text-center py-5 sm:py-6 bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed">
                      <p className="text-xs sm:text-sm font-medium text-slate-400">ยังไม่มีลูกบ้านลงทะเบียน</p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5 max-h-32 sm:max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {editHouse.residents.map((user) => (
                        <li key={user.id} className="flex justify-between items-center bg-white border border-slate-100 p-2.5 sm:p-3 rounded-2xl shadow-sm">
                          <div className="flex flex-col pr-2 min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-700 whitespace-normal break-words leading-tight">{user.name || 'ไม่ได้ตั้งชื่อ'}</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <Phone size={10} className="shrink-0" /> {(user as any).phone || 'ไม่มีเบอร์โทร'}
                            </span>
                          </div>
                          <form action={handleRemoveResident} className="shrink-0">
                            <input type="hidden" name="userId" value={user.id} />
                            <div className="relative">
                              <button type="button" className="delete-btn p-1.5 sm:p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors">
                                <UserMinus size={16} className="shrink-0" />
                              </button>
                              <button type="submit" className="hidden hidden-submit" />
                            </div>
                          </form>
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

      {/* =======================================================
          🌟 ระบบควบคุม (JS) - แก้ไขบัคหน่วงและปุ่มซ้ายเสมอ
          ======================================================= */}
      <script key={alertMessage || 'init'} dangerouslySetInnerHTML={{ __html: `
        (function() {
          const urlParams = new URLSearchParams(window.location.search);
          const alertType = urlParams.get('alert');
          
          if (alertType) {
            let title = 'สำเร็จ!';
            let text = 'ดำเนินการเรียบร้อยแล้ว';
            
            if (alertType === 'add_success') text = 'เพิ่มข้อมูลยูนิตใหม่เรียบร้อยแล้ว';
            if (alertType === 'update_success') text = 'อัปเดตข้อมูลยูนิตเรียบร้อยแล้ว';
            if (alertType === 'delete_success') text = 'ลบข้อมูลบ้าน ลูกบ้าน และประวัติทั้งหมดเรียบร้อยแล้ว';
            if (alertType === 'delete_multiple_success') text = 'ลบรายการบ้าน ลูกบ้าน และประวัติที่เลือกเรียบร้อยแล้ว';
            if (alertType === 'remove_success') text = 'ลบสมาชิกลูกบ้านออกจากระบบถาวรเรียบร้อยแล้ว';
            if (alertType === 'generate_multiple_success') text = 'สร้างรหัสลับใหม่ให้ยูนิตที่เลือกเรียบร้อยแล้ว';

            Swal.fire({
              icon: 'success', 
              title: title, 
              text: text,
              confirmButtonText: 'ตกลง',    
              reverseButtons: false, // 🌟 เปลี่ยนเป็น false เพื่อให้ปุ่มตกลงอยู่ด้านซ้ายมือ
              confirmButtonColor: '#376B64', 
              timer: 3000, 
              timerProgressBar: true,
              customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-8' }
            });

            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('alert');
            window.history.replaceState({}, '', newUrl);
          }

          if (!window.adminHouseEventsBound) {
            window.adminHouseEventsBound = true;

            function updateSelection() {
              const checkboxes = document.querySelectorAll('.house-checkbox');
              const bulkBar = document.getElementById('bulkActionBar');
              const selectAllBtn = document.getElementById('selectAllBtn');
              const selectedCount = document.getElementById('selectedCount');
              
              const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
              const allChecked = checkboxes.length > 0 && checkedBoxes.length === checkboxes.length;
              
              if (bulkBar) {
                if (checkedBoxes.length > 0) {
                  bulkBar.style.display = 'flex';
                } else {
                  bulkBar.style.display = 'none';
                }
              }
              if (selectedCount) {
                selectedCount.textContent = checkedBoxes.length;
              }
              if (selectAllBtn) {
                selectAllBtn.checked = allChecked;
              }

              checkboxes.forEach(cb => {
                const row = cb.closest('tr');
                if (row) {
                  if (cb.checked) {
                    row.style.backgroundColor = 'rgba(55, 107, 100, 0.05)';
                  } else {
                    row.style.backgroundColor = '';
                  }
                }
              });
            }

            document.addEventListener('change', function(e) {
              if (e.target.id === 'selectAllBtn') {
                const checkboxes = document.querySelectorAll('.house-checkbox');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
                updateSelection();
              } 
              else if (e.target.classList.contains('house-checkbox')) {
                updateSelection();
              }
            });

            document.addEventListener('click', function(e) {
              // 🌟 จัดการปุ่มลบ 
              const deleteBtn = e.target.closest('.delete-btn');
              if (deleteBtn) {
                e.preventDefault();
                Swal.fire({
                  title: 'ยืนยันการลบแบบถาวร?',
                  text: "ข้อมูลจะถูกลบเกลี้ยง และไม่สามารถกู้คืนได้!",
                  icon: 'warning',
                  showCancelButton: true,
                  reverseButtons: false, // 🌟 เปลี่ยนเป็น false เพื่อให้ปุ่มตกลง(ใช่) อยู่ด้านซ้ายมือ
                  confirmButtonText: 'ใช่, ลบให้หมด!',
                  cancelButtonText: 'ยกเลิก',
                  confirmButtonColor: '#ef4444',
                  cancelButtonColor: '#94a3b8',
                  customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-6 py-2.5', cancelButton: 'rounded-xl font-bold px-6 py-2.5' }
                }).then((result) => {
                  if (result.isConfirmed) {
                    const hiddenBtn = deleteBtn.parentElement.querySelector('.hidden-submit-delete, .hidden-submit');
                    if (hiddenBtn) hiddenBtn.click();
                  }
                });
              }

              // 🌟 จัดการปุ่มสุ่มรหัสผ่านหลายรายการ
              const generateBtn = e.target.closest('.generate-passcode-btn');
              if (generateBtn) {
                e.preventDefault();
                Swal.fire({
                  title: 'สุ่มรหัสลับใหม่?',
                  text: "ระบบจะสร้างรหัสลับชุดใหม่ให้ยูนิตที่เลือกทั้งหมด รหัสเก่าจะใช้งานไม่ได้ทันที!",
                  icon: 'warning',
                  showCancelButton: true,
                  reverseButtons: false, // 🌟 เปลี่ยนเป็น false เพื่อให้ปุ่มตกลงอยู่ด้านซ้ายมือ
                  confirmButtonText: 'ตกลง, สุ่มรหัสใหม่',
                  cancelButtonText: 'ยกเลิก',
                  confirmButtonColor: '#EA580C',
                  cancelButtonColor: '#94a3b8',
                  customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl font-bold px-6 py-2.5', cancelButton: 'rounded-xl font-bold px-6 py-2.5' }
                }).then((result) => {
                  if (result.isConfirmed) {
                    const hiddenBtn = generateBtn.parentElement.querySelector('.hidden-submit-generate');
                    if (hiddenBtn) hiddenBtn.click();
                  }
                });
              }
            });
          }
        })();
      `}} />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}