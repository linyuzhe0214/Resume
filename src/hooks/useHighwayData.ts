import { useState, useEffect } from 'react';
import { MAINLINE_URL, RAMP_URL, PLANNING_URL } from '../config';
import { INITIAL_HIGHWAY_LANES } from '../constants';
import { initialSegments, initialRampSegments, initialPlanningSegments } from '../mockData';
import type { Segment, RampSegment } from '../types';
import { getRampGroupId } from '../utils/ramp';

// ── GAS Sync 工具函式（含 retry，最多重試 2 次）──
export async function syncGas(
  url: string,
  action: string,
  sheetName: string,
  recordOrId: any,
  isDelete = false,
  onError?: (msg: string) => void,
) {
  const payload = isDelete
    ? { action, sheetName, id: recordOrId }
    : { action, sheetName, record: recordOrId };

  const attempt = async () =>
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });

  for (let i = 0; i < 3; i++) {
    try {
      await attempt();
      return; // 成功即返回
    } catch (e) {
      if (i === 2) {
        // 最後一次仍失敗
        console.error(`GAS Sync Error [${action}] 已重試 2 次:`, e);
        onError?.(`⚠️ 雲端同步失敗（${action}），請確認網路後重新整理`);
      }
      // 等待後重試
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
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

  // 獨立儲存匝道排序（groupId 陣列），不依賴 rampSegments 的陣列順序
  const getSavedRampOrder = (): string[] => {
    try {
      const saved = localStorage.getItem('rampOrder');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  };

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
          // 讀取並過濾雲端匝道排序配置
          const orderRecords = rampData.filter((s: any) => s.id === 'RAMP_ORDER_CONFIG');
          const cleanRampData = rampData.filter((s: any) => s.id !== 'RAMP_ORDER_CONFIG');

          const latestOrderRecord = orderRecords.reduce((latest: any, current: any) => {
            if (!latest) return current;
            return (current.timestamp || 0) > (latest.timestamp || 0) ? current : latest;
          }, null);

          let savedOrder = getSavedRampOrder();
          if (latestOrderRecord?.data && Array.isArray(latestOrderRecord.data)) {
            savedOrder = latestOrderRecord.data;
            localStorage.setItem('rampOrder', JSON.stringify(savedOrder));
          }

          if (cleanRampData.length > 0) {
            cleanRampData.sort((a, b) => {
              const idA = getRampGroupId(a);
              const idB = getRampGroupId(b);
              const idxA = savedOrder.indexOf(idA);
              const idxB = savedOrder.indexOf(idB);

              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              if (idxA !== -1) return -1;
              if (idxB !== -1) return 1;

              return idA.localeCompare(idB, 'zh-TW', { numeric: true });
            });
            setRampSegments(cleanRampData);
          }
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
  // 同步 rampOrder：每次 rampSegments 改變時，把當前的 groupId 順序存起來
  useEffect(() => {
    const order = Array.from(new Set(rampSegments.map(getRampGroupId)));
    localStorage.setItem('rampOrder', JSON.stringify(order));
  }, [rampSegments]);

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
    const now = Date.now();
    setRampSegments(prev => {
      // 先取得已儲存的完整排序，再把當前交流道的新順序合併進去
      const savedOrder = getSavedRampOrder();
      const merged = [
        ...savedOrder.filter(id => !newOrder.includes(id)),
        ...newOrder,
      ];
      // 同時更新 localStorage（不等 effect，確保 GAS fetch 回來前就有正確順序）
      localStorage.setItem('rampOrder', JSON.stringify(merged));

      // 同步上傳匝道排序設定檔至雲端 (GAS)
      syncGas(RAMP_URL, 'saveRamp', 'Ramp', {
        id: 'RAMP_ORDER_CONFIG',
        data: merged,
        timestamp: now,
      });

      const inOrderItems = prev.filter(s => newOrder.includes(getRampGroupId(s)));
      const outOfOrderItems = prev.filter(s => !newOrder.includes(getRampGroupId(s)));

      inOrderItems.sort((a, b) => {
        const idxA = newOrder.indexOf(getRampGroupId(a));
        const idxB = newOrder.indexOf(getRampGroupId(b));
        return idxA - idxB;
      });

      return [...outOfOrderItems, ...inOrderItems];
    });
    showToast('匝道排序已更新並同步至雲端', 'success');
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
