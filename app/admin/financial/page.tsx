"use client";

import React, { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// สีสำหรับกราฟวงกลม
const COLORS = ["#3B82F6", "#60A5FA", "#93C5FD", "#FBBF24", "#8B5CF6"];

export default function FinancialDashboard() {
  const [alert, setAlert] = useState<{ show: boolean; message: string; type: "success" | "warning" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const showAlert = (message: string, type: "success" | "warning" | "error" = "success") => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: "", type: "success" }), 3000);
  };

  const pieData = [
    { name: "ค่าสาธารณูปโภค", value: 4272 },
    { name: "ค่าบำรุงรักษา", value: 4272 },
    { name: "ค่าบริหารจัดการ", value: 4272 },
    { name: "ค่าจ้างบริการ", value: 4272 },
    { name: "อื่นๆ", value: 4272 },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#F8FAFC] min-h-screen font-sans relative">
      
      {alert.show && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center space-x-3 transition-all duration-300 animate-fade-in-down ${
          alert.type === "success" ? "bg-emerald-500 text-white" :
          alert.type === "warning" ? "bg-orange-500 text-white" : "bg-red-500 text-white"
        }`}>
          <span>
            {alert.type === "success" ? "✅" : alert.type === "warning" ? "⚠️" : "❌"}
          </span>
          <span className="font-bold">{alert.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">สร้างและสรุปรายงาน</h1>
          <p className="text-sm text-gray-500 mt-1">สร้างรายงานทางการเงินและสรุปผลการดำเนินงานของหมู่บ้าน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-gray-800 mb-4">เลือกช่วงรายงาน</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">เลือกเดือน</label>
              <select className="w-full border border-gray-200 rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-teal-600 outline-none">
                <option>กรกฎาคม 2568</option>
                <option>สิงหาคม 2568</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">หรือเลือกช่วงวันที่</label>
              <div className="flex items-center space-x-2">
                <input type="date" className="w-full border border-gray-200 rounded-lg p-2 text-gray-700" defaultValue="2025-07-01"/>
                <span className="text-gray-400">-</span>
                <input type="date" className="w-full border border-gray-200 rounded-lg p-2 text-gray-700" defaultValue="2025-07-31"/>
              </div>
            </div>
            <button 
              onClick={() => showAlert("สร้างรายงานสำเร็จเรียบร้อยแล้ว!", "success")}
              className="w-full bg-[#1A534B] hover:bg-[#14423b] text-white font-bold py-3 rounded-lg flex justify-center items-center space-x-2 transition-all">
              <span>📄</span>
              <span>สร้างรายงาน</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
          <div className="text-center w-full">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 cursor-pointer">{"<"}</span>
              <span className="font-bold text-gray-800">กรกฎาคม 2568</span>
              <span className="text-gray-400 cursor-pointer">{">"}</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-sm text-gray-400 font-medium mb-2">
              <div>อา.</div><div>จ.</div><div>อ.</div><div>พ.</div><div>พฤ.</div><div>ศ.</div><div>ส.</div>
            </div>
            <div className="grid grid-cols-7 gap-y-3 text-sm text-gray-700">
              <div className="text-gray-300">29</div><div className="text-gray-300">30</div><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div>
              <div>6</div><div>7</div><div>8</div><div>9</div><div>10</div><div>11</div><div>12</div>
              <div>13</div><div className="bg-teal-100 text-teal-800 rounded-full w-8 h-8 flex items-center justify-center mx-auto">14</div><div>15</div><div className="bg-[#1A534B] text-white font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto">16</div><div>17</div><div>18</div><div>19</div>
              <div>20</div><div>21</div><div>22</div><div>23</div><div>24</div><div>25</div><div>26</div>
              <div>27</div><div>28</div><div>29</div><div>30</div><div>31</div><div className="text-gray-300">1</div><div className="text-gray-300">2</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-4">สรุปผลรายงาน</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 text-emerald-500 flex items-center justify-center text-xl font-bold mb-3">↓</div>
          <p className="text-gray-500 text-sm mb-1">รายรับรวม</p>
          <p className="text-2xl font-bold text-gray-800">12,000 <span className="text-base font-normal">บาท</span></p>
        </div>
        
        <div onClick={() => showAlert("พบยอดค้างชำระสะสมเกินกำหนด กรุณาตรวจสอบ", "warning")} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center cursor-pointer hover:border-red-200 transition-all">
          <div className="w-12 h-12 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center text-xl font-bold mb-3">↑</div>
          <p className="text-gray-500 text-sm mb-1">ยอดค้างชำระ (สะสม)</p>
          <p className="text-2xl font-bold text-red-500">35,000 <span className="text-base font-normal">บาท</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mb-3">🧾</div>
          <p className="text-gray-500 text-sm mb-1">จำนวนรายการ</p>
          <p className="text-2xl font-bold text-gray-800">120 <span className="text-base font-normal">รายการ</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">สัดส่วนรายรับ</h3>
          <div className="flex items-center justify-center h-64 relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <p className="text-xs text-gray-500">รวม</p>
              <p className="text-lg font-bold text-gray-800">12,000</p>
              <p className="text-xs text-gray-500">บาท</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="font-bold text-gray-800 mb-4">สรุปยอดรายรับ</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">รายรับรวม</span>
              <span className="font-bold text-emerald-500">12,000 บาท</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">จำนวนรายการ</span>
              <span className="font-bold text-gray-800">120 รายการ</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-gray-50 rounded-lg px-4 border border-gray-100">
              <span className="text-gray-600">ยอดค้างชำระ (สะสม)</span>
              <span className="font-bold text-red-500 text-xl">35,000 บาท</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}