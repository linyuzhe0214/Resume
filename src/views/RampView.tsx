import React from 'react';
import RampHistory from '../components/RampHistory';
import type { RampSegment } from '../types';

interface RampViewProps {
  rampSegments: RampSegment[];
  activeRampHighway: string;
  setActiveRampHighway: (hw: string) => void;
  activeRampInterchange: string;
  setActiveRampInterchange: (ic: string) => void;
  handleUpdateRampOrder: (order: string[]) => void;
  onNavigateToEditDetails: (id?: string, hw?: string, interchange?: string, protoId?: string) => void;
  onNavigateToEditHistory: (id?: string, protoId?: string, start?: number, end?: number) => void;
  onDeleteRamp: (rampId: string) => void;
}

export default function RampView({
  rampSegments,
  activeRampHighway,
  setActiveRampHighway,
  activeRampInterchange,
  setActiveRampInterchange,
  handleUpdateRampOrder,
  onNavigateToEditDetails,
  onNavigateToEditHistory,
  onDeleteRamp,
}: RampViewProps) {
  return (
    <div className="min-h-screen bg-[#f7f9fc] pb-40">
      <RampHistory
        rampSegments={rampSegments}
        activeHighway={activeRampHighway}
        onActiveHighwayChange={setActiveRampHighway}
        activeInterchange={activeRampInterchange}
        onActiveInterchangeChange={setActiveRampInterchange}
        onUpdateRampOrder={handleUpdateRampOrder}
        onNavigateToEditDetails={onNavigateToEditDetails}
        onNavigateToEditHistory={onNavigateToEditHistory}
        onDeleteRamp={onDeleteRamp}
      />
    </div>
  );
}
