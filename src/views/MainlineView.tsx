import React from 'react';
import MainlineHistory from '../components/MainlineHistory';
import { Segment } from '../types';

interface MainlineViewProps {
  segments: Segment[];
  activeHistoryHighway: string;
  setActiveHistoryHighway: (val: string) => void;
  laneOptions: string[];
  handleAddLane: (lane: string, highway: string) => void;
  handleDeleteLane: (lane: string, highway: string) => void;
  handleUpdateLaneOrder: (highway: string, lanes: string[]) => void;
  highlightSegmentId: string | null;
  setHighlightSegmentId: (val: string | null) => void;
  setEditingSegmentId: (id: string | null) => void;
  setDraftSegment: (segment: Segment | null) => void;
  direction: string;
  mileage: number;
  navigate: (path: string) => void;
}

export function MainlineView({
  segments, activeHistoryHighway, setActiveHistoryHighway, laneOptions,
  handleAddLane, handleDeleteLane, handleUpdateLaneOrder,
  highlightSegmentId, setHighlightSegmentId,
  setEditingSegmentId, setDraftSegment, direction, mileage, navigate
}: MainlineViewProps) {
  return (
    <div className="min-h-screen bg-[#f7f9fc] pb-40">
      <MainlineHistory 
        segments={segments}
        activeHighway={activeHistoryHighway}
        onActiveHighwayChange={setActiveHistoryHighway}
        laneOptions={laneOptions}
        onAddLane={(lane) => handleAddLane(lane, activeHistoryHighway)}
        onDeleteLane={(lane) => handleDeleteLane(lane, activeHistoryHighway)}
        onUpdateLaneOrder={(newLanes) => handleUpdateLaneOrder(activeHistoryHighway, newLanes)}
        highlightSegmentId={highlightSegmentId}
        onHighlightClear={() => setHighlightSegmentId(null)}
        onNavigateToEdit={(id) => {
          setEditingSegmentId(id || null);

          if (id) {
            const segment = segments.find(s => s.id === id);
            setDraftSegment(segment ? { ...segment } : null);
          } else {
            let mappedDir: 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound' = activeHistoryHighway === '國道4號' ? 'Westbound' : 'Southbound';
            if (direction === '北上車道') mappedDir = activeHistoryHighway === '國道4號' ? 'Eastbound' : 'Northbound';
            else if (direction === '南下車道') mappedDir = activeHistoryHighway === '國道4號' ? 'Westbound' : 'Southbound';
            else if (direction === '東向車道') mappedDir = 'Eastbound';
            else if (direction === '西向車道') mappedDir = 'Westbound';
            else if (activeHistoryHighway === '國道4號' && direction === '雙向') mappedDir = 'Westbound';
            setDraftSegment({
              id: '',
              highway: activeHistoryHighway,
              property: '路堤',
              laneCategory: '一般路段',
              constructionYear: (new Date().getFullYear() - 1911).toString(),
              constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
              startMileage: mileage,
              endMileage: mileage + 100,
              direction: mappedDir,
              lanes: ['第一車道'],
              pavementLayers: [],
              notes: '',
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
