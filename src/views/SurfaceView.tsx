import React, { useMemo } from 'react';
import { MapPin, Route, Search, Split, Layers, HardHat, Clock, Ruler } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { KmlPoint, KmlMainlinePoint, KmlRampPoint } from '../utils/kmlParser';
import type { SearchMode } from '../hooks/useGeolocationSync';
import type { Segment, RampSegment } from '../types';
import { getPavementDisplayInfo, getPavementColor } from '../utils/pavement';
import PavementCrossSectionModal from '../components/PavementCrossSectionModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  const [selectedHistorySeg, setSelectedHistorySeg] = React.useState<Segment | RampSegment | null>(null);

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

  const renderHistoryCard = (historySeg: Segment | RampSegment | undefined) => {
    if (!historySeg) {
      return (
        <div className="w-full flex-1 flex flex-col items-center justify-center bg-slate-50/80 border-2 border-dashed border-slate-200 rounded-2xl p-3 min-h-[130px] transition-all">
          <span className="text-slate-400 font-bold text-[10px] tracking-wide">無履歷</span>
        </div>
      );
    }
    
    const targetMonth = historySeg.constructionYear + historySeg.constructionMonth;
    const info = getPavementDisplayInfo(historySeg.pavementLayers || [], targetMonth);
    const depth = getSegDepth(historySeg);
    
    return (
      <div 
        onClick={() => setSelectedHistorySeg(historySeg)}
        className="w-full flex-1 flex flex-col items-center justify-between p-3 rounded-2xl border shadow-sm transition-all duration-200 cursor-pointer hover:scale-[1.03] hover:shadow-lg active:scale-95 group relative overflow-hidden"
        style={{ 
          backgroundColor: info.color || '#f8fafc',
          borderColor: info.color ? 'rgba(0,0,0,0.12)' : '#e2e8f0',
          minHeight: '130px'
        }}
        title="點擊檢視鋪面斷面圖說"
      >
        <div className="w-full flex flex-col items-center">
          <span className="text-[10px] sm:text-xs font-black text-slate-900 leading-tight text-center drop-shadow-xs">
            {historySeg.property}
          </span>
          <span className="text-[9px] font-bold text-slate-800 leading-tight mt-1 text-center font-mono bg-black/5 px-2 py-0.5 rounded-full">
            {formatMileage(historySeg.startMileage)} ~ {formatMileage(historySeg.endMileage)}
          </span>
        </div>
        
        <div className="mt-2.5 flex flex-col items-center justify-center w-full bg-white/80 backdrop-blur-md p-2 rounded-xl text-center shadow-xs border border-white/60 group-hover:bg-white transition-all">
           <span className="text-[10px] font-black text-slate-900 leading-none font-mono">
             {historySeg.constructionYear}年{historySeg.constructionMonth}月
           </span>
           <span className="text-[9px] font-bold text-slate-700 leading-tight mt-1 truncate max-w-full px-1">
             {info.combinedType || '無資料'}
           </span>
           {depth > 0 && (
             <span className="text-[11px] font-mono font-black text-blue-700 leading-none mt-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
               {depth}cm
             </span>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-40 flex flex-col items-center">
      <div className="responsive-container flex flex-col gap-5 py-4">
        {/* Header */}
        <header className="flex flex-col gap-4 p-5 sm:p-7 rounded-[2rem] bg-gradient-to-br from-slate-900 via-[#003d7a] to-[#00488d] shadow-2xl shadow-blue-950/20 border border-white/10 relative overflow-hidden">
          {/* Ambient light glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-sm shadow-blue-400/50" />
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                  高速公路路巡系統
                </h1>
              </div>
              <div
                className="flex items-center gap-2.5 mt-2.5 cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full w-max transition-all border border-white/15 group shadow-sm"
                onClick={onToggleAutoTracking}
                title="點擊切換 GPS 自動追蹤"
              >
                <div className="relative flex h-2.5 w-2.5">
                  <span
                    className={cn(
                      'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                      !autoTracking
                        ? 'bg-slate-400'
                        : gpsStatus === 'active'
                        ? 'bg-emerald-400'
                        : gpsStatus === 'locating'
                        ? 'bg-amber-400'
                        : 'bg-rose-400',
                    )}
                  />
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2.5 w-2.5',
                      !autoTracking
                        ? 'bg-slate-400'
                        : gpsStatus === 'active'
                        ? 'bg-emerald-500'
                        : gpsStatus === 'locating'
                        ? 'bg-amber-500'
                        : 'bg-rose-500',
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
              <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight drop-shadow-sm">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-xs font-mono text-blue-200/80 font-bold tracking-wider mt-0.5">
                {format(currentTime, 'yyyy-MM-dd')}
              </div>
            </div>
          </div>

          {/* Search & Selector Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            <div className="relative group">
              <select
                className="w-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm rounded-2xl focus:ring-4 focus:ring-white/10 px-4 py-3 outline-none font-black appearance-none text-center transition-all shadow-sm cursor-pointer"
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
                  <option key={h} className="text-slate-900 font-bold" value={`國道${h}號`}>
                    國道{h}號
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-white/60">
                <Layers size={14} />
              </div>
            </div>

            <div className="relative group">
              <select
                className="w-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm rounded-2xl focus:ring-4 focus:ring-white/10 px-4 py-3 outline-none font-black appearance-none text-center transition-all shadow-sm cursor-pointer"
                value={direction}
                onChange={e => onDirectionChange(e.target.value)}
              >
                {(['國道2號', '國道4號', '國道6號', '國道8號', '國道10號'].includes(highwayName) 
                  ? ['東向車道', '西向車道'] 
                  : ['南下車道', '北上車道']
                ).map(d => (
                  <option key={d} className="text-slate-900 font-bold" value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-white/60">
                <Route size={14} />
              </div>
            </div>

            <div className="col-span-2 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-200 group-focus-within:text-white transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                className="w-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm rounded-2xl focus:ring-4 focus:ring-white/10 pl-11 pr-4 py-3 placeholder-blue-200/60 outline-none transition-all font-bold shadow-sm"
                placeholder="搜尋里程 (例: 166k+500)"
                value={searchQuery}
                onChange={e => onSearchQueryChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
              />
            </div>
          </div>
        </header>

        {/* Location Section */}
        <section className="bg-white border border-slate-200/80 shadow-md shadow-slate-200/40 p-6 sm:p-8 rounded-[2rem] transition-all hover:shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-black text-blue-700 flex items-center gap-2 uppercase tracking-widest bg-blue-50/90 border border-blue-100 px-3.5 py-1.5 rounded-full shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              當前位置
            </span>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider leading-none mb-1">
                COORDINATES
              </span>
              <span className="text-xs text-slate-600 font-mono font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                {location
                  ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
                  : '未定位'}
              </span>
            </div>
          </div>

          <div className="text-center py-3">
            <div className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {highwayName}{' '}
              <span className="font-mono bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                {formatMileage(mileage)}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-slate-100/90 text-sm font-black text-slate-700 border border-slate-200/80 shadow-xs">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              {direction}
            </div>
          </div>

          {/* Search Mode Toggle */}
          <div className="mt-7 flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
            {(['auto', 'mainline', 'ramp'] as const).map(mode => (
              <button
                key={mode}
                className={cn(
                  'flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all active:scale-95',
                  searchMode === mode
                    ? 'bg-white text-blue-700 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40',
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
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      路基 / 路面
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Layers size={15} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap my-2">
                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).roadType && (
                      <span className="px-2.5 py-1 bg-blue-50 text-[10px] font-black rounded-lg border border-blue-200/60 text-blue-700">
                        {(currentKmlPoint as KmlMainlinePoint).roadType}
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-slate-100 text-[10px] font-black rounded-lg border border-slate-200 text-slate-700">
                      {currentKmlPoint.pavementType || '柔性'}路面
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-black text-slate-900 tracking-tight">
                    {currentKmlPoint.roadWidth.toFixed(3)}
                    <span className="text-xs font-bold ml-1 text-slate-400">m 全寬</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      線型資訊
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Route size={15} />
                    </div>
                  </div>
                  <div className="text-sm font-black text-slate-800 my-2">
                    曲率半徑:{' '}
                    <span className="font-mono text-indigo-700">
                      {currentKmlPoint.curvatureRadius > 0
                        ? `${currentKmlPoint.curvatureRadius.toFixed(2)}m`
                        : '直線 (N/A)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    {[
                      { label: '縱坡', val: currentKmlPoint.longitudinalSlope },
                      { label: '橫坡', val: currentKmlPoint.lateralSlope },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          {label} {val.toFixed(2)}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-black px-1.5 py-0.5 rounded-md border',
                            val > 0
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : val < 0
                              ? 'text-rose-700 bg-rose-50 border-rose-200'
                              : 'text-slate-600 bg-slate-50 border-slate-200',
                          )}
                        >
                          {val > 0 ? '上坡' : val < 0 ? '下坡' : '平'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lane Details & Diagram */}
              <div className="bg-white border border-slate-200/80 shadow-md shadow-slate-200/30 p-6 rounded-3xl flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    斷面配置圖 (CROSS-SECTION)
                  </h3>
                  <span className="font-mono text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {currentKmlPoint.stakeNo}
                  </span>
                </div>

                {/* Visual Cross-section Diagram (Modern CAD Road Surface Deck) */}
                <div className="w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-700/60 overflow-hidden relative">
                  {/* Subtle asphalt texture overlay */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

                  <div className="relative z-10 w-full flex items-end justify-center gap-1.5 px-1 font-mono text-[9px] min-h-[145px]">
                    {!currentKmlPoint.isRamp &&
                      (currentKmlPoint as KmlMainlinePoint).innerShoulderWidth > 0 && (
                        <div className="flex flex-col items-center justify-end h-full">
                          <div className="bg-gradient-to-b from-slate-700 to-slate-800 w-8 sm:w-10 h-28 border-l-2 border-yellow-500/80 flex items-center justify-center text-slate-300 text-[9px] leading-tight text-center font-black rounded-l-md shadow-inner">
                            內<br />肩
                          </div>
                          <span className="mt-2 text-slate-400 font-mono font-bold">
                            {(currentKmlPoint as KmlMainlinePoint).innerShoulderWidth.toFixed(2)}m
                          </span>
                        </div>
                      )}

                    {currentKmlPoint.laneWidths.map((w, i) => (
                      <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                        <div className="bg-slate-800/90 hover:bg-slate-750 border-r border-dashed border-white/30 w-full flex flex-col items-center relative overflow-hidden transition-all duration-200 h-28 rounded-sm shadow-inner group-hover:brightness-110">
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className="text-white font-black text-xs sm:text-sm drop-shadow-md">
                              車道{i + 1}
                            </span>
                          </div>
                        </div>
                        <span className="mt-2 text-amber-400 font-mono font-black text-[10px]">
                          {w.toFixed(2)}m
                        </span>
                      </div>
                    ))}

                    {!currentKmlPoint.isRamp &&
                      (currentKmlPoint as KmlMainlinePoint).auxiliaryLanes.map((aux, i) => (
                        <div key={`aux-${i}`} className="flex flex-col items-center flex-1 justify-end h-full">
                          <div className="bg-blue-900/40 border-r border-dashed border-blue-400/40 w-full h-24 flex items-center justify-center text-blue-300 font-black text-[10px] rounded-sm shadow-inner">
                            {aux.name}
                          </div>
                          <span className="mt-2 text-blue-400 font-mono font-black text-[10px]">
                            {aux.width.toFixed(2)}m
                          </span>
                        </div>
                      ))}

                    {!currentKmlPoint.isRamp &&
                      (currentKmlPoint as KmlMainlinePoint).outerShoulderWidth > 0 && (
                        <div className="flex flex-col items-center justify-end h-full">
                          <div className="bg-gradient-to-b from-slate-700 to-slate-800 w-12 sm:w-16 h-28 border-r-2 border-white/80 flex items-center justify-center text-slate-300 text-[10px] font-black rounded-r-md shadow-inner">
                            外肩
                          </div>
                          <span className="mt-2 text-slate-400 font-mono font-bold">
                            {(currentKmlPoint as KmlMainlinePoint).outerShoulderWidth.toFixed(2)}m
                          </span>
                        </div>
                      )}
                  </div>
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
                        {renderHistoryCard(matchedMainlineSegs.find(s => s.lanes.includes('內側路肩')))}
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
                          {renderHistoryCard(historySeg)}
                        </div>
                      );
                    })}

                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).auxiliaryLanes.map((aux, i) => {
                      const historySeg = matchAuxLane(aux.name, matchedMainlineSegs as Segment[]);
                      return (
                        <div key={`aux-hist-${i}`} className="flex flex-col items-center justify-start flex-1 gap-2">
                          <span className="text-blue-500 font-bold text-[10px] bg-blue-50 px-3 py-1 rounded-full">{aux.name}</span>
                          {renderHistoryCard(historySeg)}
                        </div>
                      );
                    })}

                    {!currentKmlPoint.isRamp && (currentKmlPoint as KmlMainlinePoint).outerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center justify-start flex-1 gap-2">
                        <span className="text-slate-500 font-bold text-[10px] bg-slate-100 px-3 py-1 rounded-full">外肩</span>
                        {renderHistoryCard(matchedMainlineSegs.find(s => s.lanes.includes('外側路肩')))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <PavementCrossSectionModal
        segment={selectedHistorySeg}
        onClose={() => setSelectedHistorySeg(null)}
      />
    </div>
  );
}
