'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnpaid, setTotalUnpaid] = useState(0); 

  const [userData, setUserData] = useState({
    name: '',
    houseNo: '',
    pictureUrl: ''
  });

  useEffect(() => {
    liff.init({ liffId: "2009290251-UZlxLIQJ" }).then(async () => {
      if (liff.isLoggedIn()) {
        try {
          const profile = await liff.getProfile();
          console.log("✅ ดึงโปรไฟล์ LINE สำเร็จ:", profile.userId);
          
          fetchData(profile.userId, profile.pictureUrl || '');
        } catch (err) {
          console.error("❌ ดึงโปรไฟล์ LINE ไม่สำเร็จ:", err);
          alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE");
          setLoading(false);
        }
      } else {
        liff.login();
      }
    }).catch((err) => {
      console.error('❌ LIFF Error:', err);
      setLoading(false);
    });
  }, []);

  const fetchData = async (lineId: string, pictureUrl: string) => {
    try {
      const res = await fetch(`/api/user-invoices?lineId=${lineId}&t=${Date.now()}`);
      const result = await res.json();

      console.log("📥 ข้อมูลจาก Database:", result);

      if (result.success) {
        const mainData = result.data || result;
        const currentYear = new Date().getFullYear();
        
        const allInvoices = mainData.invoices ?? [];
        const yearInvoices = allInvoices.filter((inv: any) => inv.billingYear === currentYear);
        
        // 🌟 แก้ไขการคำนวณยอดค้างชำระที่นี่ครับ (บวกเลขเองจากบิลที่ค้าง)
        const calculatedTotalUnpaid = allInvoices
          .filter((inv: any) => ['PENDING', 'OVERDUE', 'REJECTED'].includes(inv.status))
          .reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0);
        
        setInvoices(yearInvoices);
        setTotalUnpaid(calculatedTotalUnpaid); // ใช้ค่ายอดรวมที่เพิ่งคำนวณ
        setUserData({
          name: mainData.user?.name ?? mainData.name ?? 'ไม่ระบุชื่อ',
          houseNo: mainData.user?.residentHouse?.houseNo ?? mainData.houseNo ?? 'ไม่ระบุ',
          pictureUrl: pictureUrl || 'https://via.placeholder.com/150'
        });
      } else if (res.status === 404) {
        alert('ไม่พบข้อมูลบ้านของคุณในระบบ กรุณาลงทะเบียนครับ');
        router.push('/settings');
      } else {
        alert(`ดึงข้อมูลไม่สำเร็จ: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ fetchData error:', error);
      alert('เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่ครับ');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    const unpaidInvoice = invoices.find(inv => ['PENDING', 'OVERDUE', 'REJECTED'].includes(inv.status));
    if (unpaidInvoice) {
      router.push(`/payment?invoice=${unpaidInvoice.invoiceNo}`);
    } else {
      alert('คุณไม่มียอดค้างชำระในขณะนี้ครับ 🎉');
    }
  };

  const formatThaiDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PAID': return { text: 'ชำระแล้ว', color: 'text-[#00B900]' };
      case 'CHECKING': return { text: 'รอตรวจสอบ', color: 'text-orange-500' };
      case 'OVERDUE': return { text: 'เกินกำหนด', color: 'text-red-600' };
      case 'REJECTED': return { text: 'สลิปไม่ถูกต้อง', color: 'text-red-500' };
      default: return { text: 'รอชำระ', color: 'text-[#376B64]' };
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#376B64] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
      <div className="bg-[#376B64] rounded-b-[40px] pt-10 pb-16 px-6 text-white relative shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <img src={userData.pictureUrl} className="w-14 h-14 rounded-full border-2 border-white object-cover" />
          <div>
            <h2 className="text-[17px] font-bold">สวัสดี {userData.name}</h2>
            <p className="text-sm font-light opacity-90">บ้านเลขที่ : {userData.houseNo}</p>
          </div>
        </div>
        <div className="flex justify-center mt-2">
          <div className="w-44 h-44 rounded-full border-2 border-[#548a82] flex flex-col items-center justify-center bg-[#376B64] shadow-[0_0_20px_rgba(0,0,0,0.15)]">
            <p className="text-[13px] font-light mb-1">ยอดค้างชำระ</p>
            <p className="text-2xl font-bold">{totalUnpaid.toFixed(2)} บาท</p>
          </div>
        </div>
      </div>
      <div className="flex justify-center -mt-7 relative z-10 px-8">
        <button onClick={handlePaymentClick} className="w-full max-w-[200px] bg-[#376B64] text-white py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform">ชำระเงิน</button>
      </div>
      <div className="px-6 mt-8">
        <h3 className="text-[#376B64] font-bold text-lg mb-4">ประวัติชำระเงิน</h3>
        {invoices.length === 0 ? (
          <p className="text-center text-gray-400 mt-10 text-sm">ยังไม่มีประวัติบิลในปีนี้</p>
        ) : (
          <div className="bg-white rounded-[12px] border border-[#376B64] overflow-hidden">
            {invoices.map((inv, index) => {
              const statusDisplay = getStatusDisplay(inv.status);
              return (
                <div key={inv.id} className={`p-4 flex justify-between items-center ${index !== invoices.length - 1 ? 'border-b border-gray-200' : ''}`}>
                  <div>
                    <p className="font-bold text-[14px] text-black mb-0.5">ประจำเดือน {inv.billingMonth}/{inv.billingYear + 543}</p>
                    <p className="text-[11px] text-gray-400 mb-1">{inv.paidAt ? formatThaiDate(inv.paidAt) : formatThaiDate(inv.createdAt)}</p>
                    <p className="text-[12px] text-gray-500">ยอดรวม <span className="font-bold text-black">{(inv.totalAmount || 0).toFixed(2)}</span> บาท</p>
                  </div>
                  <div className="text-right"><span className={`text-[12px] font-bold ${statusDisplay.color}`}>{statusDisplay.text}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}