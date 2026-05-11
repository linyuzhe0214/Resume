import React from 'react';
import { MapPin, Route, Search, Split, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { KmlPoint, KmlMainlinePoint, KmlRampPoint } from '../utils/kmlParser';
import type { SearchMode } from '../hooks/useGeolocationSync';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
}: SurfaceViewProps) {
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
                onChange={e => onHighwayChange(e.target.value)}
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
                {['南下車道', '北上車道', '東向車道', '西向車道', '雙向'].map(d => (
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
                <div className="w-full flex items-end justify-center h-28 gap-1 px-2 font-mono text-[9px]">
                  {!currentKmlPoint.isRamp &&
                    (currentKmlPoint as KmlMainlinePoint).innerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-200 w-7 h-14 border-l-2 border-slate-300 flex items-center justify-center text-slate-600 text-[8px] leading-tight text-center font-bold">
                          內<br />肩
                        </div>
                        <span className="mt-2 text-slate-500 font-bold">
                          {(currentKmlPoint as KmlMainlinePoint).innerShoulderWidth.toFixed(2)}m
                        </span>
                      </div>
                    )}

                  {currentKmlPoint.laneWidths.map((w, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div className="bg-slate-100 border-l border-dashed border-slate-300 w-full h-20 flex items-center justify-center text-slate-700 font-black text-[10px]">
                        車道{i + 1}
                      </div>
                      <span className="mt-2 text-slate-500 font-bold">{w.toFixed(2)}m</span>
                    </div>
                  ))}

                  {!currentKmlPoint.isRamp &&
                    (currentKmlPoint as KmlMainlinePoint).auxiliaryLanes.map((aux, i) => (
                      <div key={`aux-${i}`} className="flex flex-col items-center flex-1">
                        <div className="bg-blue-50 border-l border-dashed border-blue-200 w-full h-16 flex items-center justify-center text-blue-700 font-black text-[9px]">
                          {aux.name}
                        </div>
                        <span className="mt-2 text-blue-500 font-bold">{aux.width.toFixed(2)}m</span>
                      </div>
                    ))}

                  {!currentKmlPoint.isRamp &&
                    (currentKmlPoint as KmlMainlinePoint).outerShoulderWidth > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-200 w-16 h-14 border-r-2 border-slate-300 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                          外路肩
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
