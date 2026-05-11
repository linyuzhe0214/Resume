import React from 'react';
import { format } from 'date-fns';
import MainlineHistory from '../components/MainlineHistory';
import type { Segment } from '../types';

interface MainlineViewProps {
  segments: Segment[];
  activeHistoryHighway: string;
  setActiveHistoryHighway: (hw: string) => void;
  laneOptions: string[];
  handleAddLane: (lane: string) => void;
  handleDeleteLane: (lane: string) => void;
  handleUpdateLaneOrder: (lanes: string[]) => void;
  highlightSegmentId: string | null;
  onHighlightClear: () => void;
  onNavigateToEdit: (id?: string) => void;
  currentTime: Date;
}

export default function MainlineView({
  segments,
  activeHistoryHighway,
  setActiveHistoryHighway,
  laneOptions,
  handleAddLane,
  handleDeleteLane,
  handleUpdateLaneOrder,
  highlightSegmentId,
  onHighlightClear,
  onNavigateToEdit,
  currentTime,
}: MainlineViewProps) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <MainlineHistory
        segments={segments}
        activeHighway={activeHistoryHighway}
        onActiveHighwayChange={setActiveHistoryHighway}
        laneOptions={laneOptions}
        onAddLane={handleAddLane}
        onDeleteLane={handleDeleteLane}
        onUpdateLaneOrder={handleUpdateLaneOrder}
        highlightSegmentId={highlightSegmentId}
        onHighlightClear={onHighlightClear}
        onNavigateToEdit={onNavigateToEdit}
      />
    </div>
  );
}
