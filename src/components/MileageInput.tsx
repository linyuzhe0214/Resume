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
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">{label}</label>
      <div className={cn(
        "bg-slate-50 border rounded-2xl px-4 py-3 text-slate-800 font-bold font-mono text-base sm:text-lg flex items-center transition-all shadow-2xs",
        isFocused ? "border-blue-600 ring-4 ring-blue-500/10 bg-white" : "border-slate-200 hover:border-slate-300"
      )}>
        <input 
          type="text" 
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          className="bg-transparent outline-none w-full placeholder:text-slate-300"
          placeholder="例如: 166k+587"
        />
      </div>
    </div>
  );
}
