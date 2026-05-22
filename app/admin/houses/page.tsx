import { PrismaClient } from "@prisma/client";
import { 
  Plus, MapPin, Home, Maximize2, Pencil, Trash2, 
  X, UserMinus, Calculator, Coins, Search, ListChecks 
} from 'lucide-react';
import Link from "next/link";
import { addHouse, updateHouse, autoGenerateHouses } from './actions';
import AutoGenerateButton from './AutoGenerateButton';
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export default async function AdminHousePage(props: { searchParams: Promise<{ edit?: string, q?: string, alert?: string }> }) {
  const searchParams = await props.searchParams;
  const editId = searchParams?.edit;
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

  const deleteSingleHouse = async (id: string) => {
    'use server';
    await prisma.invoice.deleteMany({ where: { residentHouseId: id } });
    await prisma.report.deleteMany({ where: { residentHouseId: id } });
    await prisma.user.deleteMany({ where: { residentHouseId: id } });
    await prisma.house.delete({ where: { id } });
    redirect('/admin/houses?alert=delete_success');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-[#376B64]/10 text-[#376B64] rounded-2xl flex items-center justify-center shadow-inner">
              <Home size={28} strokeWidth={2} />
            </div>
            จัดการข้อมูล{projectType === 'CONDO' ? 'ห้องพัก' : 'บ้านพัก'}
          </h1>
          <p className="text-slate-500 mt-2 md:ml-[60px] font-medium">เพิ่ม แก้ไข ลบข้อมูล และจัดการสมาชิกลูกบ้านทั้งหมดในโครงการ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 🌟 ย้ายส่วนของ 'รายการบ้าน' มาไว้ด้านซ้าย (order-2 lg:order-1) */}
        <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8">
          
          <form method="GET" className="relative mb-6 flex items-center">
            <Search className="absolute left-4 text-slate-400" size={20} />
            <input 
              type="text" 
              name="q" 
              defaultValue={searchQuery}
              autoComplete="off"
              placeholder={`ค้นหา${unitLabel}...`} 
              className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-[1.5rem] outline-none transition-all font-medium text-slate-700 shadow-sm hover:shadow-md focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10"
            />
            {editId && <input type="hidden" name="edit" value={editId} />}
            
            {searchQuery && (
              <Link href={`/admin/houses${editId ? `?edit=${editId}` : ''}`} className="absolute right-4 p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded-full transition-colors">
                <X size={16} strokeWidth={3} />
              </Link>
            )}
          </form>

          <form action={deleteMultipleHouses} className="flex flex-col gap-4">
            
            {houses.length > 0 && (
              <div className="flex justify-between items-center mb-2 px-2 bg-slate-50 py-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 pl-2">
                  <input 
                    type="checkbox" 
                    id="selectAllBtn"
                    className="rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor="selectAllBtn" className="text-sm font-bold text-slate-700 cursor-pointer select-none">เลือกทั้งหมด</label>
                </div>
                <button type="button" className="delete-btn flex items-center px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-lg transition shadow-sm cursor-pointer">
                  <ListChecks size={16} className="mr-1.5" /> ลบรายการที่เลือก
                </button>
                <button type="submit" className="hidden hidden-submit" />
              </div>
            )}

            {houses.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                <Search className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบข้อมูล</h3>
                <p className="text-slate-500">ไม่พบ{unitLabel} "{searchQuery}" ในระบบ</p>
              </div>
            ) : (
              houses.map((house) => {
                const isEditing = editHouse?.id === house.id;
                return (
                  <div key={house.id} className={`house-card-wrapper group relative bg-white p-6 rounded-[1.5rem] transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-5 ${isEditing ? 'border-2 border-[#376B64] shadow-lg scale-[1.01]' : 'border border-slate-100 shadow-sm hover:shadow-md'}`}>
                    <div className="flex items-center gap-5 w-full sm:w-auto">
                      
                      <input 
                        type="checkbox" 
                        name="houseIds" 
                        value={house.id} 
                        className="house-checkbox rounded border-slate-300 text-[#376B64] focus:ring-[#376B64] w-5 h-5 cursor-pointer"
                      />

                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isEditing ? 'bg-[#2A524C] text-white' : 'bg-slate-50 text-slate-400 group-[.border-[#376B64]]:bg-[#376B64] group-[.border-[#376B64]]:text-white'}`}>
                        <Home size={26} />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-800">{unitLabel} {house.houseNo}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[13px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{house.houseSize} {sizeLabel}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${house.feeType === 'FIXED' ? 'bg-[#376B64]/10 text-[#376B64]' : 'bg-slate-100 text-slate-600'}`}>
                            {house.feeType === 'FIXED' ? 'เหมาจ่ายเป็นรายเดือน' : 'ตามพื้นที่'} {Number(house.feeRate).toLocaleString()} ฿
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
                        <span className="text-[13px] font-bold text-slate-700">{house._count.residents} คน</span>
                      </div>
                      
                      <div className="flex items-center gap-2 relative z-20">
                        <div className="relative group/btn">
                          <Link href={`/admin/houses?edit=${house.id}${searchQuery ? `&q=${searchQuery}` : ''}`} className="flex p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-[#376B64] hover:bg-[#376B64]/10 hover:border-[#376B64]/20 rounded-xl shadow-sm transition-all">
                            <Pencil size={18} />
                          </Link>
                        </div>

                        <div className="relative group/btn">
                          <form action={deleteSingleHouse.bind(null, house.id)}>
                            <button type="button" className="delete-btn flex p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl shadow-sm transition-all">
                              <Trash2 size={18} />
                            </button>
                            <button type="submit" className="hidden hidden-submit" />
                          </form>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <script dangerouslySetInnerHTML={{ __html: `
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

                Swal.fire({
                  icon: 'success',
                  title: title,
                  text: text,
                  confirmButtonColor: '#376B64',
                  timer: 3000,
                  timerProgressBar: true,
                  customClass: { popup: 'rounded-3xl' }
                });

                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('alert');
                window.history.replaceState({}, '', newUrl);
              }

              if (!window.adminHouseEventsBound) {
                window.adminHouseEventsBound = true;

                document.addEventListener('click', function(e) {
                  const deleteBtn = e.target.closest('.delete-btn');
                  if (deleteBtn) {
                    e.preventDefault();
                    Swal.fire({
                      title: 'ยืนยันการลบแบบถาวร?',
                      text: "ข้อมูล (เช่น ลูกบ้าน, บิล, ประวัติแจ้งซ่อม) จะถูกลบเกลี้ยง และไม่สามารถกู้คืนได้!",
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#ef4444',
                      cancelButtonColor: '#94a3b8',
                      confirmButtonText: 'ใช่, ลบให้หมด!',
                      cancelButtonText: 'ยกเลิก',
                      customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
                    }).then((result) => {
                      if (result.isConfirmed) {
                        deleteBtn.closest('form').querySelector('.hidden-submit').click();
                      }
                    });
                  }
                });

                document.addEventListener('change', function(e) {
                  if (e.target.id === 'selectAllBtn') {
                    const checkboxes = document.querySelectorAll('.house-checkbox');
                    checkboxes.forEach(cb => {
                      cb.checked = e.target.checked;
                      updateCardVisuals(cb);
                    });
                  } 
                  else if (e.target.classList.contains('house-checkbox')) {
                    updateCardVisuals(e.target);
                    const allCheckboxes = document.querySelectorAll('.house-checkbox');
                    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
                    const selectAllBtn = document.getElementById('selectAllBtn');
                    if (selectAllBtn) selectAllBtn.checked = allChecked;
                  }
                });

                function updateCardVisuals(checkbox) {
                  const card = checkbox.closest('.house-card-wrapper');
                  if (card) {
                    if (checkbox.checked) {
                      card.classList.remove('border-slate-100', 'bg-white');
                      card.classList.add('border-[#376B64]', 'bg-[#376B64]/5', 'scale-[1.01]', 'shadow-md', 'ring-4', 'ring-[#376B64]/10', 'z-10');
                    } else {
                      card.classList.remove('border-[#376B64]', 'bg-[#376B64]/5', 'scale-[1.01]', 'shadow-md', 'ring-4', 'ring-[#376B64]/10', 'z-10');
                      card.classList.add('border-slate-100', 'bg-white');
                    }
                  }
                }
              }
            `}} />
            
          </form>
        </div>

        {/* 🌟 ย้ายส่วนของ 'ฟอร์มเพิ่ม/แก้ไข' มาไว้ด้านขวา (order-1 lg:order-2) */}
        <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-24 transition-all max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2.5 text-slate-800">
                {editHouse ? (
                  <><div className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-xl"><Pencil size={20} /></div> แก้ไขข้อมูล</>
                ) : (
                  <><div className="p-2 bg-[#376B64]/10 text-[#376B64] rounded-xl"><Plus size={20} /></div> เพิ่มยูนิตใหม่</>
                )}
              </h2>
              {editHouse && (
                <Link href="/admin/houses" className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={18} strokeWidth={2.5} />
                </Link>
              )}
            </div>

            <form action={editHouse ? handleUpdateHouse : handleAddHouse} className="space-y-5">
              {editHouse && <input type="hidden" name="id" value={editHouse.id} />}
              
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  {unitLabel} {editHouse && <span className="text-rose-500 ml-1 lowercase font-medium tracking-normal">(เปลี่ยนไม่ได้)</span>}
                </label>
                <div className="relative">
                  <MapPin className={`absolute left-4 top-3.5 ${editHouse ? 'text-slate-300' : 'text-slate-400'}`} size={18} />
                  <input suppressHydrationWarning name="houseNo" type="text" defaultValue={editHouse?.houseNo || ""} placeholder="เช่น 99/1" required readOnly={!!editHouse} className={`w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl outline-none transition-all font-medium ${editHouse ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-dashed' : 'bg-white focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10'}`} />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">ขนาดพื้นที่ ({sizeLabel})</label>
                <div className="relative">
                  <Maximize2 className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input suppressHydrationWarning name="houseSize" type="number" step="0.1" defaultValue={editHouse?.houseSize || ""} placeholder="เช่น 50.0" required className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-medium focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">รูปแบบการคิดเงิน</label>
                  <div className="relative">
                    <Calculator className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <select name="feeType" defaultValue={editHouse?.feeType || "CALCULATED"} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-medium focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10 appearance-none">
                      <option value="CALCULATED">คำนวณตามพื้นที่</option>
                      <option value="FIXED">เหมาจ่ายเป็นรายเดือน</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">อัตราเรทราคา</label>
                  <div className="relative">
                    <Coins className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input 
                      suppressHydrationWarning 
                      name="feeRate" 
                      type="number" 
                      step="0.01" 
                      defaultValue={editHouse?.feeRate || globalFlatRate} 
                      required 
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-800 focus:border-[#376B64] focus:ring-4 focus:ring-[#376B64]/10" 
                    />
                  </div>
                </div>
              </div>
              
              <button suppressHydrationWarning type="submit" className={`w-full text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98] ${editHouse ? 'bg-[#2A524C] hover:bg-[#1E3B37] shadow-[#376B64]/25' : 'bg-[#376B64] hover:bg-[#2A524C] shadow-[#376B64]/25'}`}>
                {editHouse ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลยูนิต'}
              </button>
            </form>

            {!editHouse && (
              <AutoGenerateButton autoGenerateAction={autoGenerateHouses} />
            )}

            {editHouse && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center justify-between">
                  <span>สมาชิกลูกบ้าน</span>
                  <span className="bg-[#376B64]/10 text-[#376B64] px-3 py-1 rounded-full text-xs font-bold">{editHouse.residents.length} คน</span>
                </h3>
                {editHouse.residents.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-slate-100 border-dashed">
                    <p className="text-sm font-medium text-slate-400">ยังไม่มีลูกบ้านลงทะเบียน</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {editHouse.residents.map((user) => (
                      <li key={user.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                        <span className="text-sm font-bold text-slate-700 truncate">{user.name || 'ไม่ได้ตั้งชื่อ'}</span>
                        <form action={handleRemoveResident}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button type="button" className="delete-btn p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors">
                            <UserMinus size={16} />
                          </button>
                          <button type="submit" className="hidden hidden-submit" />
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

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}