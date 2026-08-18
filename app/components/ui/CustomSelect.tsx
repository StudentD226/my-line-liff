import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ options, value, onChange, placeholder = 'เลือก...', className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className="flex items-center justify-between w-full px-4 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm font-medium ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-lg max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2">
          {options.map((option) => (
            <div
              key={option.value}
              className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors hover:bg-slate-50 ${
                value === option.value ? 'bg-[#376B64]/5 text-[#376B64]' : 'text-slate-700'
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
              {value === option.value && <Check size={16} className="text-[#376B64]" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
