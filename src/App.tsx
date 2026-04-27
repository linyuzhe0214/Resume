import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Upload, Route, Split, HardHat, Search, Layers } from 'lucide-react';
import * as turf from '@turf/turf';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// @ts-ignore - 如果找不到此檔案，請見 config.example.ts 或自行建立 config.ts
import { MAINLINE_URL, RAMP_URL, PLANNING_URL } from './config';

import MainlineHistory from './components/MainlineHistory';
import RampHistory from './components/RampHistory';
import EditSegment from './components/EditSegment';
import EditRamp from './components/EditRamp';
import EditRampHistory from './components/EditRampHistory';
import EditPavement from './components/EditPavement';
import ConfirmDialog from './components/ConfirmDialog';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white', whiteSpace: 'pre-wrap' }}>
          <h2>Something went wrong.</h2>
          <details>
            <summary>Click for error details</summary>
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };

import { Segment, RampSegment, PavementLayer } from './types';
import type { Feature, LineString } from 'geojson';
import { parseKmlToPoints, buildKmlIndex, findNearestPoint, findNearestPointByGps, DIRECTION_REVERSE_MAP, type KmlIndex, type KmlPoint, type KmlMainlinePoint, type KmlRampPoint } from './utils/kmlParser';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const initialRampSegments: RampSegment[] = [

  {
    id: 'r1',
    rampId: 'R-01-A',
    rampName: '南投服務區南出',
    rampNo: '匝道一',
    laneCount: 2,
    length: 1240,
    status: 'Optimal',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '111',
    constructionMonth: '08',
    completionTime: '111/08',
    startMileage: 0,
    endMileage: 1240,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'rl1', type: 'PAC (多孔隙瀝青混凝土)', thickness: 2, month: '11108' },
      { id: 'rl2', type: 'DGAC (密級配瀝青混凝土)', thickness: 22, month: '10905' }
    ],
    maintenanceHistory: [
      { id: 'm1', year: '111', startMileage: 0, endMileage: 310, type: 'OG', color: '#fbbf24', label: '2cm OGAC' },
      { id: 'm1_2', year: '113', startMileage: 0, endMileage: 310, type: 'OG', color: '#fbbf24', label: '2cm OGAC' },
      { id: 'm2', year: '109', startMileage: 310, endMileage: 620, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' },
      { id: 'm2_2', year: '110', startMileage: 310, endMileage: 620, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' },
      { id: 'm3', year: '107', startMileage: 620, endMileage: 930, type: 'MILLING', color: '#3b82f6', label: '2cm OGAC' },
      { id: 'm4', year: '104', startMileage: 930, endMileage: 1240, type: 'REINFORCEMENT', color: '#64748b', label: '22cm OG+DG' },
      { id: 'm4_2', year: '105', startMileage: 930, endMileage: 1240, type: 'REINFORCEMENT', color: '#64748b', label: '22cm OG+DG' }
    ],
    prevConstructionYear: '107',
    prevConstructionDepth: 12
  },
  {
    id: 'r2',
    rampId: 'R-01-B',
    rampName: '南投服務區南入',
    rampNo: '匝道二',
    laneCount: 1,
    length: 890,
    status: 'Warning',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '108',
    constructionMonth: '11',
    completionTime: '108/11',
    startMileage: 0,
    endMileage: 890,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'rl3', type: 'DGAC (密級配瀝青混凝土)', thickness: 10, month: '10811' }
    ],
    maintenanceHistory: [
      { id: 'm5', year: '108', startMileage: 0, endMileage: 445, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' },
      { id: 'm6', year: '105', startMileage: 445, endMileage: 890, type: 'REINFORCEMENT', color: '#64748b', label: '22cm OG+DG' }
    ],
    prevConstructionYear: '105',
    prevConstructionDepth: 15
  },
  {
    id: 'r3',
    rampId: 'R-02-C',
    rampName: '南投服務區北出',
    rampNo: '匝道三',
    laneCount: 2,
    length: 1560,
    status: 'Inspection',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '112',
    constructionMonth: '03',
    completionTime: '112/03',
    startMileage: 0,
    endMileage: 1560,
    direction: 'Northbound',
    lanes: ['第一車道', '第二車道'],
    pavementLayers: [
      { id: 'rl4', type: 'DGAC (密級配瀝青混凝土)', thickness: 15, month: '10503' }
    ],
    maintenanceHistory: [
      { id: 'm7', year: '112', startMileage: 0, endMileage: 250, type: 'OG', color: '#fbbf24', label: '2cm OGAC' },
      { id: 'm8', year: '109', startMileage: 250, endMileage: 1000, type: 'MILLING', color: '#3b82f6', label: '22cm OG+DG' },
      { id: 'm8_2', year: '110', startMileage: 250, endMileage: 1000, type: 'MILLING', color: '#3b82f6', label: '22cm OG+DG' },
      { id: 'm9', year: '108', startMileage: 1000, endMileage: 1560, type: 'OG_DG', color: '#f97316', label: '22cm OG+DG' }
    ],
    prevConstructionYear: '100',
    prevConstructionDepth: 10
  },
  {
    id: 'r4',
    rampId: 'R-03-E',
    rampName: '南投服務區北入',
    rampNo: '匝道四',
    laneCount: 1,
    length: 720,
    status: 'Optimal',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '110',
    constructionMonth: '12',
    startMileage: 0,
    endMileage: 720,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'rl5', type: 'PAC (多孔隙瀝青混凝土)', thickness: 5, month: '11212' }
    ],
    maintenanceHistory: [
      { id: 'm10', year: '110', startMileage: 0, endMileage: 360, type: 'MILLING', color: '#3b82f6', label: '22cm OG+DG' },
      { id: 'm11', year: '108', startMileage: 360, endMileage: 720, type: 'OG', color: '#fbbf24', label: '2cm OGAC' }
    ],
    prevConstructionYear: '108',
  }
];

