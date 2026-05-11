import React from 'react';
import MainlineHistory from '../components/MainlineHistory';
import { format } from 'date-fns';
import { Segment } from '../types';

interface PlanningViewProps {
  planningSegments: Segment[];
  activeHistoryHighway: string;
  setActiveHistoryHighway: (val: string) => void;
  laneOptions: string[];
  handleAddLane: (lane: string, highway: string) => void;
  handleDeleteLane: (lane: string, highway: string) => void;
  handleUpdateLaneOrder: (highway: string, lanes: string[]) => void;
  setShowConfirmDeleteAll: (val: boolean) => void;
  setEditingSegmentId: (id: string | null) => void;
  setDraftSegment: (segment: Segment | null) => void;
  currentTime: Date;
  navigate: (path: string) => void;
}

export function PlanningView({
  planningSegments, activeHistoryHighway, setActiveHistoryHighway, laneOptions,
  handleAddLane, handleDeleteLane, handleUpdateLaneOrder, setShowConfirmDeleteAll,
  setEditingSegmentId, setDraftSegment, currentTime, navigate
}: PlanningViewProps) {
  return (
    <div className="min-h-screen bg-[#f7f9fc] pb-40">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#00488d] shadow-lg z-[60] relative">
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none">高速公路路巡系統</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xl font-mono font-black text-white tracking-tighter leading-none">{format(currentTime, 'HH:mm:ss')}</div>
            <div className="text-[10px] text-blue-200 font-bold tracking-widest opacity-80">{format(currentTime, 'yyyy-MM-dd')}</div>
          </div>
        </div>
      </header>
      <MainlineHistory 
        title="路面整修規劃"
        segments={planningSegments}
        activeHighway={activeHistoryHighway}
        onActiveHighwayChange={setActiveHistoryHighway}
        laneOptions={laneOptions}
        onAddLane={(lane) => handleAddLane(lane, activeHistoryHighway)}
        onDeleteLane={(lane) => handleDeleteLane(lane, activeHistoryHighway)}
        onUpdateLaneOrder={(newLanes) => handleUpdateLaneOrder(activeHistoryHighway, newLanes)}
        onDeleteAll={() => setShowConfirmDeleteAll(true)}
        onNavigateToEdit={(id) => {
          setEditingSegmentId(id || null);
          if (id) {
            const segment = planningSegments.find(s => s.id === id);
            setDraftSegment(segment ? { ...segment } : null);
          } else {
            setDraftSegment({
              id: '',
              highway: '國道1號',
              property: '路堤',
              laneCategory: '一般路段',
              constructionYear: '113',
              constructionMonth: '08',
              startMileage: 166427,
              endMileage: 166527,
              direction: 'Southbound',
              lanes: ['第一車道'],
              pavementLayers: [],
              prevConstructionYear: '',
              prevConstructionDepth: 0
            });
          }
          navigate('/editSegment');
        }}
      />
    </div>
  );
}
