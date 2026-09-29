import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../App';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

export default function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = '確定', 
  cancelText = '取消',
  type = 'info'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md anim-fade-scale">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden anim-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 sm:p-7 flex flex-col items-center text-center">
          {/* Icon Badge */}
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg",
            type === 'danger' && "bg-red-50 text-red-600 border border-red-100 shadow-red-500/10",
            type === 'warning' && "bg-amber-50 text-amber-600 border border-amber-100 shadow-amber-500/10",
            type === 'info' && "bg-blue-50 text-blue-600 border border-blue-100 shadow-blue-500/10"
          )}>
            {type === 'danger' && <AlertTriangle className="w-7 h-7" />}
            {type === 'warning' && <AlertCircle className="w-7 h-7" />}
            {type === 'info' && <Info className="w-7 h-7" />}
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">{message}</p>
        </div>

        <div className="flex p-3 gap-2 bg-slate-50/80 border-t border-slate-100">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 px-4 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={cn(
              "flex-1 py-3 px-4 text-xs sm:text-sm font-black rounded-xl text-white shadow-md transition-all active:scale-95",
              type === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-600/25" :
              type === 'warning' ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25" :
              "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
