'use client';

import { useState, useEffect } from 'react';
import liff from '@line/liff';

export default function RegisterPage() {
  const [lineProfile, setLineProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    houseNumber: '',
    lineId: ''
  });
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🛡️ 1. ระบบบังคับ Login และตรวจสอบสถานะ
  useEffect(() => {
    const initLiff = async () => {
      try {
        // ⚠️ อย่าลืมเปลี่ยนเป็น LIFF ID ของพี่เองนะครับ
        await liff.init({ liffId: '2009290251-UZlxLIQJ' }); 
        
        if (!liff.isLoggedIn()) {
          liff.login(); 
          return;
        }

        const profile = await liff.getProfile();
        setLineProfile(profile);
        setFormData(prev => ({ ...prev, lineId: profile.userId }));
        
        // ตรวจสอบว่าเคยลงทะเบียนหรือยัง (Check Duplicate)
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: profile.userId, checkOnly: true }) 
        });
        const data = await res.json();
        
        if (data.success && data.user) {
          setRegisteredUser(data.user);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('LIFF Error:', err);
        setLoading(false);
      }
    };
    initLiff();
  }, []);

  // 🚪 2. ฟังก์ชันออกจากระบบ (Logout)
  const handleLogout = () => {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      liff.logout();
      window.location.reload(); // รีโหลดเพื่อให้กลับไปหน้า Login ใหม่
    }
  };

  // ✉️ 3. ฟังก์ชันบันทึกข้อมูล
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setRegisteredUser(data.user);
        alert(data.isExisting ? 'ระบบพบข้อมูลเดิมของท่านเรียบร้อยแล้ว' : 'บันทึกข้อมูลการลงทะเบียนสำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  // ⏳ หน้าจอ Loading ระหว่างเช็ค Login
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #00b900', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '15px', color: '#666' }}>กำลังตรวจสอบสิทธิ์...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* 🟢 ส่วน Profile (จัดวางกึ่งกลางเสมอ) */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img 
          src={lineProfile?.pictureUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
          alt="Profile" 
          style={{ width: '90px', height: '90px', borderRadius: '50%', border: '4px solid #00b900', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', marginBottom: '10px' }} 
        />
        <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '20px', fontWeight: 'bold' }}>{lineProfile?.displayName}</h3>
        
        <button 
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', marginTop: '5px' }}
        >
          ออกจากระบบ
        </button>
      </div>

      <div style={{ padding: '30px', border: '1px solid #eee', borderRadius: '25px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
        
        {registeredUser ? (
          /* ✅ กรณีที่ลงทะเบียนแล้ว: แสดงบัตรข้อมูล */
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#27ae60', fontSize: '20px', marginBottom: '20px' }}>ยืนยันข้อมูลการลงทะเบียน</h2>
            
            <div style={{ textAlign: 'left', backgroundColor: '#f9fcf9', padding: '20px', borderRadius: '15px', border: '1px solid #e1eee1', lineHeight: '2', marginBottom: '25px' }}>
              <p style={{ margin: '5px 0', color: '#34495e' }}><strong>ชื่อ-นามสกุล:</strong> {registeredUser.fullName}</p>
              <p style={{ margin: '5px 0', color: '#34495e' }}><strong>เบอร์โทรศัพท์:</strong> {registeredUser.phone}</p>
              <p style={{ margin: '5px 0', color: '#34495e' }}><strong>บ้านเลขที่:</strong> {registeredUser.houseNumber}</p>
            </div>

            <button 
              onClick={() => window.location.href = '/'}
              style={{ width: '100%', padding: '15px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
            >
              กลับสู่หน้าหลัก
            </button>
          </div>
        ) : (
          /* 📝 กรณีที่ยังไม่ได้ลงทะเบียน: แสดงฟอร์ม */
          <form onSubmit={handleSubmit}>
            <h2 style={{ textAlign: 'center', color: '#1a1a1a', marginBottom: '25px', fontSize: '20px' }}>ลงทะเบียนข้อมูลใหม่</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>ชื่อ-นามสกุล</label>
              <input 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                placeholder="ระบุชื่อจริงตามบัตรประชาชน"
                required
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>หมายเลขโทรศัพท์</label>
              <input 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                type="tel"
                placeholder="08XXXXXXXX"
                required
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>ที่อยู่ปัจจุบัน</label>
              <input 
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                placeholder="ระบุบ้านเลขที่ / หมู่บ้าน"
                required
                onChange={e => setFormData({...formData, houseNumber: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '15px', backgroundColor: loading ? '#bdc3c7' : '#00b900', color: 'white', border: 'none', borderRadius: '12px', fontSize: '17px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? 'กำลังดำเนินการ...' : 'ยืนยันข้อมูลลงทะเบียน'}
            </button>
          </form>
        )}
      </div>
      <p style={{ textAlign: 'center', fontSize: '11px', color: '#bdc3c7', marginTop: '20px' }}>Securely login with LINE LIFF</p>
    </div>
  );
}