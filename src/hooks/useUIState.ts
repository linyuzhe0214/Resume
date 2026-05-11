import { useState, useEffect } from 'react';
import { Segment, RampSegment } from '../types';

export function useUIState() {
  const [activeTab, setActiveTab] = useState<'surface' | 'mainline' | 'ramp' | 'planning'>('surface');
  const [subPage, setSubPage] = useState<'none' | 'editSegment' | 'editPavement' | 'editRamp' | 'editRampHistory' | 'editRampHistoryPavement'>('none');
  
  const [activeHistoryHighway, setActiveHistoryHighway] = useState<string>('國道1號');
  const [activeRampHighway, setActiveRampHighway] = useState<string>('國道1號');
  const [activeRampInterchange, setActiveRampInterchange] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingRampId, setEditingRampId] = useState<string | null>(null);
  const [draftSegment, setDraftSegment] = useState<Segment | null>(null);
  const [draftRamp, setDraftRamp] = useState<RampSegment | null>(null);
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [showLaneDeleteConfirm, setShowLaneDeleteConfirm] = useState<{ highway: string, lane: string, count: number } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return {
    activeTab,
    setActiveTab,
    subPage,
    setSubPage,
    activeHistoryHighway,
    setActiveHistoryHighway,
    activeRampHighway,
    setActiveRampHighway,
    activeRampInterchange,
    setActiveRampInterchange,
    searchQuery,
    setSearchQuery,
    editingSegmentId,
    setEditingSegmentId,
    editingRampId,
    setEditingRampId,
    draftSegment,
    setDraftSegment,
    draftRamp,
    setDraftRamp,
    highlightSegmentId,
    setHighlightSegmentId,
    toast,
    setToast,
    showConfirmDeleteAll,
    setShowConfirmDeleteAll,
    showLaneDeleteConfirm,
    setShowLaneDeleteConfirm
  };
}
