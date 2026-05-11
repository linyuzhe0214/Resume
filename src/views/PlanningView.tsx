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
  currentTime: Date;
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
  currentTime,
}: PlanningViewProps) {
  const mainlineHistoryHeader = (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#00488d] shadow-lg z-[60] relative">
      <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
        高速公路路巡系統
      </h1>
      <div className="text-right">
        <div className="text-xl font-mono font-black text-white tracking-tighter leading-none">
          {format(currentTime, 'HH:mm:ss')}
        </div>
        <div className="text-[10px] text-blue-200 font-bold tracking-widest opacity-80">
          {format(currentTime, 'yyyy-MM-dd')}
        </div>
      </div>
    </header>
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {mainlineHistoryHeader}
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
      />
    </div>
  );
}
