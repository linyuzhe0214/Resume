import React, { useState, useEffect } from 'react';
import { cn } from '../App';
import { parseMileage, formatMileage } from '../utils/mileage';

interface MileageInputProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
}

export default function MileageInput({ value, onChange, label }: MileageInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatMileage(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatMileage(value));
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseMileage(displayValue);
    if (parsed !== null) {
      onChange(parsed);
    } else {
      // Reset to current value if invalid
      setDisplayValue(formatMileage(value));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  };

  return (
    <div className="flex-1 space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">{label}</label>
      <div className={cn(
        "bg-slate-50 border rounded-xl px-4 py-3 text-slate-800 font-bold text-lg flex items-center transition-all",
        isFocused ? "border-[#005fb8] ring-2 ring-[#005fb8]/10" : "border-slate-200"
      )}>
        <input 
          type="text" 
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          className="bg-transparent outline-none w-full"
          placeholder="例如: 166k+587"
        />
      </div>
    </div>
  );
}
