import React, { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useUIState } from './hooks/useUIState';
import { useGeolocationSync } from './hooks/useGeolocationSync';
import { useHighwayData } from './hooks/useHighwayData';
import { MainLayout } from './components/layout/MainLayout';
import ViewRouter from './views/ViewRouter';
import { MAINLINE_URL, PLANNING_URL } from './config';
import { syncGas } from './hooks/useHighwayData';
import type { Segment, RampSegment } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. UI state
  const {
    activeTab, setActiveTab, subPage, setSubPage, navigate,
    toast, showToast,
    showConfirmDeleteAll, setShowConfirmDeleteAll,
    showLaneDeleteConfirm, setShowLaneDeleteConfirm,
    highlightSegmentId, setHighlightSegmentId,
  } = useUIState();

  // 2. Geolocation & KML
  const geo = useGeolocationSync();

  // 3. Highway data
  const highway = useHighwayData({
    showToast,
    setShowLaneDeleteConfirm,
    showLaneDeleteConfirm,
    highwayName: geo.highwayName,
  });

  // 4. Draft / editing state (stays here as cross-view temp state)
  const [draftSegment, setDraftSegment] = useState<Segment | null>(null);
  const [draftRamp, setDraftRamp] = useState<RampSegment | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingRampId, setEditingRampId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHistoryHighway, setActiveHistoryHighway] = useState('國道1號');
  const [activeRampHighway, setActiveRampHighway] = useState('國道1號');
  const [activeRampInterchange, setActiveRampInterchange] = useState('');

  return (
    <MainLayout
      activeTab={activeTab}
      subPage={subPage}
      onNavigate={navigate}
      toast={toast}
      showConfirmDeleteAll={showConfirmDeleteAll}
      onConfirmDeleteAll={() => {
        highway.planningSegments.forEach(seg => {
          if (PLANNING_URL) syncGas(PLANNING_URL, 'deletePlanning', seg.highway + ' (規劃)', seg.id, true);
        });
        highway.setPlanningSegments([]);
        setShowConfirmDeleteAll(false);
        showToast('已成功刪除所有規劃路段', 'info');
      }}
      onCancelDeleteAll={() => setShowConfirmDeleteAll(false)}
      showLaneDeleteConfirm={showLaneDeleteConfirm}
      onConfirmDeleteLane={highway.confirmDeleteLane}
      onCancelDeleteLane={() => setShowLaneDeleteConfirm(null)}
    >
      <ViewRouter
        // UI
        activeTab={activeTab}
        subPage={subPage}
        setSubPage={setSubPage}
        setActiveTab={setActiveTab}
        // Data
        segments={highway.segments}
        setSegments={highway.setSegments}
        planningSegments={highway.planningSegments}
        setPlanningSegments={highway.setPlanningSegments}
        rampSegments={highway.rampSegments}
        setRampSegments={highway.setRampSegments}
        laneOptions={highway.laneOptions}
        handleAddLane={highway.handleAddLane}
        handleDeleteLane={highway.handleDeleteLane}
        handleUpdateLaneOrder={highway.handleUpdateLaneOrder}
        handleUpdateRampOrder={highway.handleUpdateRampOrder}
        // Draft
        draftSegment={draftSegment}
        setDraftSegment={setDraftSegment}
        draftRamp={draftRamp}
        setDraftRamp={setDraftRamp}
        editingSegmentId={editingSegmentId}
        setEditingSegmentId={setEditingSegmentId}
        editingRampId={editingRampId}
        setEditingRampId={setEditingRampId}
        // UI helpers
        showToast={showToast}
        setShowConfirmDeleteAll={setShowConfirmDeleteAll}
        highlightSegmentId={highlightSegmentId}
        setHighlightSegmentId={setHighlightSegmentId}
        activeHistoryHighway={activeHistoryHighway}
        setActiveHistoryHighway={setActiveHistoryHighway}
        activeRampHighway={activeRampHighway}
        setActiveRampHighway={setActiveRampHighway}
        activeRampInterchange={activeRampInterchange}
        setActiveRampInterchange={setActiveRampInterchange}
        // Geo
        currentTime={currentTime}
        gpsStatus={geo.gpsStatus}
        accuracy={geo.accuracy}
        autoTracking={geo.autoTracking}
        setAutoTracking={geo.setAutoTracking}
        highwayName={geo.highwayName}
        setHighwayName={geo.setHighwayName}
        direction={geo.direction}
        setDirection={geo.setDirection}
        mileage={geo.mileage}
        setMileage={geo.setMileage}
        location={geo.location}
        kmlLoading={geo.kmlLoading}
        kmlIndex={geo.kmlIndex}
        currentKmlPoint={geo.currentKmlPoint}
        searchMode={geo.searchMode}
        setSearchMode={geo.setSearchMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </MainLayout>
  );
}
