import { useState, useEffect } from 'react';
import { MAINLINE_URL, RAMP_URL, PLANNING_URL } from '../config';
import { INITIAL_HIGHWAY_LANES } from '../constants';
import { initialSegments, initialRampSegments, initialPlanningSegments } from '../mockData';
import type { Segment, RampSegment } from '../types';

// ── GAS Sync 工具函式 ──
export async function syncGas(
  url: string,
  action: string,
  sheetName: string,
  recordOrId: any,
  isDelete = false,
) {
  try {
    const payload = isDelete
      ? { action, sheetName, id: recordOrId }
      : { action, sheetName, record: recordOrId };
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
  } catch (e) {
    console.error(`GAS Sync Error [${action}]:`, e);
  }
}

interface UseHighwayDataOptions {
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  setShowLaneDeleteConfirm: (val: { highway: string; lane: string; count: number } | null) => void;
  showLaneDeleteConfirm: { highway: string; lane: string; count: number } | null;
  highwayName: string;
}

export function useHighwayData({
  showToast,
  setShowLaneDeleteConfirm,
  showLaneDeleteConfirm,
  highwayName,
}: UseHighwayDataOptions) {
  const [loadingData, setLoadingData] = useState(true);

  const [segments, setSegments] = useState<Segment[]>(() => {
    try {
      const saved = localStorage.getItem('segments');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return initialSegments;
  });

  const [planningSegments, setPlanningSegments] = useState<Segment[]>(() => {
    try {
      const saved = localStorage.getItem('planningSegments');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return initialPlanningSegments;
  });

  const [rampSegments, setRampSegments] = useState<RampSegment[]>(() => {
    try {
      const saved = localStorage.getItem('rampSegments');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return initialRampSegments;
  });

  const [laneOptions, setLaneOptions] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('laneOptions_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_HIGHWAY_LANES;
  });

  // ── Fetch from GAS on mount ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mainlineRes, rampRes, planningRes] = await Promise.all([
          fetch(`${MAINLINE_URL}?action=getMainline`),
          fetch(`${RAMP_URL}?action=getRamp`),
          PLANNING_URL ? fetch(`${PLANNING_URL}?action=getPlanning`) : Promise.resolve(null),
        ]);

        const parseGasResponse = async (res: Response | null, name: string) => {
          if (!res) return [];
          const text = await res.text();
          const lowerText = text.trim().toLowerCase();
          if (lowerText.startsWith('<!doctype html>') || lowerText.startsWith('<html')) {
            throw new Error(
              `連線被攔截 (${name})：您的裝置似乎阻擋了第三方 Cookie、處於無痕模式，或是連上了需要登入的公用 Wi-Fi。`,
            );
          }
          try {
            return JSON.parse(text);
          } catch (e) {
            throw new Error(`解析資料失敗 (${name})：伺服器回傳格式不符。`);
          }
        };

        const [mainlineData, rampData, planningData] = await Promise.all([
          parseGasResponse(mainlineRes, '主線'),
          parseGasResponse(rampRes, '匝道'),
          parseGasResponse(planningRes, '規劃'),
        ]);

        if (Array.isArray(mainlineData) && mainlineData.length > 0) {
          const main = mainlineData.filter(
            (s: any) => s.type !== 'planning' && s.id !== 'LANE_OPTIONS_CONFIG',
          );
          if (main.length > 0) setSegments(main);

          // 讀取車道配置（最新時間戳的那筆）
          const settingsRecords = mainlineData.filter((s: any) => s.id === 'LANE_OPTIONS_CONFIG');
          const settingsRecord = settingsRecords.reduce((latest: any, current: any) => {
            if (!latest) return current;
            return (current.timestamp || 0) > (latest.timestamp || 0) ? current : latest;
          }, null);

          if (settingsRecord?.data) {
            setLaneOptions(prev => {
              const cloudTimestamp = settingsRecord.timestamp || 0;
              const localTimestamp = (prev as any)._timestamp || 0;
              if (cloudTimestamp > localTimestamp + 2000) {
                return { ...INITIAL_HIGHWAY_LANES, ...settingsRecord.data, _timestamp: cloudTimestamp } as any;
              }
              return prev;
            });
          }
        }

        if (PLANNING_URL && Array.isArray(planningData) && planningData.length > 0) {
          setPlanningSegments(planningData);
        } else if (Array.isArray(mainlineData)) {
          const plan = mainlineData.filter((s: any) => s.type === 'planning');
          if (plan.length > 0) setPlanningSegments(plan);
        }

        if (Array.isArray(rampData) && rampData.length > 0) {
          setRampSegments(prev => {
            const getGroupId = (r: any) => r.rampId || r.rampName || r.id;
            const existingOrder = Array.from(new Set(prev.map(getGroupId)));
            
            rampData.sort((a, b) => {
              const idA = getGroupId(a);
              const idB = getGroupId(b);
              const idxA = existingOrder.indexOf(idA);
              const idxB = existingOrder.indexOf(idB);
              
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;
              
              return idA.localeCompare(idB, 'zh-TW', { numeric: true });
            });
            return rampData;
          });
        }

        showToast('雲端資料載入成功', 'success');
      } catch (error: any) {
        console.error('Failed to fetch from GAS:', error);
        showToast(error.message || '連線至資料庫失敗，請檢查網路或重新整理。', 'error');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── LocalStorage sync ──
  useEffect(() => { localStorage.setItem('segments', JSON.stringify(segments)); }, [segments]);
  useEffect(() => { localStorage.setItem('planningSegments', JSON.stringify(planningSegments)); }, [planningSegments]);
  useEffect(() => { localStorage.setItem('rampSegments', JSON.stringify(rampSegments)); }, [rampSegments]);
  useEffect(() => { localStorage.setItem('laneOptions_v2', JSON.stringify(laneOptions)); }, [laneOptions]);

  // ── Lane handlers ──
  const handleAddLane = (newLane: string, targetHighway: string = highwayName) => {
    if (!newLane?.trim()) return;
    const trimmedLane = newLane.trim();
    const currentLanes = laneOptions[targetHighway] || [];
    if (currentLanes.some(l => l.toLowerCase() === trimmedLane.toLowerCase())) {
      showToast('此車道名稱已存在於該國道', 'error');
      return;
    }
    const now = Date.now();
    const newOptions = { ...laneOptions, [targetHighway]: [...currentLanes, trimmedLane], _timestamp: now };
    setLaneOptions(newOptions);
    syncGas(MAINLINE_URL, 'saveMainline', 'Mainline', { id: 'LANE_OPTIONS_CONFIG', data: newOptions, timestamp: now });
    showToast(`已於 ${targetHighway} 新增車道: ${trimmedLane}`, 'success');
  };

  const handleDeleteLane = (laneName: string, targetHighway: string = highwayName) => {
    const affectedSegments = segments.filter(
      s => s.highway === targetHighway && s.lanes.includes(laneName),
    );
    setShowLaneDeleteConfirm({ highway: targetHighway, lane: laneName, count: affectedSegments.length });
  };

  const confirmDeleteLane = () => {
    if (!showLaneDeleteConfirm) return;
    const { highway: targetHighway, lane: laneName } = showLaneDeleteConfirm;
    const affectedSegments = segments.filter(
      s => s.highway === targetHighway && s.lanes.includes(laneName),
    );
    affectedSegments.forEach(seg =>
      syncGas(MAINLINE_URL, 'deleteMainline', targetHighway, seg.id, true),
    );
    setSegments(segments.filter(s => !(s.highway === targetHighway && s.lanes.includes(laneName))));

    const now = Date.now();
    const newOptions = {
      ...laneOptions,
      [targetHighway]: (laneOptions[targetHighway] || []).filter(l => l !== laneName),
      _timestamp: now,
    };
    setLaneOptions(newOptions);
    syncGas(MAINLINE_URL, 'saveMainline', 'Mainline', { id: 'LANE_OPTIONS_CONFIG', data: newOptions, timestamp: now });
    showToast(`已刪除 ${targetHighway} 車道及相關 ${affectedSegments.length} 筆資料`, 'success');
    setShowLaneDeleteConfirm(null);
  };

  const handleUpdateLaneOrder = (targetHighway: string, newLanesOrder: string[]) => {
    const now = Date.now();
    const newOptions = { ...laneOptions, [targetHighway]: newLanesOrder, _timestamp: now };
    setLaneOptions(newOptions);
    syncGas(MAINLINE_URL, 'saveMainline', 'Mainline', { id: 'LANE_OPTIONS_CONFIG', data: newOptions, timestamp: now });
    showToast(`已更新 ${targetHighway} 車道排序`, 'success');
  };

  const handleUpdateRampOrder = (newOrder: string[]) => {
    setRampSegments(prev => {
      const getGroupId = (r: RampSegment) => r.rampId || r.rampName || r.id;
      
      const inOrderItems = prev.filter(s => newOrder.includes(getGroupId(s)));
      const outOfOrderItems = prev.filter(s => !newOrder.includes(getGroupId(s)));
      
      inOrderItems.sort((a, b) => {
        const idxA = newOrder.indexOf(getGroupId(a));
        const idxB = newOrder.indexOf(getGroupId(b));
        return idxA - idxB;
      });
      
      // 同步到雲端 (可選，根據需求)
      // inOrderItems.forEach(r => syncGas(RAMP_URL, 'saveRamp', r.interchange, r));
      
      return [...outOfOrderItems, ...inOrderItems];
    });
    showToast('匝道排序已更新', 'success');
  };

  return {
    loadingData,
    segments,
    setSegments,
    planningSegments,
    setPlanningSegments,
    rampSegments,
    setRampSegments,
    laneOptions,
    syncGas,
    handleAddLane,
    handleDeleteLane,
    confirmDeleteLane,
    handleUpdateLaneOrder,
    handleUpdateRampOrder,
  };
}
