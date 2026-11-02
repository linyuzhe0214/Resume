import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
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
  type = 'info',
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.12 }}
            className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-sm overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-7 flex flex-col items-center text-center">
              {/* Icon Badge */}
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-transform',
                  type === 'danger' && 'bg-red-50 text-red-600 border border-red-100',
                  type === 'warning' && 'bg-amber-50 text-amber-600 border border-amber-100',
                  type === 'info' && 'bg-blue-50 text-blue-600 border border-blue-100',
                )}
              >
                {type === 'danger' && <AlertTriangle className="w-7 h-7 stroke-[2.2]" />}
                {type === 'warning' && <AlertCircle className="w-7 h-7 stroke-[2.2]" />}
                {type === 'info' && <Info className="w-7 h-7 stroke-[2.2]" />}
              </div>

              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">{title}</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">{message}</p>
            </div>

            <div className="flex p-3 gap-2 bg-slate-50/90 border-t border-slate-100">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-all duration-150 active:scale-[0.97]"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  'flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl text-white shadow-sm transition-all duration-150 active:scale-[0.97]',
                  type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    : type === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}