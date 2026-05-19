import React from 'react';
import { MAINLINE_URL, RAMP_URL, PLANNING_URL } from '../config';
import { syncGas } from '../hooks/useHighwayData';
import type { ActiveTab, SubPage } from '../hooks/useUIState';
import type { Segment, RampSegment } from '../types';

import EditSegment from '../components/EditSegment';
import EditRamp from '../components/EditRamp';
import EditRampHistory from '../components/EditRampHistory';
import EditPavement from '../components/EditPavement';
import SurfaceView from './SurfaceView';
import MainlineView from './MainlineView';
import PlanningView from './PlanningView';
import RampView from './RampView';
import type { KmlPoint } from '../utils/kmlParser';
import type { SearchMode } from '../hooks/useGeolocationSync';

interface ViewRouterProps {
  activeTab: ActiveTab;
  subPage: SubPage;
  setSubPage: (p: SubPage) => void;
  setActiveTab: (t: ActiveTab) => void;
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  planningSegments: Segment[];
  setPlanningSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  rampSegments: RampSegment[];
  setRampSegments: React.Dispatch<React.SetStateAction<RampSegment[]>>;
  laneOptions: Record<string, string[]>;
  handleAddLane: (lane: string, hw?: string) => void;
  handleDeleteLane: (lane: string, hw?: string) => void;
  handleUpdateLaneOrder: (hw: string, lanes: string[]) => void;
  handleUpdateRampOrder: (order: string[]) => void;
  draftSegment: Segment | null;
  setDraftSegment: React.Dispatch<React.SetStateAction<Segment | null>>;
  draftRamp: RampSegment | null;
  setDraftRamp: React.Dispatch<React.SetStateAction<RampSegment | null>>;
  editingSegmentId: string | null;
  setEditingSegmentId: React.Dispatch<React.SetStateAction<string | null>>;
  editingRampId: string | null;
  setEditingRampId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  setShowConfirmDeleteAll: (v: boolean) => void;
  highlightSegmentId: string | null;
  setHighlightSegmentId: (id: string | null) => void;
  activeHistoryHighway: string;
  setActiveHistoryHighway: (hw: string) => void;
  activeRampHighway: string;
  setActiveRampHighway: (hw: string) => void;
  activeRampInterchange: string;
  setActiveRampInterchange: (ic: string) => void;
  currentTime: Date;
  gpsStatus: 'locating' | 'active' | 'error';
  accuracy: number | null;
  autoTracking: boolean;
  setAutoTracking: (v: boolean) => void;
  highwayName: string;
  setHighwayName: (hw: string) => void;
  direction: string;
  setDirection: (d: string) => void;
  mileage: number;
  setMileage: (m: number) => void;
  location: GeolocationPosition | null;
  kmlLoading: boolean;
  kmlIndex: any;
  currentKmlPoint: KmlPoint | null;
  searchMode: SearchMode;
  setSearchMode: (m: SearchMode) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function ViewRouter(props: ViewRouterProps) {
  const {
    activeTab, subPage, setSubPage, setActiveTab,
    segments, setSegments, planningSegments, setPlanningSegments,
    rampSegments, setRampSegments, laneOptions,
    handleAddLane, handleDeleteLane, handleUpdateLaneOrder, handleUpdateRampOrder,
    draftSegment, setDraftSegment, draftRamp, setDraftRamp,
    editingSegmentId, setEditingSegmentId, editingRampId, setEditingRampId,
    showToast, setShowConfirmDeleteAll,
    highlightSegmentId, setHighlightSegmentId,
    activeHistoryHighway, setActiveHistoryHighway,
    activeRampHighway, setActiveRampHighway,
    activeRampInterchange, setActiveRampInterchange,
    currentTime, gpsStatus, accuracy, autoTracking, setAutoTracking,
    highwayName, setHighwayName, direction, setDirection,
    mileage, setMileage, location, kmlLoading, kmlIndex,
    currentKmlPoint, searchMode, setSearchMode, searchQuery, setSearchQuery,
  } = props;

  const backFromEdit = () => {
    setDraftSegment(null);
    setEditingSegmentId(null);
    setSubPage('none');
  };

  const backFromRampEdit = () => {
    setDraftRamp(null);
    setEditingRampId(null);
    setSubPage('none');
  };

  // ── subPage Logic ──
  if (subPage === 'editRamp') {
    return (
      <EditRamp
        segment={draftRamp || undefined}
        onChange={setDraftRamp}
        onSave={(ramp) => {
          if (editingRampId) {
            const oldRamp = rampSegments.find(s => s.id === editingRampId);
            if (oldRamp) {
              let updated = rampSegments.map(s => s.id === editingRampId ? ramp : s);
              updated = updated.map(s => s.rampId === oldRamp.rampId ? {
                ...s, rampId: ramp.rampId, rampName: ramp.rampName, rampNo: ramp.rampNo,
                highway: ramp.highway, interchange: ramp.interchange, length: ramp.length, notes: ramp.notes,
              } : s);
              setRampSegments(updated);
            }
            syncGas(RAMP_URL, 'saveRamp', ramp.interchange, ramp);
          } else {
            const newRamp = { ...ramp, id: Math.random().toString(36).substr(2, 9) };
            setRampSegments(prev => [...prev, newRamp]);
            syncGas(RAMP_URL, 'saveRamp', newRamp.interchange, newRamp);
          }
          setActiveRampHighway(ramp.highway);
          setActiveRampInterchange(ramp.interchange);
          backFromRampEdit();
        }}
        onDelete={(id) => {
          const seg = rampSegments.find(s => s.id === id);
          if (seg) syncGas(RAMP_URL, 'deleteRamp', seg.interchange, id, true);
          setRampSegments(rampSegments.filter(s => s.id !== id));
          backFromRampEdit();
        }}
        onBack={backFromRampEdit}
        onNavigateToPavement={() => setSubPage('editRampPavement')}
      />
    );
  }

  if (subPage === 'editRampPavement') {
    return (
      <EditPavement
        layers={draftRamp?.pavementLayers || []}
        defaultMonth={draftRamp?.completionTime?.replace('/', '')}
        onSave={(layers) => {
          if (draftRamp) setDraftRamp({ ...draftRamp, pavementLayers: layers });
          setSubPage('editRamp');
        }}
        onBack={() => setSubPage('editRamp')}
      />
    );
  }

  if (subPage === 'editRampHistory') {
    return (
      <EditRampHistory
        segment={draftRamp || undefined}
        availableRamps={rampSegments}
        allRampSegs={rampSegments}
        onChange={setDraftRamp}
        onSave={(ramp) => {
          if (editingRampId) {
            setRampSegments(rampSegments.map(s => s.id === editingRampId ? ramp : s));
          } else {
            const newRamp = { ...ramp, id: Math.random().toString(36).substr(2, 9) };
            ramp = newRamp;
            setRampSegments(prev => [...prev, newRamp]);
          }
          syncGas(RAMP_URL, 'saveRamp', ramp.interchange, ramp);
          setActiveRampHighway(ramp.highway);
          setActiveRampInterchange(ramp.interchange);
          backFromRampEdit();
        }}
        onCopy={() => {
          if (draftRamp) {
            setDraftRamp({ ...draftRamp, id: '' });
            setEditingRampId(null);
            showToast('已複製資料為新草稿，請修改後儲存');
          }
        }}
        onCopyPavement={(targetIds, layers) => {
          const updated = rampSegments.map(s =>
            targetIds.includes(s.id) ? {
              ...s,
              pavementLayers: layers.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })),
              constructionYear: s.direction === draftRamp?.direction ? (draftRamp?.constructionYear || s.constructionYear) : s.constructionYear,
              constructionMonth: s.direction === draftRamp?.direction ? (draftRamp?.constructionMonth || s.constructionMonth) : s.constructionMonth,
              completionTime: s.direction === draftRamp?.direction ? (draftRamp?.completionTime || s.completionTime) : s.completionTime,
            } : s
          );
          setRampSegments(updated);
          targetIds.forEach(id => {
            const u = updated.find(r => r.id === id);
            if (u) syncGas(RAMP_URL, 'saveRamp', u.interchange, u);
          });
          showToast(`已成功複製鋪面斷面至 ${targetIds.length} 個施工歷史`);
        }}
        onDelete={(id) => {
          const seg = rampSegments.find(s => s.id === id);
          if (seg) syncGas(RAMP_URL, 'deleteRamp', seg.interchange, id, true);
          setRampSegments(rampSegments.filter(s => s.id !== id));
          backFromRampEdit();
        }}
        onBack={backFromRampEdit}
        onNavigateToPavement={() => setSubPage('editRampHistoryPavement')}
      />
    );
  }

  if (subPage === 'editRampHistoryPavement') {
    return (
      <EditPavement
        layers={draftRamp?.pavementLayers || []}
        defaultMonth={draftRamp?.completionTime?.replace('/', '')}
        onSave={(layers) => {
          if (draftRamp) setDraftRamp({ ...draftRamp, pavementLayers: layers });
          setSubPage('editRampHistory');
        }}
        onBack={() => setSubPage('editRampHistory')}
      />
    );
  }

  if (subPage === 'editSegment') {
    const allSegsForCopy = activeTab === 'planning' ? planningSegments : segments;
    return (
      <EditSegment
        segment={draftSegment || undefined}
        isPlanning={activeTab === 'planning'}
        laneOptions={laneOptions[draftSegment?.highway || highwayName] || []}
        allSegments={allSegsForCopy}
        onChange={setDraftSegment}
        onSave={(segment) => {
          let savedId = segment.id;
          if (activeTab === 'planning') {
            if (editingSegmentId) {
              setPlanningSegments(planningSegments.map(s => s.id === editingSegmentId ? segment : s));
              if (PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', segment.highway + ' (規劃)', { ...segment, type: 'planning' });
              savedId = editingSegmentId;
            } else {
              const newSeg = { ...segment, id: Math.random().toString(36).substr(2, 9), type: 'planning' };
              setPlanningSegments(prev => [...prev, newSeg]);
              if (PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', segment.highway + ' (規劃)', newSeg);
              savedId = newSeg.id;
            }
          } else {
            if (editingSegmentId) {
              setSegments(segments.map(s => s.id === editingSegmentId ? segment : s));
              syncGas(MAINLINE_URL, 'saveMainline', segment.highway, segment);
              savedId = editingSegmentId;
            } else {
              const newSeg = { ...segment, id: Math.random().toString(36).substr(2, 9) };
              setSegments(prev => [...prev, newSeg]);
              syncGas(MAINLINE_URL, 'saveMainline', segment.highway, newSeg);
              savedId = newSeg.id;
            }
            setActiveHistoryHighway(segment.highway);
            setHighlightSegmentId(savedId);
            setActiveTab('mainline');
          }
          backFromEdit();
        }}
        onCopy={() => {
          if (draftSegment) {
            setDraftSegment({ ...draftSegment, id: '' });
            setEditingSegmentId(null);
            showToast('已複製資料為新草稿，請修改後儲存');
          }
        }}
        onCopyPavement={(targetIds, layers) => {
          const copyFrom = draftSegment;
          if (activeTab === 'planning') {
            const updated = planningSegments.map(s =>
              targetIds.includes(s.id) ? {
                ...s,
                pavementLayers: layers.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })),
                constructionYear: s.direction === copyFrom?.direction ? (copyFrom?.constructionYear || s.constructionYear) : s.constructionYear,
                constructionMonth: s.direction === copyFrom?.direction ? (copyFrom?.constructionMonth || s.constructionMonth) : s.constructionMonth,
              } : s
            );
            setPlanningSegments(updated);
            targetIds.forEach(id => {
              const u = updated.find(seg => seg.id === id);
              if (u && PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', u.highway + ' (規劃)', { ...u, type: 'planning' });
            });
          } else {
            const updated = segments.map(s =>
              targetIds.includes(s.id) ? {
                ...s,
                pavementLayers: layers.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })),
                constructionYear: s.direction === copyFrom?.direction ? (copyFrom?.constructionYear || s.constructionYear) : s.constructionYear,
                constructionMonth: s.direction === copyFrom?.direction ? (copyFrom?.constructionMonth || s.constructionMonth) : s.constructionMonth,
              } : s
            );
            setSegments(updated);
            targetIds.forEach(id => {
              const u = updated.find(seg => seg.id === id);
              if (u) syncGas(MAINLINE_URL, 'saveMainline', u.highway, u);
            });
          }
          showToast(`已成功複製鋪面斷面至 ${targetIds.length} 個路段`);
        }}
        onDelete={(id) => {
          if (activeTab === 'planning') {
            const seg = planningSegments.find(s => s.id === id);
            setPlanningSegments(planningSegments.filter(s => s.id !== id));
            if (seg && PLANNING_URL) syncGas(PLANNING_URL, 'deletePlanning', seg.highway + ' (規劃)', id, true);
          } else {
            const seg = segments.find(s => s.id === id);
            setSegments(segments.filter(s => s.id !== id));
            if (seg) syncGas(MAINLINE_URL, 'deleteMainline', seg.highway, id, true);
          }
          backFromEdit();
        }}
        onMoveToPlanning={(segment) => {
          const newSeg = { ...segment, id: Math.random().toString(36).substr(2, 9), type: 'planning' as const, notes: segment.notes ? `${segment.notes} (從履歷複製)` : '從履歷複製' };
          setPlanningSegments(prev => [...prev, newSeg]);
          if (PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', segment.highway + ' (規劃)', newSeg);
          showToast('已成功複製到整修規劃頁面並存檔');
        }}
        onBack={backFromEdit}
        onNavigateToPavement={() => setSubPage('editPavement')}
      />
    );
  }

  if (subPage === 'editPavement') {
    const defaultMonth = draftSegment?.constructionYear && draftSegment?.constructionMonth
      ? `${draftSegment.constructionYear.padStart(3, '0')}${draftSegment.constructionMonth.padStart(2, '0')}`
      : undefined;
    return (
      <EditPavement
        layers={draftSegment?.pavementLayers || []}
        defaultMonth={defaultMonth}
        onSave={(layers) => {
          if (draftSegment) setDraftSegment({ ...draftSegment, pavementLayers: layers });
          setSubPage('editSegment');
        }}
        onBack={() => setSubPage('editSegment')}
      />
    );
  }

  // ── activeTab Routes ──
  if (activeTab === 'ramp') {
    return (
      <RampView
        rampSegments={rampSegments}
        activeRampHighway={activeRampHighway}
        setActiveRampHighway={setActiveRampHighway}
        activeRampInterchange={activeRampInterchange}
        setActiveRampInterchange={setActiveRampInterchange}
        handleUpdateRampOrder={handleUpdateRampOrder}
        onNavigateToEditDetails={(id, hw, interchange, protoId) => {
          setEditingRampId(id || null);
          if (id) {
            const ramp = rampSegments.find(s => s.id === id);
            setDraftRamp(ramp ? { ...ramp } : null);
          } else if (protoId) {
            const proto = rampSegments.find(s => s.id === protoId);
            if (proto) setDraftRamp({ ...proto, id: '', pavementLayers: [], maintenanceHistory: [], notes: '', constructionYear: (new Date().getFullYear() - 1911).toString(), constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0') });
          } else {
            setDraftRamp({
              id: '', rampId: '', rampName: '', rampNo: '', laneCount: 1, length: 0,
              status: 'Optimal', highway: hw || '國道1號', interchange: interchange || '豐原交流道',
              property: '路堤', laneCategory: '一般路段',
              constructionYear: (new Date().getFullYear() - 1911).toString(),
              constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
              startMileage: 0, endMileage: 0, direction: 'Southbound',
              lanes: ['第一車道'], pavementLayers: [], notes: '',
              prevConstructionYear: '', prevConstructionDepth: 0,
            });
          }
          setSubPage('editRamp');
        }}
        onNavigateToEditHistory={(id, protoId, start, end) => {
          setEditingRampId(id || null);
          if (id) {
            const ramp = rampSegments.find(s => s.id === id);
            setDraftRamp(ramp ? { ...ramp } : null);
          } else if (protoId) {
            const proto = rampSegments.find(s => s.id === protoId);
            if (proto) setDraftRamp({ ...proto, id: '', pavementLayers: [], maintenanceHistory: [], constructionYear: (new Date().getFullYear() - 1911).toString(), constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'), startMileage: start ?? 0, endMileage: end ?? proto.length });
          } else {
            setDraftRamp({
              id: '', rampId: '', rampName: '', rampNo: '', laneCount: 1, length: 0,
              status: 'Optimal', highway: '國道1號', interchange: '豐原交流道',
              property: '路堤', laneCategory: '一般路段',
              constructionYear: (new Date().getFullYear() - 1911).toString(),
              constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
              startMileage: 0, endMileage: 0, direction: 'Southbound',
              lanes: ['第一車道'], pavementLayers: [], notes: '',
              prevConstructionYear: '', prevConstructionDepth: 0,
            });
          }
          setSubPage('editRampHistory');
        }}
        onDeleteRamp={(rampId) => {
          const toDelete = rampSegments.filter(s => s.rampId === rampId);
          toDelete.forEach(seg => syncGas(RAMP_URL, 'deleteRamp', seg.interchange, seg.id, true));
          setRampSegments(rampSegments.filter(s => s.rampId !== rampId));
        }}
      />
    );
  }

  if (activeTab === 'planning') {
    return (
      <PlanningView
        planningSegments={planningSegments}
        activeHistoryHighway={activeHistoryHighway}
        setActiveHistoryHighway={setActiveHistoryHighway}
        laneOptions={laneOptions[activeHistoryHighway] || []}
        handleAddLane={(lane) => handleAddLane(lane, activeHistoryHighway)}
        handleDeleteLane={(lane) => handleDeleteLane(lane, activeHistoryHighway)}
        handleUpdateLaneOrder={(lanes) => handleUpdateLaneOrder(activeHistoryHighway, lanes)}
        setShowConfirmDeleteAll={setShowConfirmDeleteAll}
        currentTime={currentTime}
        onNavigateToEdit={(id) => {
          setEditingSegmentId(id || null);
          if (id) {
            const seg = planningSegments.find(s => s.id === id);
            setDraftSegment(seg ? { ...seg } : null);
          } else {
            setDraftSegment({ id: '', highway: '國道1號', property: '路堤', laneCategory: '一般路段', constructionYear: '113', constructionMonth: '08', startMileage: 166427, endMileage: 166527, direction: 'Southbound', lanes: ['第一車道'], pavementLayers: [], prevConstructionYear: '', prevConstructionDepth: 0 });
          }
          setSubPage('editSegment');
        }}
      />
    );
  }

  if (activeTab === 'mainline') {
    return (
      <MainlineView
        segments={segments}
        activeHistoryHighway={activeHistoryHighway}
        setActiveHistoryHighway={setActiveHistoryHighway}
        laneOptions={laneOptions[activeHistoryHighway] || []}
        handleAddLane={(lane) => handleAddLane(lane, activeHistoryHighway)}
        handleDeleteLane={(lane) => handleDeleteLane(lane, activeHistoryHighway)}
        handleUpdateLaneOrder={(lanes) => handleUpdateLaneOrder(activeHistoryHighway, lanes)}
        highlightSegmentId={highlightSegmentId}
        onHighlightClear={() => setHighlightSegmentId(null)}
        currentTime={currentTime}
        onNavigateToEdit={(id) => {
          setEditingSegmentId(id || null);
          if (id) {
            const seg = segments.find(s => s.id === id);
            setDraftSegment(seg ? { ...seg } : null);
          } else {
            let mappedDir: 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound' =
              activeHistoryHighway === '國道4號' ? 'Westbound' : 'Southbound';
            if (direction === '北上車道') mappedDir = activeHistoryHighway === '國道4號' ? 'Eastbound' : 'Northbound';
            else if (direction === '東向車道') mappedDir = 'Eastbound';
            else if (direction === '西向車道') mappedDir = 'Westbound';
            setDraftSegment({
              id: '', highway: activeHistoryHighway, property: '路堤', laneCategory: '一般路段',
              constructionYear: (new Date().getFullYear() - 1911).toString(),
              constructionMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
              startMileage: mileage, endMileage: mileage + 100,
              direction: mappedDir, lanes: ['第一車道'], pavementLayers: [],
              notes: '', prevConstructionYear: '', prevConstructionDepth: 0,
            });
          }
          setSubPage('editSegment');
        }}
      />
    );
  }

  // Default: SurfaceView
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = searchQuery.trim().toLowerCase();
    const pauseTracking = () => {
      if (autoTracking) { setAutoTracking(false); showToast('GPS 自動跟隨已暫停', 'info'); }
    };
    if (val.includes('k+')) {
      const [kmStr, mStr] = val.split('k+');
      const km = parseInt(kmStr, 10), m = parseInt(mStr, 10);
      if (!isNaN(km) && !isNaN(m)) {
        setMileage(km * 1000 + m);
        pauseTracking();
        showToast(`已手動定位至 ${km}k+${m.toString().padStart(3, '0')}`);
        return;
      }
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      setMileage(num);
      pauseTracking();
      showToast(`已手動定位至 ${Math.floor(num / 1000)}k+${(num % 1000).toString().padStart(3, '0')}`);
    }
  };

  return (
    <SurfaceView
      currentTime={currentTime}
      gpsStatus={gpsStatus}
      accuracy={accuracy}
      autoTracking={autoTracking}
      onToggleAutoTracking={() => {
        setAutoTracking(!autoTracking);
        if (!autoTracking) showToast('已恢復 GPS 自動追蹤');
      }}
      highwayName={highwayName}
      onHighwayChange={setHighwayName}
      direction={direction}
      onDirectionChange={setDirection}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onSearchKeyDown={handleSearch}
      location={location}
      mileage={mileage}
      kmlLoading={kmlLoading}
      kmlIndex={kmlIndex}
      currentKmlPoint={currentKmlPoint}
      searchMode={searchMode}
      onSearchModeChange={setSearchMode}
    />
  );
}