const INITIAL_HIGHWAY_LANES: Record<string, string[]> = {
  '國道1號': ['內路肩', '第一車道', '第二車道', '第三車道', '第四車道', '外路肩', '輔助車道', '機車道', '加速車道', '減速車道', '避難車道', '爬坡車道'],
  '國道3號': ['內路肩', '第一車道', '第二車道', '第三車道', '外路肩', '輔助車道', '加速車道', '減速車道', '避難車道', '爬坡車道'],
  '國道4號': ['內路肩', '第一車道', '第二車道', '外路肩', '輔助車道', '加速車道', '減速車道'],
};

const initialSegments: Segment[] = [
  {
    id: '1',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '113',
    constructionMonth: '05',
    startMileage: 166427,
    endMileage: 166527,
    direction: 'Southbound',
    lanes: ['第四車道'],
    pavementLayers: [
      { id: 'l1', type: 'OGAC (開級配瀝青混凝土)', thickness: 2, month: '11305' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 12, month: '10405' }
    ],
    notes: '路面狀況良好',
    prevConstructionYear: '104',
    prevConstructionDepth: 12
  },
  {
    id: '2',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '113',
    constructionMonth: '06',
    startMileage: 166527,
    endMileage: 166627,
    direction: 'Southbound',
    lanes: ['第四車道'],
    pavementLayers: [
      { id: 'l1', type: 'OGAC (開級配瀝青混凝土)', thickness: 2, month: '11306' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 12, month: '10405' }
    ],
    notes: '',
    prevConstructionYear: '104',
    prevConstructionDepth: 12
  },
  {
    id: '3',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '113',
    constructionMonth: '07',
    startMileage: 166507,
    endMileage: 166907,
    direction: 'Southbound',
    lanes: ['第二車道'],
    pavementLayers: [
      { id: 'l1', type: 'OGAC (開級配瀝青混凝土)', thickness: 2, month: '11307' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 12, month: '10405' }
    ],
    notes: '',
    prevConstructionYear: '104',
    prevConstructionDepth: 12
  },
  {
    id: '4',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '111',
    constructionMonth: '08',
    startMileage: 166827,
    endMileage: 167227,
    direction: 'Northbound',
    lanes: ['第三車道'],
    pavementLayers: [
      { id: 'l1', type: '其他/舊有', thickness: 0, month: '11108' }
    ],
    notes: '舊有路面',
    prevConstructionYear: '',
    prevConstructionDepth: 0
  },
  {
    id: '5',
    highway: '國道3號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '112',
    constructionMonth: '03',
    startMileage: 183587,
    endMileage: 183887,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [
      { id: 'l1', type: 'PAC (多孔隙瀝青混凝土)', thickness: 3, month: '11203' },
      { id: 'l2', type: 'DGAC (密級配瀝青混凝土)', thickness: 10, month: '10502' }
    ],
    notes: '',
    prevConstructionYear: '105',
    prevConstructionDepth: 10
  },
  {
    id: '6',
    highway: '國道4號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '110',
    constructionMonth: '11',
    startMileage: 10982,
    endMileage: 11582,
    direction: 'Northbound',
    lanes: ['第二車道'],
    pavementLayers: [
      { id: 'l1', type: '其他/舊有', thickness: 22, month: '11011' }
    ],
    notes: '',
    prevConstructionYear: '',
    prevConstructionDepth: 0
  }
];

