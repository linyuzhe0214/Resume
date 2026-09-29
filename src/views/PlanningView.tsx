import React from 'react';
import { format } from 'date-fns';
import MainlineHistory from '../components/MainlineHistory';
import type { Segment } from '../types';

interface PlanningViewProps {
  planningSegments: Segment[];
  activeHistoryHighway: string;
  setActiveHistoryHighway: (hw: string) => void;
  laneOptions: string[];
  handleAddLane: (lane: string) => void;
  handleDeleteLane: (lane: string) => void;
  handleUpdateLaneOrder: (lanes: string[]) => void;
  setShowConfirmDeleteAll: (show: boolean) => void;
  onNavigateToEdit: (id?: string) => void;
  onCompleteRenovation: (seg: Segment) => void;
  currentTime: Date;
  highlightSegmentId?: string | null;
  onHighlightClear?: () => void;
}

export default function PlanningView({
  planningSegments,
  activeHistoryHighway,
  setActiveHistoryHighway,
  laneOptions,
  handleAddLane,
  handleDeleteLane,
  handleUpdateLaneOrder,
  setShowConfirmDeleteAll,
  onNavigateToEdit,
  onCompleteRenovation,
  currentTime,
  highlightSegmentId,
  onHighlightClear,
}: PlanningViewProps) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <MainlineHistory
        title="路面整修規劃"
        segments={planningSegments}
        activeHighway={activeHistoryHighway}
        onActiveHighwayChange={setActiveHistoryHighway}
        laneOptions={laneOptions}
        onAddLane={handleAddLane}
        onDeleteLane={handleDeleteLane}
        onUpdateLaneOrder={handleUpdateLaneOrder}
        onDeleteAll={() => setShowConfirmDeleteAll(true)}
        onNavigateToEdit={onNavigateToEdit}
        onCompleteRenovation={onCompleteRenovation}
        highlightSegmentId={highlightSegmentId}
        onHighlightClear={onHighlightClear}
      />
    </div>
  );
}
