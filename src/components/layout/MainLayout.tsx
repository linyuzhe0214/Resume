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

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={cn(
              'px-6 py-3 rounded-full shadow-2xl text-white font-bold text-sm',
              toast.type === 'success'
                ? 'bg-green-500'
                : toast.type === 'error'
                ? 'bg-red-500'
                : 'bg-slate-800',
            )}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      {subPage === 'none' && (
        <footer className="fixed bottom-0 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:rounded-full md:px-3 md:py-2 flex justify-around md:justify-center md:gap-2 items-center px-2 pb-6 pt-3 md:pb-2 bg-white/90 md:bg-white/80 backdrop-blur-xl border-t md:border border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:shadow-2xl z-[100] rounded-t-3xl transition-all">
          {(
            [
              { tab: 'surface', icon: <Layers className="w-6 h-6 md:w-5 md:h-5" />, label: '路面資料' },
              { tab: 'mainline', icon: <Route className="w-6 h-6 md:w-5 md:h-5" />, label: '主線履歷' },
              { tab: 'ramp', icon: <Split className="w-6 h-6 md:w-5 md:h-5" />, label: '匝道履歷' },
              { tab: 'planning', icon: <HardHat className="w-6 h-6 md:w-5 md:h-5" />, label: '整修規劃' },
            ] as const
          ).map(({ tab, icon, label }) => (
            <div
              key={tab}
              onClick={() => onNavigate(tab)}
              className={cn(
                'flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer',
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              {icon}
              <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">
                {label}
              </span>
            </div>
          ))}
        </footer>
      )}
    </div>
  );
}