const initialPlanningSegments: Segment[] = [];

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'error'>('locating');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  
  // highwayLine 僅保留以備將來地圖繪圖用，GPS 定位已改用 Haversine 直查
  const [highwayLine, setHighwayLine] = useState<Feature<LineString> | null>(null);
  const [highwayName, setHighwayName] = useState<string>('國道1號');
  const [activeHistoryHighway, setActiveHistoryHighway] = useState<string>('國道1號');
  const [activeRampHighway, setActiveRampHighway] = useState<string>('國道1號');
  const [activeRampInterchange, setActiveRampInterchange] = useState<string>('');
  const [mileage, setMileage] = useState<number>(166500);
  const [direction, setDirection] = useState<string>('北上車道');
  
  // KML 資料庫
  const [kmlIndex, setKmlIndex] = useState<KmlIndex | null>(null);
  const [kmlLoading, setKmlLoading] = useState(true);
  const [currentKmlPoint, setCurrentKmlPoint] = useState<KmlPoint | null>(null);
  const [currentKmlType, setCurrentKmlType] = useState<'mainline' | 'ramp' | null>(null);
  const [searchMode, setSearchMode] = useState<'auto' | 'mainline' | 'ramp'>('auto');
  const [activeTab, setActiveTab] = useState<'surface' | 'mainline' | 'ramp' | 'planning'>('surface');
  const [subPage, setSubPage] = useState<'none' | 'editSegment' | 'editPavement' | 'editRamp' | 'editRampHistory' | 'editRampHistoryPavement'>('none');

  // URLs 現在從 src/config.ts 引入，以防 Vite 的 .env 載入異常
  console.log('Config Debug:', { MAINLINE_URL, RAMP_URL, PLANNING_URL });

  const [loadingData, setLoadingData] = useState(true);

  // Initialize from LocalStorage as fallback
  const [segments, setSegments] = useState<Segment[]>(() => {
    try { const saved = localStorage.getItem('segments'); if (saved !== null) return JSON.parse(saved); } catch(e) {}
    return initialSegments;
  });
  const [planningSegments, setPlanningSegments] = useState<Segment[]>(() => {
    try { const saved = localStorage.getItem('planningSegments'); if (saved !== null) return JSON.parse(saved); } catch(e) {}
    return initialPlanningSegments;
  });
  const [rampSegments, setRampSegments] = useState<RampSegment[]>(() => {
    try { const saved = localStorage.getItem('rampSegments'); if (saved !== null) return JSON.parse(saved); } catch(e) {}
    return initialRampSegments;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [autoTracking, setAutoTracking] = useState(true);
  const [laneOptions, setLaneOptions] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('laneOptions_v2');
      if (saved) return JSON.parse(saved);
      
      // Migration from old flat array if exists
      const oldSaved = localStorage.getItem('laneOptions');
      if (oldSaved) {
        const flatLanes = JSON.parse(oldSaved);
        // If it's the old flat array, we just return the initial but could merge if needed
        // For now, let's just start fresh with V2 to avoid confusion
      }
    } catch (e) {}
    return INITIAL_HIGHWAY_LANES;
  });


  // Fetch data from Google Apps Script on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mainlineRes, rampRes, planningRes] = await Promise.all([
          fetch(`${MAINLINE_URL}?action=getMainline`),
          fetch(`${RAMP_URL}?action=getRamp`),
          PLANNING_URL ? fetch(`${PLANNING_URL}?action=getPlanning`) : Promise.resolve(null)
        ]);
        
        const [mainlineData, rampData, planningData] = await Promise.all([
          mainlineRes.json(),
          rampRes.json(),
          planningRes ? planningRes.json() : []
        ]);
        
        if (Array.isArray(mainlineData) && mainlineData.length > 0) {
          // 向後相容：先從 mainline 取出資料
          const main = mainlineData.filter((s: any) => s.type !== 'planning' && s.id !== 'LANE_OPTIONS_CONFIG');
          if (main.length > 0) setSegments(main);

          // 讀取同步的車道配置 (從所有紀錄中找出時間戳記最新的一筆)
          const settingsRecords = mainlineData.filter((s: any) => s.id === 'LANE_OPTIONS_CONFIG');
          const settingsRecord = settingsRecords.reduce((latest: any, current: any) => {
            if (!latest) return current;
            const latestTs = latest.timestamp || 0;
            const currentTs = current.timestamp || 0;
            return currentTs > latestTs ? current : latest;
          }, null);

          if (settingsRecord && settingsRecord.data) {
            setLaneOptions(prev => {
              const cloudTimestamp = settingsRecord.timestamp || 0;
              const localTimestamp = (prev as any)._timestamp || 0;
              
              // 只有當雲端資料明顯較新時才覆蓋
              if (cloudTimestamp > localTimestamp + 2000) {
                return {
                  ...INITIAL_HIGHWAY_LANES,
                  ...settingsRecord.data,
                  _timestamp: cloudTimestamp
                } as any;
              }
              return prev;
            });
          }
        }
        
        if (PLANNING_URL && Array.isArray(planningData) && planningData.length > 0) {
          setPlanningSegments(planningData);
        } else if (Array.isArray(mainlineData)) { // 如果沒有新 URL，向後相容從舊的拿
          const plan = mainlineData.filter((s: any) => s.type === 'planning');
          if (plan.length > 0) setPlanningSegments(plan);
        }
        if (Array.isArray(rampData) && rampData.length > 0) {
          setRampSegments(rampData);
        }
        setToast({ message: '雲端資料載入成功', type: 'success' });
      } catch (error) {
        console.error('Failed to fetch from GAS:', error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Save state to LocalStorage for offline capability & redundancy
  useEffect(() => { localStorage.setItem('segments', JSON.stringify(segments)); }, [segments]);
  useEffect(() => { localStorage.setItem('planningSegments', JSON.stringify(planningSegments)); }, [planningSegments]);
  useEffect(() => { localStorage.setItem('rampSegments', JSON.stringify(rampSegments)); }, [rampSegments]);
  useEffect(() => { localStorage.setItem('laneOptions_v2', JSON.stringify(laneOptions)); }, [laneOptions]);

  const handleAddLane = (newLane: string, targetHighway: string = highwayName) => {
    if (!newLane || !newLane.trim()) return;
    const trimmedLane = newLane.trim();
    const currentLanes = laneOptions[targetHighway] || [];
    
    if (currentLanes.some(l => l.toLowerCase() === trimmedLane.toLowerCase())) {
      setToast({ message: '此車道名稱已存在於該國道', type: 'error' });
      return;
    }
    
    const now = Date.now();
    const newOptions = {
      ...laneOptions,
      [targetHighway]: [...currentLanes, trimmedLane],
      _timestamp: now
    };
    setLaneOptions(newOptions);
    syncGas(MAINLINE_URL, 'saveMainline', 'Mainline', { id: 'LANE_OPTIONS_CONFIG', data: newOptions, timestamp: now });
    setToast({ message: `已於 ${targetHighway} 新增車道: ${trimmedLane}`, type: 'success' });
  };

  const handleDeleteLane = (laneName: string, targetHighway: string = highwayName) => {
    const affectedSegments = segments.filter(s => s.highway === targetHighway && s.lanes.includes(laneName));
    setShowLaneDeleteConfirm({ highway: targetHighway, lane: laneName, count: affectedSegments.length });
  };

  const confirmDeleteLane = () => {
    if (!showLaneDeleteConfirm) return;
    const { highway: targetHighway, lane: laneName } = showLaneDeleteConfirm;
    const affectedSegments = segments.filter(s => s.highway === targetHighway && s.lanes.includes(laneName));
    
    // 1. Delete associated segments from cloud & local
    affectedSegments.forEach(seg => {
      syncGas(MAINLINE_URL, 'deleteMainline', targetHighway, seg.id, true);
    });
    setSegments(segments.filter(s => !(s.highway === targetHighway && s.lanes.includes(laneName))));
    
    // 2. Remove lane from options
    const now = Date.now();
    const currentLanes = laneOptions[targetHighway] || [];
    const newOptions = {
      ...laneOptions,
      [targetHighway]: currentLanes.filter(l => l !== laneName),
      _timestamp: now
    };
    setLaneOptions(newOptions);
    syncGas(MAINLINE_URL, 'saveMainline', 'Mainline', { id: 'LANE_OPTIONS_CONFIG', data: newOptions, timestamp: now });
    setToast({ message: `已刪除 ${targetHighway} 車道及相關 ${affectedSegments.length} 筆資料`, type: 'success' });
    setShowLaneDeleteConfirm(null);
  };

  const handleUpdateLaneOrder = (targetHighway: string, newLanesOrder: string[]) => {
    const now = Date.now();
    const newOptions = {
      ...laneOptions,
      [targetHighway]: newLanesOrder,
      _timestamp: now
    };
    setLaneOptions(newOptions);
    syncGas(MAINLINE_URL, 'saveMainline', 'Mainline', { id: 'LANE_OPTIONS_CONFIG', data: newOptions, timestamp: now });
    setToast({ message: `已更新 ${targetHighway} 車道排序`, type: 'success' });
  };


  const handleUpdateRampOrder = (newOrder: string[]) => {
    setRampSegments(prev => {
      const sorted = [...prev].sort((a, b) => {
        const idA = a.rampId || a.id;
        const idB = b.rampId || b.id;
        const idxA = newOrder.indexOf(idA);
        const idxB = newOrder.indexOf(idB);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      return sorted;
    });
    setToast({ message: '匝道排序已更新', type: 'success' });
  };

  // GAS Sync Helpers
  const syncGas = async (url: string, action: string, sheetName: string, recordOrId: any, isDelete = false) => {
    try {
      const payload = isDelete 
        ? { action, sheetName, id: recordOrId }
        : { action, sheetName, record: recordOrId };
      await fetch(url, { 
        method: 'POST', 
        body: JSON.stringify(payload),
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        }
      });
    } catch (e) {
      console.error(`GAS Sync Error [${action}]:`, e);
    }
  };

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
            // KML 查表會由 useEffect 自動觸發
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
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingRampId, setEditingRampId] = useState<string | null>(null);
  const [draftSegment, setDraftSegment] = useState<Segment | null>(null);
  const [draftRamp, setDraftRamp] = useState<RampSegment | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showLaneDeleteConfirm, setShowLaneDeleteConfirm] = useState<{ highway: string, lane: string, count: number } | null>(null);
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(null);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto-load KML as the "database" logic — 解析所有 Point Placemark
  useEffect(() => {
    setKmlLoading(true);
    const basePath = (import.meta as any).env?.BASE_URL || '/';
    const fetchPath = basePath.endsWith('/') ? `${basePath}route.kml` : `${basePath}/route.kml`;
    fetch(fetchPath)
      .then(res => res.text())
      .then(kmlText => {
        const points = parseKmlToPoints(kmlText);
        const index = buildKmlIndex(points);
        setKmlIndex(index);

        // 將第一個國道的某方向建成 LineString 備用（地圖繪圖），不再用於里程計算
        for (const hw of Object.keys(index.mainline)) {
          const dirs = Object.values(index.mainline[hw]);
          if (dirs.length > 0 && dirs[0].length >= 2) {
            const coords = dirs[0].map(p => [p.lon, p.lat]);
            setHighwayLine(turf.lineString(coords));
            break;
          }
        }

        console.log(`KML 資料庫載入完成: ${points.length} 個測量點`);
        console.log('主線國道:', Object.keys(index.mainline));
        console.log('匝道國道:', Object.keys(index.ramp));
      })
      .catch(err => console.error('Failed to load local KML routing database:', err))
      .finally(() => setKmlLoading(false));
  }, []);

  // 當 mileage / highway / direction / searchMode 改變時，查詢 KML 對應的測量點
  useEffect(() => {
    if (!kmlIndex) {
      setCurrentKmlPoint(null);
      setCurrentKmlType(null);
      return;
    }
    // 若處於 GPS 自動跟隨模式，不要用單一 mileage 去覆蓋精確擷取到的點 (特別是匝道模式下)
    if (autoTracking) return;

    const result = findNearestPoint(kmlIndex, highwayName, direction, mileage, searchMode);
    setCurrentKmlPoint(result.point);
    setCurrentKmlType(result.type);
  }, [kmlIndex, highwayName, direction, mileage, searchMode, autoTracking]);

  // Geolocation — 用 Haversine 直接從 KML 點找最近的，自動推算國道+里程+方向
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation(pos);
        setAccuracy(pos.coords.accuracy);
        setGpsStatus('active');

        if (!autoTracking) return;

        if (kmlIndex && kmlIndex.allMainlinePoints.length > 0) {
          // 優先用 KML 主線點直接比對 GPS 座標
          const result = findNearestPointByGps(
            kmlIndex,
            pos.coords.longitude,
            pos.coords.latitude,
            500, // 500 公尺容許誤差
            searchMode
          );
          if (result) {
            const { point, exactMileage } = result;
            
            // 直接由 GPS 供應最精準的點 (包含內部匝道點)
            setCurrentKmlPoint(point);
            setCurrentKmlType(point.isRamp ? 'ramp' : 'mainline');

            setMileage(Math.round(exactMileage));
            setHighwayName(point.highway);   // ← 自動更新國道別
            if (point.direction) setDirection(point.direction);    // ← 自動更新行進方向
            return;
          }
        }

        // fallback：若 KML 尚未載入或超出範圍，改用 heading 估算方向
        if (pos.coords.heading !== null) {
          setDirection(pos.coords.heading < 180 ? '北上車道' : '南下車道');
        }
      },
      (err) => {
        console.error(err);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [kmlIndex, autoTracking, searchMode]);

  const formatMileage = (meters: number) => {
    const km = Math.floor(meters / 1000);
    const m = Math.floor(meters % 1000);
    return `${km}k+${m.toString().padStart(3, '0')}`;
  };

  const renderBottomNav = () => (
    <footer className="fixed bottom-0 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:rounded-full md:px-3 md:py-2 flex justify-around md:justify-center md:gap-2 items-center px-2 pb-6 pt-3 md:pb-2 bg-white/90 md:bg-white/80 backdrop-blur-xl border-t md:border border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:shadow-2xl z-[100] rounded-t-3xl transition-all">
      <div onClick={() => { setActiveTab('surface'); setSubPage('none'); }} className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", activeTab === 'surface' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>
        <Layers className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">路面資料</span>
      </div>
      <div onClick={() => { setActiveTab('mainline'); setSubPage('none'); }} className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", activeTab === 'mainline' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>
        <Route className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">主線履歷</span>
      </div>
      <div onClick={() => { setActiveTab('ramp'); setSubPage('none'); }} className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", activeTab === 'ramp' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>
        <Split className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">匝道履歷</span>
      </div>
      <div onClick={() => { setActiveTab('planning'); setSubPage('none'); }} className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", activeTab === 'planning' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>
        <HardHat className="w-6 h-6 md:w-5 md:h-5" />
        <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">整修規劃</span>
      </div>
    </footer>
  );

  // Helper to render global overlays in all sub-pages/tabs
  const renderOverlays = () => {
    return (
      <>
        <ConfirmDialog 
          isOpen={showConfirmDeleteAll}
          title="確定要刪除所有整修規劃嗎？"
          message="此操作無法復原，所有規劃路段將被永久移除。"
          type="danger"
          onConfirm={() => {
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
  };

  if (subPage === 'editRamp') {
    return (
      <div className="relative">
        <EditRamp 
          segment={draftRamp || undefined}
          onChange={(ramp) => setDraftRamp(ramp)}
          onSave={(ramp) => {
            if (editingRampId) {
              const oldRamp = rampSegments.find(s => s.id === editingRampId);
              if (oldRamp) {
                let updatedSegments = rampSegments.map(s => s.id === editingRampId ? ramp : s);
                updatedSegments = updatedSegments.map(s => s.rampId === oldRamp.rampId ? {
                  ...s,
                  rampId: ramp.rampId,
                  rampName: ramp.rampName,
                  rampNo: ramp.rampNo,
                  highway: ramp.highway,
                  interchange: ramp.interchange,
                  length: ramp.length,
                  notes: ramp.notes
                } : s);
                setRampSegments(updatedSegments);
              }
              syncGas(RAMP_URL, 'saveRamp', ramp.interchange, ramp);
            } else {
              const newRamp = { ...ramp, id: Math.random().toString(36).substr(2, 9) };
              setRampSegments(prev => [...prev, newRamp]);
              syncGas(RAMP_URL, 'saveRamp', newRamp.interchange, newRamp);
            }
            setActiveRampHighway(ramp.highway);
            setActiveRampInterchange(ramp.interchange);
            setDraftRamp(null);
            setEditingRampId(null);
            setSubPage('none');
          }}
          onDelete={(id) => {
            const seg = rampSegments.find(s => s.id === id);
            if (seg) syncGas(RAMP_URL, 'deleteRamp', seg.interchange, id, true);
            setRampSegments(rampSegments.filter(s => s.id !== id));
            setDraftRamp(null);
            setEditingRampId(null);
            setSubPage('none');
          }}
          onBack={() => {
            setDraftRamp(null);
            setEditingRampId(null);
            setSubPage('none');
          }} 
          onNavigateToPavement={() => setSubPage('editRampPavement')}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (subPage === 'editRampPavement') {
    return (
      <div className="relative">
        <EditPavement 
          layers={draftRamp?.pavementLayers || []}
          defaultMonth={draftRamp?.completionTime ? draftRamp.completionTime.replace('/', '') : undefined}
          onSave={(layers) => {
            if (draftRamp) {
              setDraftRamp({ ...draftRamp, pavementLayers: layers });
            }
            setSubPage('editRamp');
          }}
          onBack={() => setSubPage('editRamp')} 
        />
        {renderOverlays()}
      </div>
    );
  }

  if (subPage === 'editRampHistory') {
    return (
      <div className="relative">
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
            setSubPage('none');
          }}
          onCopy={() => {
            if (draftRamp) {
              setDraftRamp({ ...draftRamp, id: '' });
              setEditingRampId(null);
              setToast({ message: '已複製資料為新草稿，請修改後儲存', type: 'success' });
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
            
            // Sync each updated segment to GAS
            targetIds.forEach(id => {
              const updated = updatedRamps.find(r => r.id === id);
              if (updated) {
                syncGas(RAMP_URL, 'saveRamp', updated.interchange, updated);
              }
            });

            setToast({ message: `已成功複製鋪面斷面至 ${targetIds.length} 個施工歷史`, type: 'success' });
          }}
          onDelete={(id) => {
            const seg = rampSegments.find(s => s.id === id);
            if (seg) syncGas(RAMP_URL, 'deleteRamp', seg.interchange, id, true);
            setRampSegments(rampSegments.filter(s => s.id !== id));
            setDraftRamp(null);
            setEditingRampId(null);
            setSubPage('none');
          }}
          onBack={() => {
            setDraftRamp(null);
            setEditingRampId(null);
            setSubPage('none');
          }} 
          onNavigateToPavement={() => setSubPage('editRampHistoryPavement')}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (subPage === 'editRampHistoryPavement') {
    return (
      <div className="relative">
        <EditPavement 
          layers={draftRamp?.pavementLayers || []}
          defaultMonth={draftRamp?.completionTime ? draftRamp.completionTime.replace('/', '') : undefined}
          onSave={(layers) => {
            if (draftRamp) {
              setDraftRamp({ ...draftRamp, pavementLayers: layers });
            }
            setSubPage('editRampHistory');
          }}
          onBack={() => setSubPage('editRampHistory')} 
        />
        {renderOverlays()}
      </div>
    );
  }

  if (subPage === 'editSegment') {
    const allSegsForCopy = activeTab === 'planning' ? planningSegments : segments;
    return (
      <div className="relative">
        <EditSegment 
          segment={draftSegment || undefined}
          isPlanning={activeTab === 'planning'}
          laneOptions={laneOptions[draftSegment?.highway || highwayName] || []}
          allSegments={allSegsForCopy}
          onChange={(segment) => setDraftSegment(segment)}
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
              // 切到主線履歷並 highlight 剛存的路段
              setActiveHistoryHighway(segment.highway);
              setHighlightSegmentId(savedId);
              setActiveTab('mainline');
            }
            setDraftSegment(null);
            setEditingSegmentId(null);
            setSubPage('none');
          }}
          onCopy={() => {
            if (draftSegment) {
              setDraftSegment({ ...draftSegment, id: '' });
              setEditingSegmentId(null);
              setToast({ message: '已複製資料為新草稿，請修改後儲存', type: 'success' });
            }
          }}
          onCopyPavement={(targetIds, layers) => {
            const copyFrom = draftSegment;
            if (activeTab === 'planning') {
              const updatedPlanning = planningSegments.map(s =>
                targetIds.includes(s.id) ? { 
                  ...s, 
                  pavementLayers: layers.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })),
                  constructionYear: (s.direction === copyFrom?.direction) ? (copyFrom?.constructionYear || s.constructionYear) : s.constructionYear,
                  constructionMonth: (s.direction === copyFrom?.direction) ? (copyFrom?.constructionMonth || s.constructionMonth) : s.constructionMonth
                } : s
              );
              setPlanningSegments(updatedPlanning);
              
              // Sync to GAS
              targetIds.forEach(id => {
                const updated = updatedPlanning.find(seg => seg.id === id);
                if (updated && PLANNING_URL) {
                  syncGas(PLANNING_URL, 'savePlanning', updated.highway + ' (規劃)', { ...updated, type: 'planning' });
                }
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

              // Sync to GAS
              targetIds.forEach(id => {
                const updated = updatedSegments.find(seg => seg.id === id);
                if (updated) {
                  syncGas(MAINLINE_URL, 'saveMainline', updated.highway, updated);
                }
              });
            }
            setToast({ message: `已成功複製鋪面斷面至 ${targetIds.length} 個路段`, type: 'success' });
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
            setDraftSegment(null);
            setEditingSegmentId(null);
            setSubPage('none');
          }}
          onMoveToPlanning={(segment) => {
            const newPlanningSegment = { 
              ...segment, 
              id: Math.random().toString(36).substr(2, 9),
              type: 'planning' as const,
              notes: segment.notes ? `${segment.notes} (從履歷複製)` : '從履歷複製'
            };
            setPlanningSegments([...planningSegments, newPlanningSegment]);
            if (PLANNING_URL) {
              syncGas(PLANNING_URL, 'savePlanning', segment.highway + ' (規劃)', newPlanningSegment);
            }
            setToast({ message: '已成功複製到整修規劃頁面並存檔', type: 'success' });
          }}
          onBack={() => {
            setDraftSegment(null);
            setEditingSegmentId(null);
            setSubPage('none');
          }} 
          onNavigateToPavement={() => setSubPage('editPavement')} 
        />
        {renderOverlays()}
      </div>
    );
  }

  if (subPage === 'editPavement') {
    return (
      <div className="relative">
        <EditPavement 
          layers={draftSegment?.pavementLayers || []}
          onSave={(layers) => {
            if (draftSegment) {
              setDraftSegment({ ...draftSegment, pavementLayers: layers });
            }
            setSubPage('editSegment');
          }}
          onBack={() => setSubPage('editSegment')} 
        />
        {renderOverlays()}
      </div>
    );
  }

  if (activeTab === 'ramp') {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
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
            setSubPage('editRamp');
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
            setSubPage('editRampHistory');
          }}
          onDeleteRamp={(rampId) => {
            const segsToDelete = rampSegments.filter(s => s.rampId === rampId);
            segsToDelete.forEach(seg => syncGas(RAMP_URL, 'deleteRamp', seg.interchange, seg.id, true));
            setRampSegments(rampSegments.filter(s => s.rampId !== rampId));
          }}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (activeTab === 'planning') {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        {/* 頂部系統資訊欄 - 與主線履歷一致 */}
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
          laneOptions={laneOptions[activeHistoryHighway] || []}
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
            setSubPage('editSegment');
          }}
        />
        {renderOverlays()}
      </div>
    );
  }

  if (activeTab === 'mainline') {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        <MainlineHistory 
          segments={segments}
          activeHighway={activeHistoryHighway}
          onActiveHighwayChange={setActiveHistoryHighway}
          laneOptions={laneOptions[activeHistoryHighway] || []}
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
              // Map Chinese direction to English constant
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
            setSubPage('editSegment');
          }} 
        />
        
        {renderOverlays()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-40 flex flex-col items-center">
      <div className="responsive-container flex flex-col gap-4 py-4">
        {/* Header */}
        <header className="flex flex-col gap-4 p-5 sm:p-6 rounded-3xl bg-[#00488d] shadow-xl shadow-[#00488d]/20 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
                高速公路路巡系統
              </h1>
              {activeTab === 'surface' && (
                <div 
                  className="flex items-center gap-2.5 mt-2 cursor-pointer hover:bg-white/10 px-3 py-1.5 rounded-full w-max -ml-1 transition-all border border-transparent hover:border-white/10 group"
                  onClick={() => {
                    setAutoTracking(!autoTracking);
                    if (!autoTracking) {
                      setToast({ message: '已恢復 GPS 自動追蹤', type: 'success' });
                    }
                  }}
                >
                  <div className="relative flex h-2.5 w-2.5">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      !autoTracking ? "bg-slate-400" :
                      gpsStatus === 'active' ? "bg-green-400" : 
                      gpsStatus === 'locating' ? "bg-yellow-400" : "bg-red-400"
                    )}></span>
                    <span className={cn(
                      "relative inline-flex rounded-full h-2.5 w-2.5",
                      !autoTracking ? "bg-slate-400" :
                      gpsStatus === 'active' ? "bg-green-500" : 
                      gpsStatus === 'locating' ? "bg-yellow-500" : "bg-red-500"
                    )}></span>
                  </div>
                  <span className="text-xs font-bold text-blue-100 group-hover:text-white transition-colors">
                    {!autoTracking ? 'GPS 已暫停' :
                     gpsStatus === 'active' ? `連線中 (${Math.round(accuracy || 0)}m)` : 
                     gpsStatus === 'locating' ? '定位中...' : '定位失敗'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tighter">{format(currentTime, 'HH:mm:ss')}</div>
              <div className="text-xs text-blue-200 font-bold tracking-widest opacity-80">{format(currentTime, 'yyyy-MM-dd')}</div>
            </div>
          </div>
        
        {/* Advanced Location Search - Only show in surface tab */}
        {activeTab === 'surface' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="relative group">
              <select 
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-2xl focus:ring-4 focus:ring-white/10 px-4 py-3 outline-none font-bold appearance-none text-center transition-all hover:bg-white/20"
                value={highwayName}
                onChange={(e) => setHighwayName(e.target.value)}
              >
                {[1, 3, 4].map(h => (
                  <option key={h} className="text-slate-900" value={`國道${h}號`}>國道{h}號</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-white/50">
                <Layers size={14} />
              </div>
            </div>

            <div className="relative group">
              <select 
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-2xl focus:ring-4 focus:ring-white/10 px-4 py-3 outline-none font-bold appearance-none text-center transition-all hover:bg-white/20"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                {['南下車道', '北上車道', '東向車道', '西向車道', '雙向'].map(d => (
                  <option key={d} className="text-slate-900" value={d}>{d}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-white/50">
                <Route size={14} />
              </div>
            </div>

            <div className="col-span-2 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-200 group-focus-within:text-white transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-2xl focus:ring-4 focus:ring-white/10 pl-11 pr-4 py-3 placeholder-blue-200/50 outline-none transition-all font-bold hover:bg-white/20" 
                placeholder="搜尋里程 (例: 166k+500)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>
        )}
      </header>

      {/* Location Section */}
      {activeTab === 'surface' && (
        <>
          <section className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-[2rem] transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-black text-indigo-600 flex items-center gap-2 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full">
                <MapPin className="w-3.5 h-3.5" />
                當前位置
              </span>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-mono tracking-tight leading-none mb-1">COORDINATES</span>
                <span className="text-xs text-slate-600 font-mono font-bold">
                  {location ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}` : '未定位'}
                </span>
              </div>
            </div>
            
            <div className="text-center py-2">
              <div className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {highwayName} <span className="text-indigo-600">{formatMileage(mileage)}</span>
              </div>
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-slate-100 text-sm font-bold text-slate-700 border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                {direction}
              </div>
            </div>

            {/* Search Mode Toggle */}
            <div className="mt-8 flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
              {['auto', 'mainline', 'ramp'].map((mode) => (
                <button
                  key={mode}
                  className={cn(
                    "flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all active:scale-95",
                    searchMode === mode 
                      ? "bg-white text-indigo-700 shadow-lg shadow-indigo-100 ring-1 ring-black/5" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  )}
                  onClick={() => setSearchMode(mode as any)}
                >
                  {mode === 'auto' ? '自動偵測' : mode === 'mainline' ? '主線模式' : '匝道模式'}
                </button>
              ))}
            </div>
          </section>

          {/* Road Information Dashboard */}
          <main className="flex-grow flex flex-col gap-3">
            {kmlLoading ? (
              <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-slate-500">載入路面資料庫中...</span>
              </div>
            ) : !currentKmlPoint ? (
              <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <span className="text-sm font-bold text-slate-500">此里程無測量資料</span>
                <span className="text-xs text-slate-400">目前選擇：{highwayName} / {direction} / {formatMileage(mileage)}</span>
                {kmlIndex && (
                  <div className="mt-4 text-[10px] text-slate-400 text-center space-y-1 bg-slate-50 p-3 rounded-lg w-full max-w-sm">
                    <div className="font-bold text-slate-500 mb-1">📋 KML 檔案內含資料摘要</div>
                    <div>主線包含 : {Object.keys(kmlIndex.mainline).length > 0 ? Object.keys(kmlIndex.mainline).join(', ') : '無'}</div>
                    <div className="text-amber-600/70">匝道包含 : {Object.keys(kmlIndex.ramp).length > 0 ? Object.keys(kmlIndex.ramp).join(', ') : '無'}</div>
                    <div className="mt-2 text-blue-500 font-bold border-t border-slate-200 pt-2">
                       💡 提示：如果切換國道後無資料，請確認搜尋的「里程」是否在該國道的範圍內。例如國道4號可能沒有 166k+500。
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 匝道提示 */}
                {currentKmlPoint.isRamp && (
                  <div className="bg-amber-50 border border-amber-200 shadow-sm p-4 rounded-xl flex items-center gap-3">
                    <Split className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-amber-800">匝道區域 — {(currentKmlPoint as KmlRampPoint).interchangeName}</span>
                      <span className="text-xs text-amber-600 font-bold">
                        {(currentKmlPoint as KmlRampPoint).rampDescription} · {(currentKmlPoint as KmlRampPoint).entryExit}國道 · 匝道編號: {(currentKmlPoint as KmlRampPoint).rampId}
                      </span>
                    </div>
                  </div>
                )}

                {/* General & Geometry Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">路基/路面</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).roadType && (
                        <span className="px-2 py-0.5 bg-blue-50 text-[10px] font-bold rounded border border-blue-200 text-blue-700">
                          {(currentKmlPoint as KmlMainlinePoint).roadType}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-50 text-[10px] font-bold rounded border border-slate-200 text-slate-600">
                        {currentKmlPoint.pavementType || '柔性'}路面
                      </span>
                    </div>
                    <div className="mt-1 text-xl font-black text-slate-800">
                      {currentKmlPoint.roadWidth.toFixed(3)}<span className="text-xs ml-1 text-slate-500">m</span>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">線型資訊</span>
                    <div className="text-sm font-black text-slate-800">
                      曲率: {currentKmlPoint.curvatureRadius > 0 ? `${currentKmlPoint.curvatureRadius.toFixed(2)}m` : 'N/A'}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">縱坡 {currentKmlPoint.longitudinalSlope.toFixed(3)}</span>
                          <span className={cn(
                            "text-[11px] font-black px-1 rounded",
                            currentKmlPoint.longitudinalSlope > 0 
                              ? "text-green-700 bg-green-50" 
                              : currentKmlPoint.longitudinalSlope < 0 
                                ? "text-red-700 bg-red-50" 
                                : "text-slate-500 bg-slate-50"
                          )}>
                            {currentKmlPoint.longitudinalSlope > 0 ? '上坡' : currentKmlPoint.longitudinalSlope < 0 ? '下坡' : '平'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">橫坡 {currentKmlPoint.lateralSlope.toFixed(3)}</span>
                          <span className={cn(
                            "text-[11px] font-black px-1 rounded",
                            currentKmlPoint.lateralSlope > 0 
                              ? "text-green-700 bg-green-50" 
                              : currentKmlPoint.lateralSlope < 0 
                                ? "text-red-700 bg-red-50" 
                                : "text-slate-500 bg-slate-50"
                          )}>
                            {currentKmlPoint.lateralSlope > 0 ? '上坡' : currentKmlPoint.lateralSlope < 0 ? '下坡' : '平'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lane Details & Diagram */}
                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl flex flex-col gap-5">
                  <h3 className="text-xs font-black text-[#0284c7] uppercase tracking-widest border-b border-slate-100 pb-3">
                    斷面配置圖 (CROSS-SECTION) · {currentKmlPoint.stakeNo}
                  </h3>
                  
                  {/* Visual Cross-section Diagram */}
                  <div className="w-full flex items-end justify-center h-28 gap-1 px-2 font-mono text-[9px]">
                    {/* Inner Shoulder (主線才有) */}
                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).innerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-200 w-7 h-14 border-l-2 border-slate-300 flex items-center justify-center text-slate-600 text-[8px] leading-tight text-center font-bold">
                          內<br/>肩
                        </div>
                        <span className="mt-2 text-slate-500 font-bold">{(currentKmlPoint as KmlMainlinePoint).innerShoulderWidth.toFixed(2)}m</span>
                      </div>
                    )}
                    
                    {/* Lanes */}
                    {currentKmlPoint.laneWidths.map((w, i) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div className="bg-slate-100 border-l border-dashed border-slate-300 w-full h-20 flex items-center justify-center text-slate-700 font-black text-[10px]">
                          車道{i + 1}
                        </div>
                        <span className="mt-2 text-slate-500 font-bold">{w.toFixed(2)}m</span>
                      </div>
                    ))}

                    {/* 輔助車道 (主線才有) */}
                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).auxiliaryLanes.map((aux, i) => (
                      <div key={`aux-${i}`} className="flex flex-col items-center flex-1">
                        <div className="bg-blue-50 border-l border-dashed border-blue-200 w-full h-16 flex items-center justify-center text-blue-700 font-black text-[9px]">
                          {aux.name}
                        </div>
                        <span className="mt-2 text-blue-500 font-bold">{aux.width.toFixed(2)}m</span>
                      </div>
                    ))}
                    
                    {/* Outer Shoulder (主線才有) */}
                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).outerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-200 w-16 h-14 border-r-2 border-slate-300 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                          外路肩
                        </div>
                        <span className="mt-2 text-slate-500 font-bold">{(currentKmlPoint as KmlMainlinePoint).outerShoulderWidth.toFixed(2)}m</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Detail Grid */}
                  {!currentKmlPoint.isRamp ? (() => {
                    const mp = currentKmlPoint as KmlMainlinePoint;
                    return (
                      <div className="grid grid-cols-2 gap-y-3 text-xs border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">槽化線:</span> 
                          <span className="font-black text-slate-800">{mp.hasChannelization ? `有 (${mp.channelizationWidth.toFixed(3)}m)` : '無'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">輔助車道:</span> 
                          <span className="font-black text-slate-800">
                            {mp.auxiliaryLanes.length > 0 
                              ? mp.auxiliaryLanes.map(a => `${a.name} (${a.width.toFixed(2)}m)`).join(', ')
                              : '無'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">內側路肩:</span> 
                          <span className={cn("font-black", mp.hasInnerShoulder ? "text-[#0284c7]" : "text-slate-800")}>
                            {mp.hasInnerShoulder ? `有 (${mp.innerShoulderWidth.toFixed(3)}m)` : mp.innerShoulderWidth > 0 ? `有* (${mp.innerShoulderWidth.toFixed(3)}m)` : '無'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">避車彎:</span> 
                          <span className="font-black text-slate-800">{mp.hasPullover ? '有' : '無'}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-slate-500 font-bold">外側路肩:</span> 
                          <span className={cn("font-black", mp.hasOuterShoulder ? "text-[#0284c7]" : "text-slate-800")}>
                            {mp.hasOuterShoulder ? `有 (${mp.outerShoulderWidth.toFixed(3)}m)` : mp.outerShoulderWidth > 0 ? `有* (${mp.outerShoulderWidth.toFixed(3)}m)` : '無'}
                          </span>
                        </div>
                      </div>
                    );
                  })() : (() => {
                    const rp = currentKmlPoint as KmlRampPoint;
                    return (
                      <div className="grid grid-cols-2 gap-y-3 text-xs border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">匝道編號:</span> 
                          <span className="font-black text-slate-800">{rp.rampId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">出入國道:</span> 
                          <span className="font-black text-slate-800">{rp.entryExit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">槽化區:</span> 
                          <span className="font-black text-slate-800">{rp.hasChannelization ? `有 (${rp.hasChannelization ? rp.channelizationWidth.toFixed(3) : 0}m)` : '無'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">與起點距離:</span> 
                          <span className="font-black text-[#0284c7]">{rp.distFromRampStart.toFixed(1)}m</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-slate-500 font-bold">交流道:</span> 
                          <span className="font-black text-slate-800">{rp.interchangeName}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </main>
        </>
      )}



      </div>
      {/* 全域提示元件 */}
      {renderOverlays()}

      {subPage === 'none' && renderBottomNav()}
    </div>
  );
}
