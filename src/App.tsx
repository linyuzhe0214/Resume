import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Upload, Route, Split, HardHat, Search, Layers } from 'lucide-react';
import * as turf from '@turf/turf';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import MainlineHistory from './components/MainlineHistory';
import RampHistory from './components/RampHistory';
import EditSegment from './components/EditSegment';
import EditRamp from './components/EditRamp';
import EditRampHistory from './components/EditRampHistory';
import EditPavement from './components/EditPavement';
import ConfirmDialog from './components/ConfirmDialog';

import { Segment, RampSegment, PavementLayer } from './types';
import type { Feature, LineString } from 'geojson';
import { parseKmlToPoints, buildKmlIndex, findNearestPoint, DIRECTION_REVERSE_MAP, type KmlIndex, type KmlPoint, type KmlMainlinePoint, type KmlRampPoint } from './utils/kmlParser';

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
    prevConstructionDepth: 12
  }
];

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

const initialPlanningSegments: Segment[] = [
  {
    id: 'p1',
    highway: '國道1號',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '114',
    constructionMonth: '05',
    startMileage: 166427,
    endMileage: 168000,
    direction: 'Southbound',
    lanes: ['第一車道', '第二車道'],
    pavementLayers: [
      { id: 'pl1', type: 'OGAC (開級配瀝青混凝土)', thickness: 2, month: '11405' },
      { id: 'pl2', type: 'DGAC (密級配瀝青混凝土)', thickness: 22, month: '11405' }
    ],
    notes: '預計整修路段',
    prevConstructionYear: '108',
    prevConstructionDepth: 24
  }
];

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'error'>('locating');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  
  const [highwayLine, setHighwayLine] = useState<Feature<LineString> | null>(null);
  const [highwayName, setHighwayName] = useState<string>('國道1號');
  const [mileage, setMileage] = useState<number>(166500);
  const [direction, setDirection] = useState<string>('北上車道');
  
  // KML 資料庫
  const [kmlIndex, setKmlIndex] = useState<KmlIndex | null>(null);
  const [kmlLoading, setKmlLoading] = useState(true);
  const [currentKmlPoint, setCurrentKmlPoint] = useState<KmlPoint | null>(null);
  const [currentKmlType, setCurrentKmlType] = useState<'mainline' | 'ramp' | null>(null);
  const [activeTab, setActiveTab] = useState<'surface' | 'mainline' | 'ramp' | 'planning'>('surface');
  const [subPage, setSubPage] = useState<'none' | 'editSegment' | 'editPavement' | 'editRamp' | 'editRampHistory' | 'editRampHistoryPavement'>('none');

  const MAINLINE_URL = 'https://script.google.com/macros/s/AKfycbwFnImk16G7FulPiUxnBb_dd79RwH4k_16CREqsoDOzpYQ79GUR_E-aLWSMzVKol8rw/exec';
  const RAMP_URL = 'https://script.google.com/macros/s/AKfycbxi2T-7P4BQv-KWJqEHNzL_P3iZ4zTwhHjPxFVk6Fp3qBUdVMsbxx_4sdww4r-tthL0/exec';

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

  // Fetch data from Google Apps Script on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mainlineRes, rampRes] = await Promise.all([
          fetch(`${MAINLINE_URL}?action=getMainline`),
          fetch(`${RAMP_URL}?action=getRamp`)
        ]);
        const mainlineData = await mainlineRes.json();
        const rampData = await rampRes.json();
        
        if (Array.isArray(mainlineData) && mainlineData.length > 0) {
          const main = mainlineData.filter((s: any) => s.type !== 'planning');
          const plan = mainlineData.filter((s: any) => s.type === 'planning');
          if (main.length > 0) setSegments(main);
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
      if (val.includes('k+')) {
        const parts = val.split('k+');
        if (parts.length === 2) {
          const km = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(km) && !isNaN(m)) {
            const newMileage = km * 1000 + m;
            setMileage(newMileage);
            // KML 查表會由 useEffect 自動觸發
            setToast({ message: `已定位至 ${km}k+${m.toString().padStart(3, '0')}`, type: 'success' });
            return;
          }
        }
      }
      
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && !val.includes('k+')) {
        setMileage(num);
        setToast({ message: `已定位至 ${formatMileage(num)}`, type: 'success' });
      }
    }
  };
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingRampId, setEditingRampId] = useState<string | null>(null);
  const [draftSegment, setDraftSegment] = useState<Segment | null>(null);
  const [draftRamp, setDraftRamp] = useState<RampSegment | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

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
        
        // 從主線點建構 LineString for GPS 定位
        // 按國道分組，只取每個國道的第一個方向來建 line
        for (const hw of Object.keys(index.mainline)) {
          const dirs = Object.values(index.mainline[hw]);
          if (dirs.length > 0 && dirs[0].length >= 2) {
            const coords = dirs[0].map(p => [p.lon, p.lat]);
            const line = turf.lineString(coords);
            setHighwayLine(line);
            break; // 先用第一個國道的 line
          }
        }
        
        console.log(`KML 資料庫載入完成: ${points.length} 個測量點`);
        console.log(`Available highways in Mainline:`, Object.keys(index.mainline));
        console.log(`Available highways in Ramp:`, Object.keys(index.ramp));
      })
      .catch(err => console.error('Failed to load local KML routing database:', err))
      .finally(() => setKmlLoading(false));
  }, []);

  // 當 mileage / highway / direction 改變時，查詢 KML 對應的測量點
  useEffect(() => {
    if (!kmlIndex) {
      setCurrentKmlPoint(null);
      setCurrentKmlType(null);
      return;
    }
    const result = findNearestPoint(kmlIndex, highwayName, direction, mileage);
    setCurrentKmlPoint(result.point);
    setCurrentKmlType(result.type);
  }, [kmlIndex, highwayName, direction, mileage]);

  // Geolocation
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
        
        // If we have a highway line, calculate mileage
        if (highwayLine) {
          const pt = turf.point([pos.coords.longitude, pos.coords.latitude]);
          const snapped = turf.nearestPointOnLine(highwayLine, pt);
          
          // Calculate distance from start of line to snapped point
          const sliced = turf.lineSlice(
            turf.point(highwayLine.geometry.coordinates[0]), 
            snapped, 
            highwayLine
          );
          const distMeters = turf.length(sliced, { units: 'meters' });
          setMileage(distMeters);
          
          // Basic direction mock based on bearing
          // In a real app, this would depend on the highway's defined direction
          if (pos.coords.heading !== null) {
            setDirection(pos.coords.heading < 180 ? '北上車道' : '南下車道');
          }
        }
      },
      (err) => {
        console.error(err);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [highwayLine]);

  const formatMileage = (meters: number) => {
    const km = Math.floor(meters / 1000);
    const m = Math.floor(meters % 1000);
    return `${km}k+${m.toString().padStart(3, '0')}`;
  };

  const renderBottomNav = () => (
    <footer className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 pb-6 pt-3 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] z-50 rounded-t-2xl">
      <div onClick={() => { setActiveTab('surface'); setSubPage('none'); }} className={cn("flex flex-col items-center justify-center rounded-lg px-4 py-2 active:scale-95 transition-transform cursor-pointer", activeTab === 'surface' ? "bg-[#005fb8] text-white" : "text-slate-500 hover:bg-slate-50")}>
        <Layers className="w-6 h-6" />
        <span className="text-[11px] font-medium tracking-wider uppercase mt-1">路面資料</span>
      </div>
      <div onClick={() => { setActiveTab('mainline'); setSubPage('none'); }} className={cn("flex flex-col items-center justify-center rounded-lg px-4 py-2 active:scale-95 transition-transform cursor-pointer", activeTab === 'mainline' ? "bg-[#005fb8] text-white" : "text-slate-500 hover:bg-slate-50")}>
        <Route className="w-6 h-6" />
        <span className="text-[11px] font-medium tracking-wider uppercase mt-1">主線履歷</span>
      </div>
      <div onClick={() => { setActiveTab('ramp'); setSubPage('none'); }} className={cn("flex flex-col items-center justify-center rounded-lg px-4 py-2 active:scale-95 transition-transform cursor-pointer", activeTab === 'ramp' ? "bg-[#005fb8] text-white" : "text-slate-500 hover:bg-slate-50")}>
        <Split className="w-6 h-6" />
        <span className="text-[11px] font-medium tracking-wider uppercase mt-1">匝道履歷</span>
      </div>
      <div onClick={() => { setActiveTab('planning'); setSubPage('none'); }} className={cn("flex flex-col items-center justify-center rounded-lg px-4 py-2 active:scale-95 transition-transform cursor-pointer", activeTab === 'planning' ? "bg-[#005fb8] text-white" : "text-slate-500 hover:bg-slate-50")}>
        <HardHat className="w-6 h-6" />
        <span className="text-[11px] font-medium tracking-wider uppercase mt-1">整修規劃</span>
      </div>
    </footer>
  );

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
        {renderBottomNav()}
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
        {renderBottomNav()}
      </div>
    );
  }

  if (subPage === 'editRampHistory') {
    return (
      <div className="relative">
        <EditRampHistory 
          segment={draftRamp || undefined}
          availableRamps={rampSegments}
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
          onNavigateToPavement={() => setSubPage('editRampHistoryPavement')}
        />
        {renderBottomNav()}
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
        {renderBottomNav()}
      </div>
    );
  }

  if (subPage === 'editSegment') {
    return (
      <div className="relative">
        <EditSegment 
          segment={draftSegment || undefined}
          isPlanning={activeTab === 'planning'}
          onChange={(segment) => setDraftSegment(segment)}
          onSave={(segment) => {
            if (activeTab === 'planning') {
              if (editingSegmentId) {
                setPlanningSegments(planningSegments.map(s => s.id === editingSegmentId ? segment : s));
                syncGas(MAINLINE_URL, 'saveMainline', segment.highway + ' (規劃)', { ...segment, type: 'planning' });
              } else {
                const newSeg = { ...segment, id: Math.random().toString(36).substr(2, 9), type: 'planning' };
                setPlanningSegments(prev => [...prev, newSeg]);
                syncGas(MAINLINE_URL, 'saveMainline', segment.highway + ' (規劃)', newSeg);
              }
            } else {
              if (editingSegmentId) {
                setSegments(segments.map(s => s.id === editingSegmentId ? segment : s));
                syncGas(MAINLINE_URL, 'saveMainline', segment.highway, segment);
              } else {
                const newSeg = { ...segment, id: Math.random().toString(36).substr(2, 9) };
                setSegments(prev => [...prev, newSeg]);
                syncGas(MAINLINE_URL, 'saveMainline', segment.highway, newSeg);
              }
            }
            setDraftSegment(null);
            setEditingSegmentId(null);
            setSubPage('none');
          }}
          onDelete={(id) => {
            if (activeTab === 'planning') {
              const seg = planningSegments.find(s => s.id === id);
              setPlanningSegments(planningSegments.filter(s => s.id !== id));
              if (seg) syncGas(MAINLINE_URL, 'deleteMainline', seg.highway + ' (規劃)', id, true);
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
              notes: segment.notes ? `${segment.notes} (從履歷複製)` : '從履歷複製'
            };
            setPlanningSegments([...planningSegments, newPlanningSegment]);
            setToast({ message: '已成功複製到整修規劃頁面', type: 'success' });
          }}
          onBack={() => {
            setDraftSegment(null);
            setEditingSegmentId(null);
            setSubPage('none');
          }} 
          onNavigateToPavement={() => setSubPage('editPavement')} 
        />
        {renderBottomNav()}
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
        {renderBottomNav()}
      </div>
    );
  }

  if (activeTab === 'ramp') {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        <RampHistory 
          rampSegments={rampSegments}
          onNavigateToEditDetails={(id, defaultHighway, defaultInterchange) => {
            setEditingRampId(id || null);
            if (id) {
              const ramp = rampSegments.find(s => s.id === id);
              setDraftRamp(ramp ? { ...ramp } : null);
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
                constructionYear: '113',
                constructionMonth: '08',
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
          onNavigateToEditHistory={(id) => {
            setEditingRampId(id);
            const ramp = rampSegments.find(s => s.id === id);
            setDraftRamp(ramp ? { ...ramp } : null);
            setSubPage('editRampHistory');
          }}
          onDeleteRamp={(rampId) => {
            const segsToDelete = rampSegments.filter(s => s.rampId === rampId);
            segsToDelete.forEach(seg => syncGas(RAMP_URL, 'deleteRamp', seg.interchange, seg.id, true));
            setRampSegments(rampSegments.filter(s => s.rampId !== rampId));
          }}
        />
        {renderBottomNav()}
      </div>
    );
  }

  if (activeTab === 'mainline') {
    return (
      <div className="min-h-screen bg-[#f7f9fc]">
        <MainlineHistory 
          segments={segments}
          onNavigateToEdit={(id) => {
            setEditingSegmentId(id || null);
            if (id) {
              const segment = segments.find(s => s.id === id);
              setDraftSegment(segment ? { ...segment } : null);
            } else {
              setDraftSegment({
                id: '',
                highway: '國道1號',
                property: '路堤',
                laneCategory: '一般路段',
                constructionYear: '113',
                constructionMonth: '05',
                startMileage: 166427,
                endMileage: 166527,
                direction: 'Southbound',
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
        {renderBottomNav()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1e293b] font-sans pb-24 flex flex-col p-3 gap-3">
      
      {/* Header */}
      <header className="flex flex-col gap-3 p-4 rounded-xl bg-[#1e3a8a] shadow-lg">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm">高速公路路巡里程資訊系統</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "flex h-2 w-2 rounded-full",
                gpsStatus === 'active' ? "bg-green-400" : gpsStatus === 'locating' ? "bg-yellow-400 animate-pulse" : "bg-red-400"
              )}></span>
              <span className="text-[11px] font-semibold text-blue-100">
                {gpsStatus === 'active' ? `GPS 定位中 (準確度: ${Math.round(accuracy || 0)}m)` : 
                 gpsStatus === 'locating' ? 'GPS 定位中...' : 'GPS 定位失敗'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-black text-white">{format(currentTime, 'HH:mm:ss')}</div>
            <div className="text-[10px] text-blue-200 font-bold tracking-wider">{format(currentTime, 'yyyy-MM-dd')}</div>
          </div>
        </div>
        
        {/* Advanced Location Search */}
        <div className="flex w-full gap-2">
          <select 
            className="flex-1 bg-white/10 border border-white/20 text-white text-sm rounded-lg focus:ring-white/50 px-2 py-2.5 outline-none font-bold placeholder-blue-200/50 appearance-none text-center"
            value={highwayName}
            onChange={(e) => setHighwayName(e.target.value)}
          >
            {[1, 3, 4].map(h => (
              <option key={h} className="text-black" value={`國道${h}號`}>國道{h}號</option>
            ))}
          </select>
          <select 
            className="flex-1 bg-white/10 border border-white/20 text-white text-sm rounded-lg focus:ring-white/50 px-2 py-2.5 outline-none font-bold appearance-none text-center"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            {['南下車道', '北上車道', '東向車道', '西向車道', '雙向'].map(d => (
              <option key={d} className="text-black" value={d}>{d}</option>
            ))}
          </select>
          <div className="flex-[2] relative">
            <input 
              type="text" 
              className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg focus:ring-white/50 px-3 py-2.5 placeholder-blue-200/50 outline-none transition-all font-bold" 
              placeholder="搜尋里程 (例: 166k+500)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>
      </header>

      {/* Location Section */}
      {activeTab === 'surface' && (
        <>
          <section className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-[#0284c7] flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                當前位置
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-tighter">
                {location ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` : '24.1234, 120.5678'}
              </span>
            </div>
            <div className="text-center py-1">
              <div className="text-4xl font-black text-slate-800 tracking-tight">
                {highwayName} {formatMileage(mileage)}
              </div>
              <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">
                {direction}
              </div>
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
                          <span className="font-black text-slate-800">{rp.hasChannelization ? `有 (${rp.channelizationWidth.toFixed(3)}m)` : '無'}</span>
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

      {activeTab === 'planning' && (
        <main className="flex-grow flex flex-col bg-[#f7f9fc]">
          <MainlineHistory 
            title="路面整修規劃"
            segments={planningSegments}
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
        </main>
      )}

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

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={cn(
            "px-6 py-3 rounded-full shadow-2xl text-white font-bold text-sm",
            toast.type === 'success' ? "bg-green-500" : "bg-slate-800"
          )}>
            {toast.message}
          </div>
        </div>
      )}

      {renderBottomNav()}
    </div>
  );
}
