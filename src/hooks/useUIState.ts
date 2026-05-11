import { useState, useEffect } from 'react';

export type ActiveTab = 'surface' | 'mainline' | 'ramp' | 'planning';
export type SubPage =
  | 'none'
  | 'editSegment'
  | 'editPavement'
  | 'editRamp'
  | 'editRampPavement'
  | 'editRampHistory'
  | 'editRampHistoryPavement';

export interface ToastState {
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface LaneDeleteConfirm {
  highway: string;
  lane: string;
  count: number;
}

export function useUIState() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('surface');
  const [subPage, setSubPage] = useState<SubPage>('none');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [showLaneDeleteConfirm, setShowLaneDeleteConfirm] =
    useState<LaneDeleteConfirm | null>(null);
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(null);

  // Auto-hide toast after 3 s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, type: ToastState['type'] = 'success') =>
    setToast({ message, type });

  const navigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSubPage('none');
  };

  return {
    activeTab,
    setActiveTab,
    subPage,
    setSubPage,
    navigate,
    toast,
    showToast,
    showConfirmDeleteAll,
    setShowConfirmDeleteAll,
    showLaneDeleteConfirm,
    setShowLaneDeleteConfirm,
    highlightSegmentId,
    setHighlightSegmentId,
  };
}
