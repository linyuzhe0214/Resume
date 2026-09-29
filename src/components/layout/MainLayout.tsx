import React from 'react';
import { Layers, Route, Split, HardHat } from 'lucide-react';
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
    <div className="relative">
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

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] anim-slide-up">
          <div
            className={cn(
              'px-6 py-3 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-2.5 border',
              toast.type === 'success'
                ? 'bg-emerald-500 border-emerald-400/30 shadow-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-red-500 border-red-400/30 shadow-red-500/20'
                : 'bg-slate-800 border-slate-700/30 shadow-slate-800/20',
            )}
          >
            {toast.type === 'success' && (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      {subPage === 'none' && (
        <footer
          className={cn(
            'fixed bottom-0 left-0 w-full z-[100]',
            // Mobile: full-width bottom bar
            'pb-[env(safe-area-inset-bottom)] pt-1',
            // Desktop: floating pill
            'md:w-auto md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:rounded-2xl md:px-2 md:py-2 md:pb-2',
            // Shared styles
            'flex justify-around md:justify-center md:gap-1 items-center',
            'bg-white/85 md:bg-white/80 backdrop-blur-2xl backdrop-saturate-150',
            'border-t md:border border-slate-200/60',
            'shadow-[0_-2px_20px_rgba(0,0,0,0.06)] md:shadow-[0_8px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]',
            'transition-all duration-300'
          )}
        >
          {NAV_ITEMS.map(({ tab, icon: Icon, label, engLabel }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                className={cn(
                  'relative flex flex-col md:flex-row md:gap-2 items-center justify-center',
                  'rounded-xl md:rounded-xl px-4 py-2 md:px-5 md:py-2.5',
                  'transition-all duration-200 tap-highlight-none btn-press',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/60',
                )}
              >
                {/* Active background pill */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/25 transition-all duration-300" />
                )}
                <div className="relative z-10 flex flex-col md:flex-row items-center md:gap-2">
                  <Icon className={cn(
                    'w-5 h-5 md:w-[18px] md:h-[18px] transition-transform duration-200',
                    isActive && 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                  )} />
                  <span className={cn(
                    'text-[10px] md:text-xs font-bold tracking-wide mt-0.5 md:mt-0',
                    isActive && 'font-extrabold'
                  )}>
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
