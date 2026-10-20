import Swal, { SweetAlertOptions } from 'sweetalert2';

/**
 * ธีมสีหลักของระบบตามข้อกำหนด
 */
export const THEME_COLOR = '#376B64';
export const CANCEL_COLOR = '#94A3B8';

/**
 * การตั้งค่าพื้นฐานของ SweetAlert2 เพื่อความสอดคล้องกันทั่วทั้งระบบ:
 * 1. ปุ่มตกลง/ยืนยัน อยู่ทางซ้ายมือเสมอ (reverseButtons: true)
 * 2. มีปุ่มกากบาทปิด (X) ตรงขวาบนเสมอ (showCloseButton: true)
 * 3. ใช้ธีมสี #376B64
 * 4. หน้าตาโมเดิร์น ไร้ขอบ native OS
 */
export const defaultSwalConfig: SweetAlertOptions = {
  confirmButtonColor: THEME_COLOR,
  cancelButtonColor: CANCEL_COLOR,
  reverseButtons: true, // บังคับให้ปุ่ม Confirm/ตกลง อยู่ด้านซ้ายเสมอตามข้อกำหนด 1
  showCloseButton: true, // แสดงปุ่มกากบาท (X) ปิดขวาบนเสมอตามข้อกำหนด 10
  focusConfirm: false,
  customClass: {
    popup: 'rounded-2xl shadow-2xl border border-slate-100 p-6 font-sans',
    title: 'text-lg font-bold text-slate-800 tracking-tight',
    htmlContainer: 'text-sm text-slate-600 mt-2',
    confirmButton: 'rounded-xl font-bold px-6 py-2.5 shadow-md shadow-[#376B64]/20 transition-all active:scale-95 text-white',
    cancelButton: 'rounded-xl font-bold px-6 py-2.5 transition-all active:scale-95 text-slate-700 bg-slate-100 hover:bg-slate-200',
    closeButton: 'text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-0',
  },
};

export const appAlert = {
  /**
   * แจ้งเตือนสำเร็จ
   */
  success(title: string, message?: string, options?: any) {
    return Swal.fire({
      ...defaultSwalConfig,
      icon: 'success',
      title,
      text: message,
      confirmButtonText: 'ตกลง',
      ...(options || {}),
    } as any);
  },

  /**
   * แจ้งเตือนข้อผิดพลาด
   */
  error(title: string, message?: string, options?: any) {
    return Swal.fire({
      ...defaultSwalConfig,
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'ตกลง',
      ...(options || {}),
    } as any);
  },

  /**
   * แจ้งเตือนข้อควรระวัง / ข้อมูลไม่ครบ
   */
  warning(title: string, message?: string, options?: any) {
    return Swal.fire({
      ...defaultSwalConfig,
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'ตกลง',
      ...(options || {}),
    } as any);
  },

  /**
   * กล่องข้อความถามยืนยันการทำรายการ
   * ปุ่มยืนยันอยู่ด้านซ้าย ปุ่มยกเลิกอยู่ด้านขวา
   */
  confirm(
    title: string,
    message: string,
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    options?: any
  ) {
    return Swal.fire({
      ...defaultSwalConfig,
      icon: 'warning',
      title,
      html: message,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      ...(options || {}),
    } as any);
  },

  /**
   * แจ้งเตือนแบบกำลังประมวลผล (Loading)
   */
  loading(title = 'กำลังประมวลผลข้อมูล...') {
    return Swal.fire({
      ...defaultSwalConfig,
      title,
      allowOutsideClick: false,
      showConfirmButton: false,
      showCloseButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  /**
   * ปิด Alert
   */
  close() {
    Swal.close();
  },
};

export default appAlert;
