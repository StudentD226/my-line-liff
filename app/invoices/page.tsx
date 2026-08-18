'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';

export default function InvoicesPage() {
  const router = useRouter();
  const [rawInvoices, setRawInvoices] = useState<any[]>([]);
  const [displayList, setDisplayList] = useState<any[]>([]);
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
          fetchData(profile.userId, profile.pictureUrl || '');
        } catch (err) {
          console.error("ดึงโปรไฟล์ LINE ไม่สำเร็จ:", err);
          alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE");
          setLoading(false);
        }
      } else {
        liff.login();
      }
    }).catch((err) => {
      console.error('LIFF Error:', err);
      setLoading(false);
    });
  }, []);

  const fetchData = async (lineId: string, pictureUrl: string) => {
    try {
      // เพิ่ม { cache: 'no-store' } เพื่อสั่ง Next.js ว่าห้ามจำข้อมูลเก่าเด็ดขาด!
      const res = await fetch(`/api/user-invoices?lineId=${lineId}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const result = await res.json();

      if (result.success) {
        const mainData = result.data || result;
        const allInvoices = mainData.invoices ?? [];
        
        // 1. คำนวณยอดค้างชำระทั้งหมด (รวมทุกเดือน/ทุกปี)
        const calculatedTotalUnpaid = allInvoices
          .filter((inv: any) => ['PENDING', 'OVERDUE', 'REJECTED'].includes(inv.status))
          .reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0);
        
        // 2. เรียงบิลทั้งหมดจาก "ใหม่ไปเก่า" (ปีล่าสุด -> เดือนล่าสุด)
        const sortedAll = [...allInvoices].sort((a: any, b: any) => {
          if (b.billingYear !== a.billingYear) return b.billingYear - a.billingYear;
          return b.billingMonth - a.billingMonth;
        });

        // 3. ตัดเอาแค่ "6 เดือนล่าสุด" มาแสดงเป็นรายการเดี่ยว
        const latest6 = sortedAll.slice(0, 6);
        
        // 4. บิลที่เหลือ (เก่ากว่า 6 เดือน) เอาไปหาว่ามียอดค้างไหม แล้วจัดกลุ่มรายปี
        const olderInvoices = sortedAll.slice(6);
        const pastUnpaid = olderInvoices.filter((inv: any) => 
          ['PENDING', 'OVERDUE', 'REJECTED'].includes(inv.status)
        );

        const pastYearTotals: Record<number, number> = {};
        pastUnpaid.forEach((inv: any) => {
          const y = inv.billingYear;
          if (!pastYearTotals[y]) pastYearTotals[y] = 0;
          pastYearTotals[y] += (Number(inv.totalAmount) || 0);
        });

        const pastYearItems = Object.keys(pastYearTotals)
          .map(y => Number(y))
          .sort((a, b) => b - a) // เรียงปีใหม่ไปเก่า
          .map(yearNum => ({
            id: `past-${yearNum}`,
            isPastYearSummary: true,
            billingYear: yearNum,
            totalAmount: pastYearTotals[yearNum],
            status: 'OVERDUE'
          }));

        // 5. รวมรายการ: 6 เดือนล่าสุดไว้บน แล้วตามด้วยสรุปยอดค้างเก่าๆ ไว้ล่างสุด
        const combinedList = [...latest6, ...pastYearItems];
        
        setRawInvoices(allInvoices);
        setDisplayList(combinedList);
        setTotalUnpaid(calculatedTotalUnpaid);
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
      console.error('fetchData error:', error);
      alert('เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่ครับ');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = () => {
    // ใช้ rawInvoices ในการหาบิลที่ค้างชำระ
    const unpaidInvoice = rawInvoices.find(inv => ['PENDING', 'OVERDUE', 'REJECTED'].includes(inv.status));
    if (unpaidInvoice) {
      router.push(`/payment?invoice=${unpaidInvoice.invoiceNo}`);
    } else {
      alert('คุณไม่มียอดค้างชำระในขณะนี้ครับ');
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
    // เปลี่ยนเป็น min-h-screen และเอา overflow-hidden ออก เพื่อให้เลื่อนจอได้ปกติ
    <div className="min-h-screen bg-[#F5F5F5] font-sans pb-10">
      
      {/* Header สีเขียว (ขนาดเล็กตามเดิม) */}
      <div className="bg-[#376B64] rounded-b-[30px] pt-6 pb-12 px-6 text-white relative shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <img src={userData.pictureUrl} className="w-12 h-12 rounded-full border-2 border-white object-cover" />
          <div>
            <h2 className="text-[16px] font-bold">สวัสดี {userData.name}</h2>
            <p className="text-[13px] font-light opacity-90">บ้านเลขที่ : {userData.houseNo}</p>
          </div>
        </div>
        <div className="flex justify-center mt-1">
          {/* วงกลมขนาด 120px เท่าเดิม */}
          <div className="w-[120px] h-[120px] rounded-full border-2 border-[#548a82] flex flex-col items-center justify-center bg-[#376B64] shadow-[0_0_15px_rgba(0,0,0,0.15)]">
            <p className="text-[11px] font-light mb-0.5">ยอดค้างชำระ</p>
            <p className="text-[20px] font-bold leading-tight">{totalUnpaid.toFixed(2)}</p>
            <p className="text-[11px] font-light">บาท</p>
          </div>
        </div>
      </div>

      {/* ปุ่มชำระเงิน */}
      <div className="flex justify-center -mt-6 relative z-10 px-8">
        <button onClick={handlePaymentClick} className="w-full max-w-[180px] bg-[#376B64] text-white py-2.5 rounded-full font-bold shadow-lg active:scale-95 transition-transform text-[15px]">
          ชำระเงิน
        </button>
      </div>

      {/* พื้นที่รายการบิล (ตอนนี้เลื่อนได้ตามธรรมชาติของเว็บแล้ว) */}
      <div className="px-5 mt-5">
        <h3 className="text-[#376B64] font-bold text-[15px] mb-2">ประวัติชำระเงิน</h3>
        
        {displayList.length === 0 ? (
          <p className="text-center text-gray-400 mt-6 text-sm">ยังไม่มีประวัติบิลในระบบ</p>
        ) : (
          <div className="bg-white rounded-[12px] border border-[#376B64] overflow-hidden shadow-sm">
            {displayList.map((inv, index) => {
              
              // รูปแบบของบิลรวมปีก่อนๆ (อยู่ล่างสุด)
              if (inv.isPastYearSummary) {
                return (
                  <div key={inv.id} className={`py-2 px-3 flex justify-between items-center bg-red-50/50 ${index !== displayList.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div>
                      <p className="font-bold text-[13px] text-red-600 mb-0.5">ยอดค้างชำระรวมปี {inv.billingYear + 543}</p>
                      <p className="text-[10px] text-gray-400 mb-0.5">ยกยอดมาจากปีก่อน</p>
                      <p className="text-[11px] text-gray-500">ยอดรวม <span className="font-bold text-black">{(inv.totalAmount || 0).toFixed(2)}</span> บาท</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">ค้างชำระ</span>
                    </div>
                  </div>
                );
              }

              // รูปแบบของบิลปกติ (6 เดือนล่าสุด)
              const statusDisplay = getStatusDisplay(inv.status);
              return (
                <div key={inv.id} className={`py-2 px-3 flex justify-between items-center ${index !== displayList.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div>
                    <p className="font-bold text-[13px] text-black mb-0.5">ประจำเดือน {inv.billingMonth}/{inv.billingYear + 543}</p>
                    <p className="text-[10px] text-gray-400 mb-0.5">{inv.paidAt ? formatThaiDate(inv.paidAt) : formatThaiDate(inv.createdAt)}</p>
                    <p className="text-[11px] text-gray-500">ยอดรวม <span className="font-bold text-black">{(inv.totalAmount || 0).toFixed(2)}</span> บาท</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-bold ${statusDisplay.color}`}>{statusDisplay.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}