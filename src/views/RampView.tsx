import React from 'react';
import RampHistory from '../components/RampHistory';
import { RampSegment } from '../types';

interface RampViewProps {
  rampSegments: RampSegment[];
  activeRampHighway: string;
  setActiveRampHighway: (val: string) => void;
  activeRampInterchange: string;
  setActiveRampInterchange: (val: string) => void;
  handleUpdateRampOrder: (order: string[]) => void;
  setEditingRampId: (id: string | null) => void;
  setDraftRamp: (ramp: RampSegment | null) => void;
  syncGas: (url: string, action: string, sheetName: string, id: string, isDelete: boolean) => void;
  setRampSegments: (segments: RampSegment[]) => void;
  RAMP_URL: string;
  navigate: (path: string) => void;
}

export function RampView({
  rampSegments, activeRampHighway, setActiveRampHighway, activeRampInterchange, setActiveRampInterchange,
  handleUpdateRampOrder, setEditingRampId, setDraftRamp, syncGas, setRampSegments, RAMP_URL, navigate
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
        onNavigateToEditDetails={(id, defaultHighway, defaultInterchange, prototypeId) => {
          setEditingRampId(id || null);
          if (id) {
            const ramp = rampSegments.find(s => s.id === id);
            setDraftRamp(ramp ? { ...ramp } : null);
          } else if (prototypeId) {
            const proto = rampSegments.find(s => s.id === prototypeId);
            if (proto) {
              setDraftRamp({
                ...proto,
                id: '',
                pavementLayers: [],
                maintenanceHistory: [],
                notes: '',
                constructionYear: (new Date().getFullYear() - 1911).toString(),
                constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0')
              });
            }
          } else {
            setDraftRamp({
              id: '',
              rampId: '',
              rampName: '',
              rampNo: '',
              laneCount: 1,
              length: 0,
              status: 'Optimal',
              highway: defaultHighway || '國道1號',
              interchange: defaultInterchange || '豐原交流道',
              property: '路堤',
              laneCategory: '一般路段',
              constructionYear: (new Date().getFullYear() - 1911).toString(),
              constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
              startMileage: 0,
              endMileage: 0,
              direction: 'Southbound',
              lanes: ['第一車道'],
              pavementLayers: [],
              notes: '',
              prevConstructionYear: '',
              prevConstructionDepth: 0
            });
          }
          navigate('/editRamp');
        }} 
        onNavigateToEditHistory={(id, prototypeId, defaultStart, defaultEnd) => {
          setEditingRampId(id || null);
          if (id) {
            const ramp = rampSegments.find(s => s.id === id);
            setDraftRamp(ramp ? { ...ramp } : null);
          } else if (prototypeId) {
            const proto = rampSegments.find(s => s.id === prototypeId);
            if (proto) {
              setDraftRamp({
                ...proto,
                id: '',
                pavementLayers: [],
                maintenanceHistory: [],
                constructionYear: (new Date().getFullYear() - 1911).toString(),
                constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
                startMileage: defaultStart ?? 0,
                endMileage: defaultEnd ?? proto.length
              });
            } else {
              setDraftRamp(null);
            }
          } else {
            setDraftRamp({
              id: '',
              rampId: '',
              rampName: '',
              rampNo: '',
              laneCount: 1,
              length: 0,
              status: 'Optimal',
              highway: '國道1號',
              interchange: '豐原交流道',
              property: '路堤',
              laneCategory: '一般路段',
              constructionYear: (new Date().getFullYear() - 1911).toString(),
              constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
              startMileage: 0,
              endMileage: 0,
              direction: 'Southbound',
              lanes: ['第一車道'],
              pavementLayers: [],
              notes: '',
              prevConstructionYear: '',
              prevConstructionDepth: 0
            });
          }
          navigate('/editRampHistory');
        }}
        onDeleteRamp={(rampId) => {
          const segsToDelete = rampSegments.filter(s => s.rampId === rampId);
          segsToDelete.forEach(seg => syncGas(RAMP_URL, 'deleteRamp', seg.interchange, seg.id, true));
          setRampSegments(rampSegments.filter(s => s.rampId !== rampId));
        }}
      />
    </div>
  );
}
