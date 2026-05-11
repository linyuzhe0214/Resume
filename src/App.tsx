import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { MAINLINE_URL, RAMP_URL, PLANNING_URL } from './config';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layout & Views
import { MainLayout } from './components/layout/MainLayout';
import { SurfaceView } from './views/SurfaceView';
import { MainlineView } from './views/MainlineView';
import { RampView } from './views/RampView';
import { PlanningView } from './views/PlanningView';

// Edit Components
import EditSegment from './components/EditSegment';
import EditRamp from './components/EditRamp';
import EditRampHistory from './components/EditRampHistory';
import EditPavement from './components/EditPavement';
import ConfirmDialog from './components/ConfirmDialog';

// Hooks
import { useGeolocationSync } from './hooks/useGeolocationSync';
import { useHighwayData } from './hooks/useHighwayData';
import { useUIState } from './hooks/useUIState';
import { cn } from './utils/utils';

// Since App is the root, we need an inner component to use router hooks
function AppContent() {
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  
  const {
    currentTime,
    editingSegmentId, setEditingSegmentId,
    editingRampId, setEditingRampId,
    draftSegment, setDraftSegment,
    draftRamp, setDraftRamp,
    activeHistoryHighway, setActiveHistoryHighway,
    activeRampHighway, setActiveRampHighway,
    activeRampInterchange, setActiveRampInterchange,
    searchQuery, setSearchQuery,
    highlightSegmentId, setHighlightSegmentId,
    toast, setToast,
    showConfirmDeleteAll, setShowConfirmDeleteAll,
    showLaneDeleteConfirm, setShowLaneDeleteConfirm
  } = useUIState();

  const {
    segments, setSegments,
    planningSegments, setPlanningSegments,
    rampSegments, setRampSegments,
    laneOptions,
    loadingData,
    syncGas,
    handleAddLane,
    executeDeleteLane,
    handleUpdateLaneOrder,
    handleUpdateRampOrder
  } = useHighwayData(setToast);

  const {
    location, gpsStatus, accuracy,
    highwayName, setHighwayName,
    mileage, setMileage,
    direction, setDirection,
    kmlIndex, kmlLoading,
    currentKmlPoint, currentKmlType,
    searchMode, setSearchMode,
    autoTracking, setAutoTracking
  } = useGeolocationSync();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = searchQuery.trim().toLowerCase();
      
      const setManualMode = () => {
        if (autoTracking) {
          setAutoTracking(false);
          setToast({ message: 'GPS 自動跟隨已暫停', type: 'info' });
        }
      };

      if (val.includes('k+')) {
        const parts = val.split('k+');
        if (parts.length === 2) {
          const km = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(km) && !isNaN(m)) {
            const newMileage = km * 1000 + m;
            setMileage(newMileage);
            setManualMode();
            setToast({ message: `已手動定位至 ${km}k+${m.toString().padStart(3, '0')}`, type: 'success' });
            return;
          }
        }
      }
      
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && !val.includes('k+')) {
        setMileage(num);
        setManualMode();
        setToast({ message: `已手動定位至 ${formatMileage(num)}`, type: 'success' });
      }
    }
  };

  const formatMileage = (meters: number) => {
    const km = Math.floor(meters / 1000);
    const m = Math.floor(meters % 1000);
    return `${km}k+${m.toString().padStart(3, '0')}`;
  };

  const confirmDeleteLane = () => {
    if (!showLaneDeleteConfirm) return;
    executeDeleteLane(showLaneDeleteConfirm.highway, showLaneDeleteConfirm.lane);
    setShowLaneDeleteConfirm(null);
  };

  const renderOverlays = () => (
    <>
      <ConfirmDialog 
        isOpen={showConfirmDeleteAll}
        title="確定要刪除所有整修規劃嗎？"
        message="此操作無法復原，所有規劃路段將被永久移除。"
        type="danger"
        onConfirm={() => {
          planningSegments.forEach(seg => {
            if (PLANNING_URL) syncGas(PLANNING_URL, 'deletePlanning', seg.highway + ' (規劃)', seg.id, true);
          });
          setPlanningSegments([]);
          setShowConfirmDeleteAll(false);
          setToast({ message: '已成功刪除所有規劃路段', type: 'info' });
        }}
        onCancel={() => setShowConfirmDeleteAll(false)}
      />

      <ConfirmDialog 
        isOpen={!!showLaneDeleteConfirm}
        title="確定要刪除此車道嗎？"
        message={`刪除 ${showLaneDeleteConfirm?.highway} 的「${showLaneDeleteConfirm?.lane}」將連帶刪除 ${showLaneDeleteConfirm?.count} 筆施工紀錄。此操作無法復原。`}
        type="danger"
        onConfirm={confirmDeleteLane}
        onCancel={() => setShowLaneDeleteConfirm(null)}
      />

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={cn(
            "px-6 py-3 rounded-full shadow-2xl text-white font-bold text-sm",
            toast.type === 'success' ? "bg-green-500" : 
            toast.type === 'error' ? "bg-red-500" : "bg-slate-800"
          )}>
            {toast.message}
          </div>
        </div>
      )}
    </>
  );

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold tracking-widest">資料載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout overlays={renderOverlays()} />}>
        <Route path="/" element={
          <SurfaceView 
            currentTime={currentTime}
            autoTracking={autoTracking} setAutoTracking={setAutoTracking}
            gpsStatus={gpsStatus} accuracy={accuracy} location={location}
            highwayName={highwayName} setHighwayName={setHighwayName}
            direction={direction} setDirection={setDirection}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch}
            mileage={mileage} formatMileage={formatMileage}
            searchMode={searchMode} setSearchMode={setSearchMode}
            kmlLoading={kmlLoading} currentKmlPoint={currentKmlPoint} kmlIndex={kmlIndex}
          />
        } />
        <Route path="/mainline" element={
          <MainlineView 
            segments={segments}
            activeHistoryHighway={activeHistoryHighway} setActiveHistoryHighway={setActiveHistoryHighway}
            laneOptions={laneOptions[activeHistoryHighway] || []}
            handleAddLane={handleAddLane} handleDeleteLane={(lane, hw) => setShowLaneDeleteConfirm({ highway: hw, lane, count: segments.filter(s => s.highway === hw && s.lanes.includes(lane)).length })}
            handleUpdateLaneOrder={handleUpdateLaneOrder}
            highlightSegmentId={highlightSegmentId} setHighlightSegmentId={setHighlightSegmentId}
            setEditingSegmentId={setEditingSegmentId} setDraftSegment={setDraftSegment}
            direction={direction} mileage={mileage} navigate={navigate}
          />
        } />
        <Route path="/ramp" element={
          <RampView 
            rampSegments={rampSegments}
            activeRampHighway={activeRampHighway} setActiveRampHighway={setActiveRampHighway}
            activeRampInterchange={activeRampInterchange} setActiveRampInterchange={setActiveRampInterchange}
            handleUpdateRampOrder={handleUpdateRampOrder}
            setEditingRampId={setEditingRampId} setDraftRamp={setDraftRamp}
            syncGas={syncGas} setRampSegments={setRampSegments} RAMP_URL={RAMP_URL} navigate={navigate}
          />
        } />
        <Route path="/planning" element={
          <PlanningView 
            planningSegments={planningSegments}
            activeHistoryHighway={activeHistoryHighway} setActiveHistoryHighway={setActiveHistoryHighway}
            laneOptions={laneOptions[activeHistoryHighway] || []}
            handleAddLane={handleAddLane} handleDeleteLane={(lane, hw) => setShowLaneDeleteConfirm({ highway: hw, lane, count: planningSegments.filter(s => s.highway === hw && s.lanes.includes(lane)).length })}
            handleUpdateLaneOrder={handleUpdateLaneOrder}
            setShowConfirmDeleteAll={setShowConfirmDeleteAll}
            setEditingSegmentId={setEditingSegmentId} setDraftSegment={setDraftSegment}
            currentTime={currentTime} navigate={navigate}
          />
        } />
      </Route>
      
      {/* Edit Routes (Full Screen Overlays) */}
      <Route path="/editSegment" element={
        <EditSegment 
          segment={draftSegment || undefined}
          isPlanning={draftSegment?.type === 'planning'}
          laneOptions={laneOptions[draftSegment?.highway || highwayName] || []}
          allSegments={draftSegment?.type === 'planning' ? planningSegments : segments}
          onChange={(segment) => setDraftSegment(segment)}
          onSave={(segment) => {
            let savedId = segment.id;
            if (segment.type === 'planning') {
              if (editingSegmentId) {
                setPlanningSegments(planningSegments.map(s => s.id === editingSegmentId ? segment : s));
                if (PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', segment.highway + ' (規劃)', segment);
              } else {
                const newSeg = { ...segment, id: Math.random().toString(36).substr(2, 9) };
                setPlanningSegments([...planningSegments, newSeg]);
                if (PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', segment.highway + ' (規劃)', newSeg);
              }
              navigate('/planning');
            } else {
              if (editingSegmentId) {
                setSegments(segments.map(s => s.id === editingSegmentId ? segment : s));
                syncGas(MAINLINE_URL, 'saveMainline', segment.highway, segment);
                savedId = editingSegmentId;
              } else {
                const newSeg = { ...segment, id: Math.random().toString(36).substr(2, 9) };
                setSegments([...segments, newSeg]);
                syncGas(MAINLINE_URL, 'saveMainline', segment.highway, newSeg);
                savedId = newSeg.id;
              }
              setActiveHistoryHighway(segment.highway);
              setHighlightSegmentId(savedId);
              navigate('/mainline');
            }
            setDraftSegment(null);
            setEditingSegmentId(null);
          }}
          onCopy={() => {
            if (draftSegment) {
              setDraftSegment({ ...draftSegment, id: '' });
              setEditingSegmentId(null);
              setToast({ message: '已複製資料為新草稿', type: 'success' });
            }
          }}
          onCopyPavement={(targetIds, layers) => {
            const copyFrom = draftSegment;
            if (draftSegment?.type === 'planning') {
              const updatedPlanning = planningSegments.map(s =>
                targetIds.includes(s.id) ? { 
                  ...s, 
                  pavementLayers: layers.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })),
                  constructionYear: (s.direction === copyFrom?.direction) ? (copyFrom?.constructionYear || s.constructionYear) : s.constructionYear,
                  constructionMonth: (s.direction === copyFrom?.direction) ? (copyFrom?.constructionMonth || s.constructionMonth) : s.constructionMonth
                } : s
              );
              setPlanningSegments(updatedPlanning);
              targetIds.forEach(id => {
                const updated = updatedPlanning.find(seg => seg.id === id);
                if (updated && PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', updated.highway + ' (規劃)', { ...updated, type: 'planning' });
              });
            } else {
              const updatedSegments = segments.map(s =>
                targetIds.includes(s.id) ? { 
                  ...s, 
                  pavementLayers: layers.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })),
                  constructionYear: (s.direction === copyFrom?.direction) ? (copyFrom?.constructionYear || s.constructionYear) : s.constructionYear,
                  constructionMonth: (s.direction === copyFrom?.direction) ? (copyFrom?.constructionMonth || s.constructionMonth) : s.constructionMonth
                } : s
              );
              setSegments(updatedSegments);
              targetIds.forEach(id => {
                const updated = updatedSegments.find(seg => seg.id === id);
                if (updated) syncGas(MAINLINE_URL, 'saveMainline', updated.highway, updated);
              });
            }
            setToast({ message: `已成功複製鋪面斷面至 ${targetIds.length} 個路段`, type: 'success' });
          }}
          onDelete={(id) => {
            if (draftSegment?.type === 'planning') {
              const seg = planningSegments.find(s => s.id === id);
              setPlanningSegments(planningSegments.filter(s => s.id !== id));
              if (seg && PLANNING_URL) syncGas(PLANNING_URL, 'deletePlanning', seg.highway + ' (規劃)', id, true);
              navigate('/planning');
            } else {
              const seg = segments.find(s => s.id === id);
              setSegments(segments.filter(s => s.id !== id));
              if (seg) syncGas(MAINLINE_URL, 'deleteMainline', seg.highway, id, true);
              navigate('/mainline');
            }
          }}
          onMoveToPlanning={(segment) => {
            const newPlanningSegment = { 
              ...segment, 
              id: Math.random().toString(36).substr(2, 9),
              type: 'planning' as const,
              notes: segment.notes ? `${segment.notes} (從履歷複製)` : '從履歷複製'
            };
            setPlanningSegments([...planningSegments, newPlanningSegment]);
            if (PLANNING_URL) syncGas(PLANNING_URL, 'savePlanning', segment.highway + ' (規劃)', newPlanningSegment);
            setToast({ message: '已成功複製到整修規劃頁面並存檔', type: 'success' });
          }}
          onBack={() => {
            navigate(-1);
            setDraftSegment(null);
            setEditingSegmentId(null);
          }} 
          onNavigateToPavement={() => navigate('/editPavement')} 
        />
      } />

      <Route path="/editPavement" element={
        <EditPavement 
          layers={draftSegment?.pavementLayers || []}
          onSave={(layers) => {
            if (draftSegment) setDraftSegment({ ...draftSegment, pavementLayers: layers });
            navigate('/editSegment');
          }}
          onBack={() => navigate('/editSegment')} 
        />
      } />

      <Route path="/editRamp" element={
        <EditRamp 
          segment={draftRamp || undefined}
          onChange={(ramp) => setDraftRamp(ramp)}
          onSave={(ramp) => {
            if (editingRampId) {
              const oldRamp = rampSegments.find(s => s.id === editingRampId);
              if (oldRamp) {
                let updatedSegments = rampSegments.map(s => s.id === editingRampId ? ramp : s);
                updatedSegments = updatedSegments.map(s => s.rampId === oldRamp.rampId ? {
                  ...s, rampId: ramp.rampId, rampName: ramp.rampName, rampNo: ramp.rampNo, highway: ramp.highway, interchange: ramp.interchange, length: ramp.length, notes: ramp.notes
                } : s);
                setRampSegments(updatedSegments);
              }
              syncGas(RAMP_URL, 'saveRamp', ramp.interchange, ramp);
            } else {
              const newRamp = { ...ramp, id: Math.random().toString(36).substr(2, 9) };
              setRampSegments([...rampSegments, newRamp]);
              syncGas(RAMP_URL, 'saveRamp', newRamp.interchange, newRamp);
            }
            setActiveRampHighway(ramp.highway);
            setActiveRampInterchange(ramp.interchange);
            setDraftRamp(null);
            setEditingRampId(null);
            navigate('/ramp');
          }}
          onDelete={(id) => {
            const seg = rampSegments.find(s => s.id === id);
            if (seg) syncGas(RAMP_URL, 'deleteRamp', seg.interchange, id, true);
            setRampSegments(rampSegments.filter(s => s.id !== id));
            navigate('/ramp');
          }}
          onBack={() => navigate('/ramp')} 
          onNavigateToPavement={() => navigate('/editRampPavement')}
        />
      } />

      <Route path="/editRampHistory" element={
        <EditRampHistory 
          segment={draftRamp || undefined}
          availableRamps={rampSegments}
          allRampSegs={rampSegments}
          onChange={(ramp) => setDraftRamp(ramp)}
          onSave={(ramp) => {
            if (editingRampId) {
              setRampSegments(rampSegments.map(s => s.id === editingRampId ? ramp : s));
            } else {
              const newRamp = { ...ramp, id: Math.random().toString(36).substr(2, 9) };
              ramp = newRamp;
              setRampSegments([...rampSegments, newRamp]);
            }
            syncGas(RAMP_URL, 'saveRamp', ramp.interchange, ramp);
            setActiveRampHighway(ramp.highway);
            setActiveRampInterchange(ramp.interchange);
            setDraftRamp(null);
            setEditingRampId(null);
            navigate('/ramp');
          }}
          onCopy={() => {
            if (draftRamp) {
              setDraftRamp({ ...draftRamp, id: '' });
              setEditingRampId(null);
              setToast({ message: '已複製資料為新草稿', type: 'success' });
            }
          }}
          onCopyPavement={(targetIds, layers) => {
            const updatedRamps = rampSegments.map(s =>
              targetIds.includes(s.id) ? { 
                ...s, 
                pavementLayers: layers.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })),
                constructionYear: (s.direction === draftRamp?.direction) ? (draftRamp?.constructionYear || s.constructionYear) : s.constructionYear,
                constructionMonth: (s.direction === draftRamp?.direction) ? (draftRamp?.constructionMonth || s.constructionMonth) : s.constructionMonth,
                completionTime: (s.direction === draftRamp?.direction) ? (draftRamp?.completionTime || s.completionTime) : s.completionTime
              } : s
            );
            setRampSegments(updatedRamps);
            targetIds.forEach(id => {
              const updated = updatedRamps.find(r => r.id === id);
              if (updated) syncGas(RAMP_URL, 'saveRamp', updated.interchange, updated);
            });
            setToast({ message: `已成功複製鋪面斷面至 ${targetIds.length} 個施工歷史`, type: 'success' });
          }}
          onDelete={(id) => {
            const seg = rampSegments.find(s => s.id === id);
            if (seg) syncGas(RAMP_URL, 'deleteRamp', seg.interchange, id, true);
            setRampSegments(rampSegments.filter(s => s.id !== id));
            navigate('/ramp');
          }}
          onBack={() => navigate('/ramp')} 
          onNavigateToPavement={() => navigate('/editRampHistoryPavement')}
        />
      } />

      <Route path="/editRampPavement" element={
        <EditPavement 
          layers={draftRamp?.pavementLayers || []}
          defaultMonth={draftRamp?.completionTime ? draftRamp.completionTime.replace('/', '') : undefined}
          onSave={(layers) => {
            if (draftRamp) setDraftRamp({ ...draftRamp, pavementLayers: layers });
            navigate('/editRamp');
          }}
          onBack={() => navigate('/editRamp')} 
        />
      } />

      <Route path="/editRampHistoryPavement" element={
        <EditPavement 
          layers={draftRamp?.pavementLayers || []}
          defaultMonth={draftRamp?.completionTime ? draftRamp.completionTime.replace('/', '') : undefined}
          onSave={(layers) => {
            if (draftRamp) setDraftRamp({ ...draftRamp, pavementLayers: layers });
            navigate('/editRampHistory');
          }}
          onBack={() => navigate('/editRampHistory')} 
        />
      } />

    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
