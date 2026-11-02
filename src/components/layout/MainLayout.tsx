import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Route, Split, HardHat, Check, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ConfirmDialog from '../ConfirmDialog';
import type { ActiveTab, SubPage, ToastState, LaneDeleteConfirm } from '../../hooks/useUIState';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  subPage: SubPage;
  onNavigate: (tab: ActiveTab) => void;
  toast: ToastState | null;
  showConfirmDeleteAll: boolean;
  onConfirmDeleteAll: () => void;
  onCancelDeleteAll: () => void;
  showLaneDeleteConfirm: LaneDeleteConfirm | null;
  onConfirmDeleteLane: () => void;
  onCancelDeleteLane: () => void;
}

const NAV_ITEMS = [
  { tab: 'surface' as const, icon: Layers, label: '路面資料', engLabel: 'Surface' },
  { tab: 'mainline' as const, icon: Route, label: '主線履歷', engLabel: 'Mainline' },
  { tab: 'ramp' as const, icon: Split, label: '匝道履歷', engLabel: 'Ramp' },
  { tab: 'planning' as const, icon: HardHat, label: '整修規劃', engLabel: 'Planning' },
];

export function MainLayout({
  children,
  activeTab,
  subPage,
  onNavigate,
  toast,
  showConfirmDeleteAll,
  onConfirmDeleteAll,
  onCancelDeleteAll,
  showLaneDeleteConfirm,
  onConfirmDeleteLane,
  onCancelDeleteLane,
}: MainLayoutProps) {
  return (
    <div className="relative min-h-screen">
      {children}

      {/* ── Global Overlays ── */}
      <ConfirmDialog
        isOpen={showConfirmDeleteAll}
        title="確定要刪除所有整修規劃嗎？"
        message="此操作無法復原，所有規劃路段將被永久移除。"
        type="danger"
        onConfirm={onConfirmDeleteAll}
        onCancel={onCancelDeleteAll}
      />

      <ConfirmDialog
        isOpen={!!showLaneDeleteConfirm}
        title="確定要刪除此車道嗎？"
        message={`刪除 ${showLaneDeleteConfirm?.highway} 的「${showLaneDeleteConfirm?.lane}」將連帶刪除 ${showLaneDeleteConfirm?.count} 筆施工紀錄。此操作無法復原。`}
        type="danger"
        onConfirm={onConfirmDeleteLane}
        onCancel={onCancelDeleteLane}
      />

      {/* ── Sonner-inspired Polished Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.message}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
          >
            <div
              className={cn(
                'px-5 py-2.5 rounded-2xl shadow-xl text-white font-bold text-xs sm:text-sm flex items-center gap-2.5 border backdrop-blur-xl pointer-events-auto',
                toast.type === 'success'
                  ? 'bg-emerald-600/95 border-emerald-400/40 shadow-emerald-950/20 shadow-lg'
                  : toast.type === 'error'
                  ? 'bg-rose-600/95 border-rose-400/40 shadow-rose-950/20 shadow-lg'
                  : 'bg-slate-900/95 border-slate-700/50 shadow-slate-950/25 shadow-lg',
              )}
            >
              {toast.type === 'success' && <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emil-style Floating Pill Bottom Navigation ── */}
      {subPage === 'none' && (
        <footer
          className={cn(
            'fixed bottom-0 left-0 w-full z-[100]',
            // Mobile: full-width bottom bar with safe area padding
            'pb-[env(safe-area-inset-bottom)] pt-1 px-3',
            // Desktop: floating pill
            'md:w-auto md:left-1/2 md:-translate-x-1/2 md:bottom-5 md:rounded-2xl md:p-1.5 md:pb-1.5',
            // Shared styles
            'flex justify-around md:justify-center md:gap-1 items-center',
            'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-180',
            'border-t md:border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)]',
          )}
        >
          {NAV_ITEMS.map(({ tab, icon: Icon, label }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                className={cn(
                  'relative flex flex-col md:flex-row md:gap-2 items-center justify-center',
                  'rounded-xl px-4 py-2 md:px-4 md:py-2 select-none outline-none',
                  'transition-colors duration-150 btn-press tap-highlight-none',
                  isActive ? 'text-white' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {/* Motion Shared Layout Background Pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-600/25"
                  />
                )}
                <div className="relative z-10 flex flex-col md:flex-row items-center md:gap-2">
                  <Icon
                    className={cn(
                      'w-5 h-5 md:w-4 md:h-4 transition-transform duration-150',
                      isActive ? 'scale-105' : 'opacity-80',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] md:text-xs tracking-tight mt-0.5 md:mt-0',
                      isActive ? 'font-bold' : 'font-medium',
                    )}
                  >
                    {label}
                  </span>
                </div>
              </button>
            );
          })}
        </footer>
      )}
    </div>
  );
}
