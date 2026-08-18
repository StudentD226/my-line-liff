import React from 'react';
import { Calendar } from 'lucide-react';

interface CustomDatepickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
}

export function CustomDatepicker({ value, onChange, min, max, className = '' }: CustomDatepickerProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Calendar size={16} className="text-slate-400" />
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="block w-full pl-10 pr-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#376B64] focus:ring-1 focus:ring-[#376B64] transition-colors"
      />
    </div>
  );
}
