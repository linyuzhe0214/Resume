import React, { useMemo, useState } from 'react';
import { MapPin, Route, Search, Split, Layers, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { KmlPoint, KmlMainlinePoint, KmlRampPoint } from '../utils/kmlParser';
import type { SearchMode } from '../hooks/useGeolocationSync';
import type { Segment, RampSegment } from '../types';
import { getPavementDisplayInfo, getPavementColor, formatMonth } from '../utils/pavement';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── 鋪面斷面 Modal ──
interface PavementSectionModalProps {
  seg: Segment | RampSegment;
  laneLabel: string;
  onClose: () => void;
}

function PavementSectionModal({ seg, laneLabel, onClose }: PavementSectionModalProps) {
  const targetMonth = seg.constructionYear + seg.constructionMonth;

  // 取得所有月份（依新到舊）
  const allMonths = useMemo(() => {
    const months = Array.from(new Set((seg.pavementLayers || []).map(l => l.month)));
    return months.sort((a, b) => b.localeCompare(a));
  }, [seg.pavementLayers]);

  const [selectedMonth, setSelectedMonth] = useState<string>(targetMonth);

  const displayMonth = allMonths.includes(selectedMonth) ? selectedMonth : (allMonths[0] || '');

  // 當月所有層（從上到下 = 先舊後新的 month 分組，同月份按輸入順序）
  const layersForMonth = useMemo(() => {
    return (seg.pavementLayers || []).filter(l => l.month === displayMonth);
  }, [seg.pavementLayers, displayMonth]);

  // 計算總厚度以決定每層高度比例
  const totalThickness = layersForMonth.reduce((s, l) => s + l.thickness, 0);

  // 所有月份斷面 (全部疊加，由下到上 = 最舊在底)
  const allLayersGrouped = useMemo(() => {
    return allMonths.map(m => ({
      month: m,
      layers: (seg.pavementLayers || []).filter(l => l.month === m),
    }));
  }, [seg.pavementLayers, allMonths]);

  const totalAllThickness = allLayersGrouped.reduce(
    (s, g) => s + g.layers.reduce((ss, l) => ss + l.thickness, 0), 0
  );

  return (
    <div
      className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">鋪面斷面配置</h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">{laneLabel} · {seg.property}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">
          {(seg.pavementLayers || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
              <Layers size={32} className="opacity-30" />
              <span className="text-sm font-bold">尚無鋪面層資料</span>
            </div>
          ) : (
            <>
              {/* 月份 tabs */}
              {allMonths.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {allMonths.map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={cn(
                        'px-3 py-1 rounded-full text-[11px] font-black transition-all',
                        displayMonth === m
                          ? 'bg-[#0284c7] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      {formatMonth(m)}
                      {m === targetMonth && (
                        <span className="ml-1 text-[9px] opacity-75">(本次)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* 單月斷面圖 */}
              {layersForMonth.length > 0 ? (
                <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                  {/* 路面頂部標示 */}
                  <div className="bg-slate-700 text-white text-[10px] font-black text-center py-1.5 tracking-widest">
                    ▲ 路面頂部
                  </div>
                  {layersForMonth.map((layer, i) => {
                    const color = getPavementColor(
                      layer.type.split('(')[0].trim().toUpperCase(),
                      layer.thickness
                    );
                    const heightPx = totalThickness > 0
                      ? Math.max(36, Math.round((layer.thickness / totalThickness) * 180))
                      : 48;
                    return (
                      <div
                        key={layer.id}
                        className="relative flex items-center justify-between px-4 border-b border-black/10 last:border-b-0"
                        style={{ backgroundColor: color, height: `${heightPx}px` }}
                      >
                        <div className="flex flex-col">
                          <span className="text-[12px] font-black text-slate-900 drop-shadow-sm">
                            {layer.type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700 opacity-80">
                            第 {i + 1} 層
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded-full">
                          <span className="text-[13px] font-black text-slate-900">
                            {layer.thickness}
                          </span>
                          <span className="text-[10px] font-bold text-slate-700">cm</span>
                        </div>
                      </div>
                    );
                  })}
                  {/* 路基 */}
                  <div className="bg-amber-800/80 text-amber-100 text-[10px] font-black text-center py-2 tracking-widest">
                    ▬ 路基
                  </div>
                  {/* 總厚度 */}
                  <div className="bg-slate-50 border-t border-slate-200 flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-black text-slate-600">總鋪面厚度</span>
                    <span className="text-base font-black text-[#0284c7]">{totalThickness} cm</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  此月份無資料
                </div>
              )}

              {/* 全部施工歷程總覽 */}
              {allMonths.length > 1 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    全部施工歷程
                  </h3>
                  <div className="flex flex-col rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                    <div className="bg-slate-700 text-white text-[10px] font-black text-center py-1.5 tracking-widest">
                      ▲ 路面頂部（最新在上）
                    </div>
                    {allLayersGrouped.map((group, gi) =>
                      group.layers.map((layer, i) => {
                        const color = getPavementColor(
                          layer.type.split('(')[0].trim().toUpperCase(),
                          layer.thickness
                        );
                        const groupThick = group.layers.reduce((s, l) => s + l.thickness, 0);
                        const heightPx = totalAllThickness > 0
                          ? Math.max(28, Math.round((layer.thickness / totalAllThickness) * 240))
                          : 36;
                        return (
                          <div
                            key={layer.id}
                            className="relative flex items-center justify-between px-4 border-b border-black/10 last:border-b-0"
                            style={{ backgroundColor: color, height: `${heightPx}px` }}
                          >
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-900">{layer.type}</span>
                              <span className="text-[9px] font-bold text-slate-700 opacity-70">
                                {formatMonth(group.month)}
                                {i === 0 && <span className="ml-1 text-[9px]">({groupThick}cm)</span>}
                              </span>
                            </div>
                            <span className="text-[12px] font-black text-slate-900 bg-white/60 px-2 py-0.5 rounded-full">
                              {layer.thickness}cm
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div className="bg-amber-800/80 text-amber-100 text-[10px] font-black text-center py-2 tracking-widest">
                      ▬ 路基
                    </div>
                    <div className="bg-slate-50 border-t border-slate-200 flex items-center justify-between px-4 py-2">
                      <span className="text-xs font-black text-slate-600">累計總厚度</span>
                      <span className="text-base font-black text-[#0284c7]">{totalAllThickness} cm</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// UI direction ↔ Segment direction 映射
const DIR_UI_TO_DATA: Record<string, string> = {
  '南下車道': 'Southbound',
  '北上車道': 'Northbound',
  '東向車道': 'Eastbound',
  '西向車道': 'Westbound',
};

function formatMileage(meters: number) {
  const km = Math.floor(meters / 1000);
  const m = Math.floor(meters % 1000);
  return `${km}k+${m.toString().padStart(3, '0')}`;
}

interface SurfaceViewProps {
  currentTime: Date;
  gpsStatus: 'locating' | 'active' | 'error';
  accuracy: number | null;
  autoTracking: boolean;
  onToggleAutoTracking: () => void;
  highwayName: string;
  onHighwayChange: (hw: string) => void;
  direction: string;
  onDirectionChange: (dir: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  location: GeolocationPosition | null;
  mileage: number;
  kmlLoading: boolean;
  kmlIndex: any;
  currentKmlPoint: KmlPoint | null;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  // 履歷資料
  segments: Segment[];
  rampSegments: RampSegment[];
}

export default function SurfaceView({
  currentTime,
  gpsStatus,
  accuracy,
  autoTracking,
  onToggleAutoTracking,
  highwayName,
  onHighwayChange,
  direction,
  onDirectionChange,
  searchQuery,
  onSearchQueryChange,
  onSearchKeyDown,
  location,
  mileage,
  kmlLoading,
  kmlIndex,
  currentKmlPoint,
  searchMode,
  onSearchModeChange,
  segments,
  rampSegments,
}: SurfaceViewProps) {
  // ── 鋪面斷面 modal state ──
  const [pavementModal, setPavementModal] = React.useState<{
    seg: Segment | RampSegment;
    laneLabel: string;
  } | null>(null);
  // ── 匹配當前位置的主線履歷 ──
  const matchedMainlineSegs = useMemo(() => {
    const dataDir = DIR_UI_TO_DATA[direction];
    if (!dataDir) return [];
    return segments.filter(s =>
      s.highway === highwayName &&
      s.direction === dataDir &&
      mileage >= s.startMileage &&
      mileage < s.endMileage
    );
  }, [segments, highwayName, direction, mileage]);

  // ── 匹配當前位置的匝道履歷 ──
  const matchedRampSegs = useMemo(() => {
    if (!currentKmlPoint?.isRamp) return [];
    const rp = currentKmlPoint as KmlRampPoint;
    // 用 rampId 比對匝道履歷中的 rampId
    return rampSegments.filter(rs =>
      rs.rampId === rp.rampId &&
      rp.distFromRampStart >= rs.startMileage &&
      rp.distFromRampStart < rs.endMileage
    );
  }, [rampSegments, currentKmlPoint]);

  const getSegDepth = (seg: Segment | RampSegment) => {
    if (!seg.pavementLayers || seg.pavementLayers.length === 0) return 0;
    const targetMonth = seg.constructionYear + seg.constructionMonth;
    const info = getPavementDisplayInfo(seg.pavementLayers, targetMonth);
    if (info.thickness > 0) return info.thickness;
    // fallback: 最新 month
    const latestMonth = [...seg.pavementLayers].sort((a, b) => b.month.localeCompare(a.month))[0].month;
    return getPavementDisplayInfo(seg.pavementLayers, latestMonth).thickness;
  };

  const matchAuxLane = (auxName: string, historySegs: Segment[]) => {
    return historySegs.find(s => 
      s.lanes.some(lane => {
        // 直接包含 (如 KML "加速車道", history "加速車道1") 或相反
        if (lane.includes(auxName) || auxName.includes(lane)) return true;
        
        // 模糊比對：若兩邊都含有「加/減/輔/爬坡」關鍵字
        const isAuxKml = auxName.includes('加') || auxName.includes('減') || auxName.includes('輔') || auxName.includes('爬坡');
        const isAuxLane = lane.includes('加') || lane.includes('減') || lane.includes('輔') || lane.includes('爬坡');
        
        if (isAuxKml && isAuxLane) {
          // 嘗試對應數字，例如 KML:"加速車道1" vs history:"加/減速車道1"
          const numKml = auxName.match(/\d+/);
          const numLane = lane.match(/\d+/);
          if (numKml && numLane) {
            return numKml[0] === numLane[0];
          }
          // 若只有一方有數字或都沒有，視為匹配 (同屬輔助車道類別)
          return true;
        }
        return false;
      })
    );
  };

  const renderHistoryCard = (historySeg: Segment | RampSegment | undefined, laneLabel: string) => {
    if (!historySeg) {
      return (
        <div className="w-full flex-1 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-lg p-2 min-h-[120px]">
          <span className="text-slate-400 font-bold text-[9px] opacity-50">無履歷</span>
        </div>
      );
    }
    
    const targetMonth = historySeg.constructionYear + historySeg.constructionMonth;
    const info = getPavementDisplayInfo(historySeg.pavementLayers || [], targetMonth);
    const depth = getSegDepth(historySeg);
    const hasLayers = (historySeg.pavementLayers || []).length > 0;
    
    return (
      <div 
        className="w-full flex-1 flex flex-col items-center justify-center p-2 rounded-lg border shadow-sm transition-all"
        style={{ 
          backgroundColor: info.color || '#f8fafc',
          borderColor: info.color ? 'rgba(0,0,0,0.1)' : '#e2e8f0',
          minHeight: '120px'
        }}
      >
        <span className="text-[10px] sm:text-xs font-black text-slate-800 leading-tight text-center">{historySeg.property}</span>
        <span className="text-[9px] font-bold text-slate-700 leading-tight mt-1 text-center font-mono">
          {formatMileage(historySeg.startMileage)}<br/>~ {formatMileage(historySeg.endMileage)}
        </span>
        
        <div className="mt-2 flex flex-col items-center justify-center w-full bg-white/60 p-1.5 rounded-md text-center shadow-sm">
           <span className="text-[10px] font-black text-slate-800">{historySeg.constructionYear}年{historySeg.constructionMonth}月</span>
           <span className="text-[9px] font-bold text-slate-700 leading-none mt-1">{info.combinedType || '無資料'}</span>
           <span className="text-[10px] font-black text-slate-900 leading-none mt-1">{depth > 0 ? `${depth}cm` : ''}</span>
        </div>

        {/* 查看斷面按鈕 */}
        <button
          onClick={() => setPavementModal({ seg: historySeg, laneLabel })}
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-md text-[9px] font-black transition-all active:scale-95',
            hasLayers
              ? 'bg-[#0284c7]/20 hover:bg-[#0284c7]/40 text-[#0284c7] border border-[#0284c7]/30'
              : 'bg-black/5 text-slate-400 border border-dashed border-slate-300 cursor-default'
          )}
          disabled={!hasLayers}
        >
          <Layers size={9} />
          斷面
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-40 flex flex-col items-center">
      <div className="responsive-container flex flex-col gap-4 py-4">
        {/* Header */}
        <header className="flex flex-col gap-4 p-5 sm:p-6 rounded-3xl bg-[#00488d] shadow-xl shadow-[#00488d]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
                高速公路路巡系統
              </h1>
              <div
                className="flex items-center gap-2.5 mt-2 cursor-pointer hover:bg-white/10 px-3 py-1.5 rounded-full w-max -ml-1 transition-all border border-transparent hover:border-white/10 group"
                onClick={onToggleAutoTracking}
              >
                <div className="relative flex h-2.5 w-2.5">
                  <span
                    className={cn(
                      'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                      !autoTracking
                        ? 'bg-slate-400'
                        : gpsStatus === 'active'
                        ? 'bg-green-400'
                        : gpsStatus === 'locating'
                        ? 'bg-yellow-400'
                        : 'bg-red-400',
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2.5 w-2.5',
                      !autoTracking
                        ? 'bg-slate-400'
                        : gpsStatus === 'active'
                        ? 'bg-green-500'
                        : gpsStatus === 'locating'
                        ? 'bg-yellow-500'
                        : 'bg-red-500',
                    )}
                  />
                </div>
                <span className="text-xs font-bold text-blue-100 group-hover:text-white transition-colors">
                  {!autoTracking
                    ? 'GPS 已暫停'
                    : gpsStatus === 'active'
                    ? `連線中 (${Math.round(accuracy || 0)}m)`
                    : gpsStatus === 'locating'
                    ? '定位中...'
                    : '定位失敗'}
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tighter">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-xs text-blue-200 font-bold tracking-widest opacity-80">
                {format(currentTime, 'yyyy-MM-dd')}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="relative group">
              <select
                className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-2xl focus:ring-4 focus:ring-white/10 px-4 py-3 outline-none font-bold appearance-none text-center transition-all hover:bg-white/20"
                value={highwayName}
                onChange={e => {
                  const newHw = e.target.value;
                  onHighwayChange(newHw);
                  const isEastWest = ['國道2號', '國道4號', '國道6號', '國道8號', '國道10號'].includes(newHw);
                  if (isEastWest && !['東向車道', '西向車道'].includes(direction)) {
                    onDirectionChange('東向車道');
                  } else if (!isEastWest && !['南下車道', '北上車道'].includes(direction)) {
                    onDirectionChange('南下車道');
                  }
                }}
              >
                {[1, 3, 4].map(h => (
                  <option key={h} className="text-slate-900" value={`國道${h}號`}>
                    國道{h}號
                  </option>
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
                onChange={e => onDirectionChange(e.target.value)}
              >
                {(['國道2號', '國道4號', '國道6號', '國道8號', '國道10號'].includes(highwayName) 
                  ? ['東向車道', '西向車道'] 
                  : ['南下車道', '北上車道']
                ).map(d => (
                  <option key={d} className="text-slate-900" value={d}>
                    {d}
                  </option>
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
                onChange={e => onSearchQueryChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
              />
            </div>
          </div>
        </header>

        {/* Location Section */}
        <section className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-[2rem] transition-all hover:shadow-md">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-black text-indigo-600 flex items-center gap-2 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              當前位置
            </span>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-mono tracking-tight leading-none mb-1">
                COORDINATES
              </span>
              <span className="text-xs text-slate-600 font-mono font-bold">
                {location
                  ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
                  : '未定位'}
              </span>
            </div>
          </div>

          <div className="text-center py-2">
            <div className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {highwayName} <span className="text-indigo-600">{formatMileage(mileage)}</span>
            </div>
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-slate-100 text-sm font-bold text-slate-700 border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              {direction}
            </div>
          </div>

          {/* Search Mode Toggle */}
          <div className="mt-8 flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50">
            {(['auto', 'mainline', 'ramp'] as const).map(mode => (
              <button
                key={mode}
                className={cn(
                  'flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all active:scale-95',
                  searchMode === mode
                    ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-100 ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50',
                )}
                onClick={() => onSearchModeChange(mode)}
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
              <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm font-bold text-slate-500">載入路面資料庫中...</span>
            </div>
          ) : !currentKmlPoint ? (
            <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <span className="text-sm font-bold text-slate-500">此里程無測量資料</span>
              <span className="text-xs text-slate-400">
                目前選擇：{highwayName} / {direction} / {formatMileage(mileage)}
              </span>
              {kmlIndex && (
                <div className="mt-4 text-[10px] text-slate-400 text-center space-y-1 bg-slate-50 p-3 rounded-lg w-full max-w-sm">
                  <div className="font-bold text-slate-500 mb-1">📋 KML 檔案內含資料摘要</div>
                  <div>
                    主線包含 :{' '}
                    {Object.keys(kmlIndex.mainline).length > 0
                      ? Object.keys(kmlIndex.mainline).join(', ')
                      : '無'}
                  </div>
                  <div className="text-amber-600/70">
                    匝道包含 :{' '}
                    {Object.keys(kmlIndex.ramp).length > 0
                      ? Object.keys(kmlIndex.ramp).join(', ')
                      : '無'}
                  </div>
                  <div className="mt-2 text-blue-500 font-bold border-t border-slate-200 pt-2">
                    💡 提示：如果切換國道後無資料，請確認搜尋的「里程」是否在該國道的範圍內。
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
                    <span className="text-sm font-black text-amber-800">
                      匝道區域 — {(currentKmlPoint as KmlRampPoint).interchangeName}
                    </span>
                    <span className="text-xs text-amber-600 font-bold">
                      {(currentKmlPoint as KmlRampPoint).rampDescription} ·{' '}
                      {(currentKmlPoint as KmlRampPoint).entryExit}國道 · 匝道編號:{' '}
                      {(currentKmlPoint as KmlRampPoint).rampId}
                    </span>
                  </div>
                </div>
              )}

              {/* General & Geometry Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    路基/路面
                  </span>
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
                    {currentKmlPoint.roadWidth.toFixed(3)}
                    <span className="text-xs ml-1 text-slate-500">m</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    線型資訊
                  </span>
                  <div className="text-sm font-black text-slate-800">
                    曲率:{' '}
                    {currentKmlPoint.curvatureRadius > 0
                      ? `${currentKmlPoint.curvatureRadius.toFixed(2)}m`
                      : 'N/A'}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    {[
                      { label: '縱坡', val: currentKmlPoint.longitudinalSlope },
                      { label: '橫坡', val: currentKmlPoint.lateralSlope },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">
                            {label} {val.toFixed(3)}
                          </span>
                          <span
                            className={cn(
                              'text-[11px] font-black px-1 rounded',
                              val > 0
                                ? 'text-green-700 bg-green-50'
                                : val < 0
                                ? 'text-red-700 bg-red-50'
                                : 'text-slate-500 bg-slate-50',
                            )}
                          >
                            {val > 0 ? '上坡' : val < 0 ? '下坡' : '平'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lane Details & Diagram */}
              <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl flex flex-col gap-5">
                <h3 className="text-xs font-black text-[#0284c7] uppercase tracking-widest border-b border-slate-100 pb-3">
                  斷面配置圖 (CROSS-SECTION) · {currentKmlPoint.stakeNo}
                </h3>

                {/* Visual Cross-section Diagram */}
                <div className="w-full flex items-end justify-center gap-1 px-1 sm:px-2 font-mono text-[9px] min-h-[140px]">
                  {!currentKmlPoint.isRamp &&
                    (currentKmlPoint as KmlMainlinePoint).innerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center justify-end h-full">
                        <div className="bg-slate-200 w-7 h-28 border-l-2 border-slate-300 flex items-center justify-center text-slate-600 text-[8px] leading-tight text-center font-bold">
                          內<br />肩
                        </div>
                        <span className="mt-2 text-slate-500 font-bold">
                          {(currentKmlPoint as KmlMainlinePoint).innerShoulderWidth.toFixed(2)}m
                        </span>
                      </div>
                    )}

                  {currentKmlPoint.laneWidths.map((w, i) => (
                    <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                      <div className="bg-slate-100 border-l border-dashed border-slate-300 w-full flex flex-col items-center relative overflow-hidden transition-all duration-300 h-28 rounded-sm shadow-inner">
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <span className="text-slate-500 font-black text-xs">車道{i + 1}</span>
                        </div>
                      </div>
                      <span className="mt-2 text-slate-500 font-bold">{w.toFixed(2)}m</span>
                    </div>
                  ))}

                  {!currentKmlPoint.isRamp &&
                    (currentKmlPoint as KmlMainlinePoint).auxiliaryLanes.map((aux, i) => (
                      <div key={`aux-${i}`} className="flex flex-col items-center flex-1 justify-end h-full">
                        <div className="bg-blue-50 border-l border-dashed border-blue-200 w-full h-24 flex items-center justify-center text-blue-700 font-black text-[9px] rounded-sm">
                          {aux.name}
                        </div>
                        <span className="mt-2 text-blue-500 font-bold">{aux.width.toFixed(2)}m</span>
                      </div>
                    ))}

                  {!currentKmlPoint.isRamp &&
                    (currentKmlPoint as KmlMainlinePoint).outerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center justify-end h-full">
                        <div className="bg-slate-200 w-12 sm:w-16 h-28 border-r-2 border-slate-300 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                          外肩
                        </div>
                        <span className="mt-2 text-slate-500 font-bold">
                          {(currentKmlPoint as KmlMainlinePoint).outerShoulderWidth.toFixed(2)}m
                        </span>
                      </div>
                    )}
                </div>

                {/* Detail Grid */}
                {!currentKmlPoint.isRamp ? (
                  (() => {
                    const mp = currentKmlPoint as KmlMainlinePoint;
                    return (
                      <div className="grid grid-cols-2 gap-y-3 text-xs border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">槽化線:</span>
                          <span className="font-black text-slate-800">
                            {mp.hasChannelization
                              ? `有 (${mp.channelizationWidth.toFixed(3)}m)`
                              : '無'}
                          </span>
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
                          <span className={cn('font-black', mp.hasInnerShoulder ? 'text-[#0284c7]' : 'text-slate-800')}>
                            {mp.hasInnerShoulder
                              ? `有 (${mp.innerShoulderWidth.toFixed(3)}m)`
                              : mp.innerShoulderWidth > 0
                              ? `有* (${mp.innerShoulderWidth.toFixed(3)}m)`
                              : '無'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">避車彎:</span>
                          <span className="font-black text-slate-800">{mp.hasPullover ? '有' : '無'}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-slate-500 font-bold">外側路肩:</span>
                          <span className={cn('font-black', mp.hasOuterShoulder ? 'text-[#0284c7]' : 'text-slate-800')}>
                            {mp.hasOuterShoulder
                              ? `有 (${mp.outerShoulderWidth.toFixed(3)}m)`
                              : mp.outerShoulderWidth > 0
                              ? `有* (${mp.outerShoulderWidth.toFixed(3)}m)`
                              : '無'}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
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
                          <span className="font-black text-slate-800">
                            {rp.hasChannelization
                              ? `有 (${rp.channelizationWidth.toFixed(3)}m)`
                              : '無'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">與起點距離:</span>
                          <span className="font-black text-[#0284c7]">
                            {rp.distFromRampStart.toFixed(1)}m
                          </span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="text-slate-500 font-bold">交流道:</span>
                          <span className="font-black text-slate-800">{rp.interchangeName}</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* 施工履歷 Section (Aligned Horizontally per lane) */}
              {(matchedMainlineSegs.length > 0 || matchedRampSegs.length > 0) && (
                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl flex flex-col gap-4 mt-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Clock className="w-4 h-4 text-[#0284c7]" />
                    <h3 className="text-xs font-black text-[#0284c7] uppercase tracking-widest">
                      施工履歷 (PAVEMENT HISTORY)
                    </h3>
                  </div>
                  
                  <div className="w-full flex items-stretch justify-center gap-2 px-1 sm:px-2 mt-2">
                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).innerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center justify-start flex-1 gap-2">
                        <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-3 py-1 rounded-full">內肩</span>
                        {renderHistoryCard(matchedMainlineSegs.find(s => s.lanes.includes('內側路肩')), '內側路肩')}
                      </div>
                    )}

                    {currentKmlPoint.laneWidths.map((w, i) => {
                      const laneNames = ['第一車道', '第二車道', '第三車道', '第四車道', '第五車道', '第六車道', '第七車道', '第八車道'];
                      const laneStr = laneNames[i] || `第${i + 1}車道`;
                      const historySeg = currentKmlPoint.isRamp 
                        ? matchedRampSegs[0]
                        : matchedMainlineSegs.find(s => s.lanes.includes(laneStr));
                      
                      return (
                        <div key={i} className="flex flex-col items-center justify-start flex-1 gap-2">
                          <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-3 py-1 rounded-full">車道{i + 1}</span>
                          {renderHistoryCard(historySeg, laneStr)}
                        </div>
                      );
                    })}

                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).auxiliaryLanes.map((aux, i) => {
                      const historySeg = matchAuxLane(aux.name, matchedMainlineSegs as Segment[]);
                      return (
                        <div key={`aux-hist-${i}`} className="flex flex-col items-center justify-start flex-1 gap-2">
                          <span className="text-blue-500 font-bold text-[10px] bg-blue-50 px-3 py-1 rounded-full">{aux.name}</span>
                          {renderHistoryCard(historySeg, aux.name)}
                        </div>
                      );
                    })}

                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).outerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center justify-start flex-1 gap-2">
                        <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-3 py-1 rounded-full">外肩</span>
                        {renderHistoryCard(matchedMainlineSegs.find(s => s.lanes.includes('外側路肩')), '外側路肩')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 鋪面斷面 Modal */}
      {pavementModal && (
        <PavementSectionModal
          seg={pavementModal.seg}
          laneLabel={pavementModal.laneLabel}
          onClose={() => setPavementModal(null)}
        />
      )}
    </div>
  );
}
