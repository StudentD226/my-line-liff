import React from 'react';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function CustomCheckbox({ checked, onChange, label, className = '' }: CustomCheckboxProps) {
  return (
    <label className={`flex items-center cursor-pointer gap-2 ${className}`}>
      <div 
        className={`w-5 h-5 flex items-center justify-center rounded border transition-colors ${
          checked ? 'bg-[#376B64] border-[#376B64]' : 'bg-white border-slate-300 hover:border-[#376B64]'
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      </div>
      {label && <span className="text-sm font-medium text-slate-700 select-none" onClick={() => onChange(!checked)}>{label}</span>}
      
      {/* Hidden native input for accessibility if needed */}
      <input 
        type="checkbox" 
        className="sr-only" 
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
