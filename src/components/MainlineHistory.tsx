import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Download, Settings, X, AlertTriangle, Route, Filter } from 'lucide-react';
import { cn } from '../App';
import { Segment } from '../types';
import { getPavementColor, getPavementDisplayInfo } from '../utils/pavement';
import { exportComponentAsImage } from '../utils/exportImage';

interface MainlineHistoryProps {
  segments: Segment[];
  activeHighway: string;
  onActiveHighwayChange: (highway: string) => void;
  laneOptions?: string[];
  onAddLane?: (newLane: string) => void;
  onDeleteLane?: (laneName: string) => void;
  onUpdateLaneOrder?: (newLanes: string[]) => void;
  onNavigateToEdit: (segmentId?: string) => void;
  onDeleteAll?: () => void;
  highlightSegmentId?: string | null;
  onHighlightClear?: () => void;
  title?: string;
}

export default function MainlineHistory({ 
  segments, 
  activeHighway,
  onActiveHighwayChange,
  laneOptions = [], 
  onAddLane, 
  onDeleteLane,
  onUpdateLaneOrder,
  onNavigateToEdit, 
  onDeleteAll, 
  highlightSegmentId,
  onHighlightClear,
  title = '路面整修歷史' 
}: MainlineHistoryProps) {
  const [newLaneName, setNewLaneName] = useState('');
  const [isLaneSettingsOpen, setIsLaneSettingsOpen] = useState(false);
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 儲存後自動捲動至目標色塊並闪爍
  useEffect(() => {
    if (!highlightSegmentId) return;
    const tryScroll = () => {
      const el = segmentRefs.current[highlightSegmentId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFlashingId(highlightSegmentId);
        setTimeout(() => {
          setFlashingId(null);
          if (onHighlightClear) onHighlightClear();
        }, 2000);
      }
    };
    // 等一小段讓 DOM 渲染
    const t = setTimeout(tryScroll, 150);
    return () => clearTimeout(t);
  }, [highlightSegmentId]);


  // 每公尺對應的像素比例尺
  const SCALE = 0.6;

  const highways = [
    { name: '國道1號', start: 166427, end: 192000, label: '國道1號 (166k+427~192k)' },
    { name: '國道3號', start: 183587, end: 198217, label: '國道3號 (183k+587~198k+217)' },
    { name: '國道4號', start: 10982, end: 27321, label: '國道4號 (10k+982~27k+321)' },
  ];

  const currentHighway = highways.find(h => h.name === activeHighway) || highways[0];
  const baseMileage = currentHighway.start;

  // 解析 「Xk+YYY」格式的里程
  const parseMileage = (str: string) => {
    const s = str.trim().toLowerCase();
    const kMatch = s.match(/^(\d+)k\+(\d+)$/);
    if (kMatch) return parseInt(kMatch[1]) * 1000 + parseInt(kMatch[2]);
    const num = parseInt(s);
    return isNaN(num) ? null : num;
  };

  // 匯出指定里程範圍
  const handleExportWithRange = () => {
    const start = exportStart ? parseMileage(exportStart) : null;
    const end = exportEnd ? parseMileage(exportEnd) : null;
    setShowExportModal(false);

    if (start !== null || end !== null) {
      // 先暫時過濾 DOM 範圍外的 segment（用 visibility 控制，不改 layout）
      const container = document.getElementById('mainline-export-container');
      if (!container) return;
      const allSegs = container.querySelectorAll('[data-seg-start][data-seg-end]') as NodeListOf<HTMLElement>;
      const hidden: HTMLElement[] = [];
      allSegs.forEach(el => {
        const segStart = parseInt(el.dataset.segStart || '0');
        const segEnd = parseInt(el.dataset.segEnd || '0');
        const inRange =
          (start === null || segEnd > start) &&
          (end === null || segStart < end);
        if (!inRange) {
          el.style.visibility = 'hidden';
          hidden.push(el);
        }
      });
      exportComponentAsImage('mainline-export-container', `${activeHighway}_${title}${start !== null || end !== null ? '_range' : ''}`);
      setTimeout(() => hidden.forEach(el => { el.style.visibility = ''; }), 200);
    } else {
      exportComponentAsImage('mainline-export-container', `${activeHighway}_${title}`);
    }
  };

  const generateGridIntervals = (startM: number, endM: number) => {
    const intervals = [];
    let current = startM;
    while (current < endM) {
      let next = Math.floor(current / 100) * 100 + 100;
      if (current % 100 === 0) {
        next = current + 100;
      }
      if (next > endM) {
        next = endM;
      }
      intervals.push({ startM: current, endM: next });
      current = next;
    }
    return intervals;
  };
  const gridIntervals = generateGridIntervals(currentHighway.start, currentHighway.end);

  const filteredSegments = segments.filter(s => s.highway === activeHighway);
  const southSegments = filteredSegments.filter(s => {
    if (activeHighway === '國道4號') return s.direction === 'Eastbound';
    return ['Southbound', 'Westbound'].includes(s.direction);
  });
  const northSegments = filteredSegments.filter(s => {
    if (activeHighway === '國道4號') return s.direction === 'Westbound';
    return ['Northbound', 'Eastbound'].includes(s.direction);
  });

  // 收集所有 segment 的邊界里程（用於中間欄標記）
  const formatMileage = (m: number) => {
    const km = Math.floor(m / 1000);
    const meters = m % 1000;
    return `${km}k+${meters.toString().padStart(3, '0')}`;
  };

  const collectBoundaryMarkers = () => {
    const markerSet = new Set<number>();
    filteredSegments.forEach(s => {
      markerSet.add(s.startMileage);
      markerSet.add(s.endMileage);
    });
    // 去除跟 100m 格線完全重合的點（避免重複標記）
    const markers = Array.from(markerSet).filter(m => m % 100 !== 0).sort((a, b) => a - b);
    return markers;
  };

  const uniqueSouthLanes = Array.from(new Set(southSegments.flatMap(s => s.lanes)));
  const uniqueNorthLanes = Array.from(new Set(northSegments.flatMap(s => s.lanes)));

  // Use the provided laneOptions for ordering
  // We mirror the order for Northbound to keep Inner-to-Outer consistency if that's what the user wants
  // or simply respect the array order.
  // Standard logic: 
  // Southbound: Outside to Inside (Reverse of order)
  // Northbound: Inside to Outside (Order as provided)
  const southColumns = [...laneOptions].reverse();
  const northColumns = laneOptions;

  // Calculate dynamic legend based on filtered segments
  const getLegendItems = () => {
    const periodMap: Record<string, { color: string }> = {};
    
    filteredSegments.forEach(s => {
      if (!s.pavementLayers || s.pavementLayers.length === 0) return;
      
      const targetMonth = s.constructionYear + s.constructionMonth;
      const info = getPavementDisplayInfo(s.pavementLayers, targetMonth);
      
      if (info.thickness > 0) {
        const label = `${info.thickness}cm ${info.combinedType}`;
        if (!periodMap[label]) {
          periodMap[label] = { color: info.color };
        }
      }
    });

    return Object.entries(periodMap).map(([label, data]) => ({
      label,
      color: data.color
    }));
  };

  const legendItems = getLegendItems();

  const renderSegment = (segment: Segment, lane: string) => {
    if (!segment.lanes.includes(lane)) return null;

    const top = (segment.startMileage - baseMileage) * SCALE;
    const height = (segment.endMileage - segment.startMileage) * SCALE;

    const targetMonth = segment.constructionYear + segment.constructionMonth;
    const info = getPavementDisplayInfo(segment.pavementLayers, targetMonth);
    
    let bgColor = info.color;
    let thickness = info.thickness;
    let combinedType = info.combinedType;
    
    if (thickness === 0 && segment.pavementLayers.length > 0) {
      const latestMonth = [...segment.pavementLayers].sort((a, b) => b.month.localeCompare(a.month))[0].month;
      const latestInfo = getPavementDisplayInfo(segment.pavementLayers, latestMonth);
      thickness = latestInfo.thickness;
      combinedType = latestInfo.combinedType;
      bgColor = latestInfo.color;
    } else if (thickness === 0) {
      bgColor = '#ffffff';
    }

    const isFlashing = flashingId === segment.id;

    return (
      <div
        key={`${segment.id}-${lane}`}
        ref={el => { if (!segmentRefs.current[segment.id]) segmentRefs.current[segment.id] = el; }}
        onClick={() => onNavigateToEdit(segment.id)}
        className={cn(
          "absolute w-full border border-black/10 flex flex-col items-center justify-center leading-none cursor-pointer hover:opacity-90 overflow-hidden group transition-all",
          isFlashing && "segment-flashing z-20"
        )}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          backgroundColor: bgColor,
        }}
        data-seg-start={segment.startMileage}
        data-seg-end={segment.endMileage}
      >
        {/* 頂部起始里程標記 */}
        {height >= 30 && (
          <span className="absolute top-[1px] left-0 text-[7px] font-bold text-black/40 leading-none px-[2px] pointer-events-none">
            {formatMileage(segment.startMileage)}
          </span>
        )}

        {/* 主要資訊 */}
        <span className="font-black text-[11px] text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] px-1 leading-none">
          {segment.constructionYear}
        </span>
        {height >= 45 && (
          <span className="truncate w-full text-center font-black text-[10px] text-slate-950 leading-none mt-0.5">
            {thickness}cm
          </span>
        )}
        {height >= 68 && segment.prevConstructionYear && (
          <span className="truncate w-full text-center text-[9px] text-slate-950/70 leading-none mt-0.5 px-1">
            EX：{segment.prevConstructionYear}{segment.prevConstructionDepth ? `  ${segment.prevConstructionDepth}cm` : ''}
          </span>
        )}

        {/* 底部結束里程標記 */}
        {height >= 30 && (
          <span className="absolute bottom-[1px] right-0 text-[7px] font-bold text-black/40 leading-none px-[2px] pointer-events-none">
            {formatMileage(segment.endMileage)}
          </span>
        )}
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap shadow-xl">
            {segment.constructionYear}年: {thickness}cm {combinedType} ({formatMileage(segment.startMileage)} - {formatMileage(segment.endMileage)})
          </div>
        </div>
      </div>
    );
  };

  const isDefaultLane = (lane: string) => {
    const defaults = ['內路肩', '第一車道', '第二車道', '第三車道', '第四車道', '外路肩', '輔助車道', '機車道', '加速車道', '減速車道', '避難車道', '爬坡車道'];
    return defaults.includes(lane);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 relative pb-24 overflow-hidden">
      {/* Top Navigation Shell */}
      <header className="bg-white/80 backdrop-blur-md z-50 w-full pt-4 px-4 sm:px-6 flex flex-col border-b border-slate-200 shrink-0 shadow-sm">
        <div className="flex items-center justify-between pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <Route className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-black text-lg sm:text-xl tracking-tight text-slate-900 leading-none">{title}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsLaneSettingsOpen(true)}
                className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm text-slate-700 active:scale-95"
                title="車道編輯"
              >
                <Settings className="w-5 h-5 sm:w-3.5 sm:h-3.5" /> 
                <span className="hidden sm:inline">車道編輯</span>
              </button>
              <button 
                onClick={() => { setExportStart(''); setExportEnd(''); setShowExportModal(true); }}
                className="flex items-center gap-2 p-2.5 sm:px-3 sm:py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm text-slate-700 active:scale-95"
                title="匯出"
              >
                <Download className="w-5 h-5 sm:w-3.5 sm:h-3.5" /> 
                <span className="hidden sm:inline">匯出</span>
              </button>
            </div>
            
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          </div>
        </div>
        {/* Highway Selection Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {highways.map(h => (
            <button 
              key={h.name}
              onClick={() => onActiveHighwayChange(h.name)}
              className={cn(
                "whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-black transition-all duration-200",
                activeHighway === h.name 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Global Settings / Add Lane Section */}
        <div className="hidden sm:flex items-center gap-3 py-3 border-t border-slate-100 mt-1">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <Plus size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="新增車道名稱..." 
              value={newLaneName}
              onChange={(e) => setNewLaneName(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 w-32 lg:w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newLaneName.trim() && onAddLane) {
                  onAddLane(newLaneName.trim());
                  setNewLaneName('');
                }
              }}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {laneOptions && laneOptions.filter(l => !isDefaultLane(l)).map(l => (
                <span key={l} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black border border-blue-100 flex-shrink-0">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>


      <div id="mainline-export-container" className="flex-1 flex flex-col bg-slate-50 overflow-hidden pt-4">
        {/* Legend Section */}
      <section className="mx-4 sm:mx-6 mb-4 bg-white rounded-3xl p-5 shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-xs tracking-[0.2em] text-slate-400 uppercase flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
            整修工法圖例 LEGEND
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 group cursor-default">
              <div 
                className="w-5 h-5 rounded-lg border border-black/5 shadow-sm group-hover:scale-110 transition-transform"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-[10px] font-bold text-slate-600 leading-tight truncate">{item.label}</span>
            </div>
          ))}
          {legendItems.length === 0 && (
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-slate-100 rounded-lg border border-black/5"></div>
              <span className="text-[10px] font-bold text-slate-400 leading-tight">目前無資料</span>
            </div>
          )}
        </div>
      </section>

      {/* Main History Grid */}
      <div className="mx-4 mb-4 bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 relative">
          <div className="min-w-[800px] flex flex-col">
            {/* Sticky Headers Wrapper */}
            <div className="sticky top-0 z-40 flex flex-col shadow-sm">
              {/* Grid Header */}
              <div className="grid grid-cols-[1fr_120px_1fr] bg-slate-50 border-b border-slate-200 text-center">
                <div className="py-3 px-2 flex flex-col items-center justify-center border-r border-slate-200">
                  <span className="text-[9px] font-bold text-[#00488d] tracking-[0.1em] uppercase">
                    {activeHighway === '國道4號' ? 'Eastbound' : 'Southbound'}
                  </span>
                  <span className="text-xl font-black text-slate-800 tracking-tight">
                    {activeHighway === '國道4號' ? '東向' : '南下'}
                  </span>
                </div>
                <div className="py-3 px-2 flex flex-col items-center justify-center bg-blue-50/50">
                  <span className="text-[9px] font-bold text-slate-500 tracking-[0.1em] uppercase">Mileage</span>
                  <span className="font-extrabold text-sm">里程</span>
                </div>
                <div className="py-3 px-2 flex flex-col items-center justify-center border-l border-slate-200">
                  <span className="text-[9px] font-bold text-[#00488d] tracking-[0.1em] uppercase">
                    {activeHighway === '國道4號' ? 'Westbound' : 'Northbound'}
                  </span>
                  <span className="text-xl font-black text-slate-800 tracking-tight">
                    {activeHighway === '國道4號' ? '西向' : '北上'}
                  </span>
                </div>
              </div>

              {/* Lane Sub-headers */}
              <div className="grid grid-cols-[1fr_120px_1fr] bg-slate-100/50 text-[9px] font-bold text-slate-500 text-center border-b border-slate-200">
                {/* Southbound/Westbound Lanes */}
                <div 
                  className="grid border-r border-slate-200 divide-x divide-slate-200"
                  style={{ gridTemplateColumns: `repeat(${southColumns.length}, minmax(0, 1fr))` }}
                >
                  {southColumns.map(lane => (
                    <div key={lane} className="py-1">{lane}</div>
                  ))}
                </div>
                <div className="bg-blue-50/30"></div>
                {/* Northbound/Eastbound Lanes */}
                <div 
                  className="grid border-l border-slate-200 divide-x divide-slate-200"
                  style={{ gridTemplateColumns: `repeat(${northColumns.length}, minmax(0, 1fr))` }}
                >
                  {northColumns.map(lane => (
                    <div key={lane} className="py-1">{lane}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Content Grid */}
            <div className="relative flex-1">
              {/* compute grid row heights */}
              <div 
                className="absolute inset-0 grid divide-y divide-slate-100 pointer-events-none"
                style={{ 
                  gridTemplateRows: gridIntervals.map(interval => {
                    return `${(interval.endM - interval.startM) * SCALE}px`;
                  }).join(' ') 
                }}
              >
                {gridIntervals.map((_, i) => <div key={i}></div>)}
              </div>

              {/* Layout Content */}
              <div className="grid grid-cols-[1fr_120px_1fr] text-[9px]">
                {/* Southbound Side */}
                <div 
                  className="grid border-r border-slate-200 relative"
                  style={{ gridTemplateColumns: `repeat(${southColumns.length}, minmax(0, 1fr))` }}
                >
                  {southColumns.map(lane => (
                    <div key={lane} className="relative">
                      {southSegments.map(s => renderSegment(s, lane))}
                    </div>
                  ))}
                </div>

                {/* Mileage Center Column */}
                <div className="bg-blue-50/10 text-center font-mono font-bold text-slate-500 text-[10px] z-20 relative">
                  {/* 100m 格線里程標記 */}
                  {gridIntervals.map((interval, i) => {
                    const currentM = interval.startM;
                    const endM = interval.endM;
                    const rowHeight = (endM - currentM) * SCALE;
                    const km = Math.floor(currentM / 1000);
                    const m = currentM % 1000;
                    const endKm = Math.floor(endM / 1000);
                    const endMStr = endM % 1000;
                    return (
                      <div key={i} className="flex flex-col items-center justify-center leading-none overflow-hidden relative border-b border-slate-100" style={{ height: `${rowHeight}px` }}>
                        {rowHeight >= 30 ? (
                          <>
                            <span>{km}k+{m.toString().padStart(3, '0')}</span>
                            {rowHeight >= 45 && <span className="text-[8px] text-slate-400">~</span>}
                            <span>{endKm}k+{endMStr.toString().padStart(3, '0')}</span>
                          </>
                        ) : (
                          <span className="scale-[0.85] truncate w-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 leading-none">
                            ~{endKm}k+{endMStr.toString().padStart(3, '0')}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Segment 邊界里程標記（非 100m 整數的起訖點） */}
                  {collectBoundaryMarkers().map((m, i) => {
                    const topPx = (m - baseMileage) * SCALE;
                    return (
                      <div
                        key={`marker-${i}`}
                        className="absolute left-0 right-0 flex items-center pointer-events-none"
                        style={{ top: `${topPx}px` }}
                      >
                        <div className="w-full border-t border-dashed border-red-400/60" />
                        <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 bg-white/90 px-1 text-[8px] font-bold text-red-500/80 whitespace-nowrap leading-none rounded">
                          {formatMileage(m)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Northbound Side */}
                <div 
                  className="grid border-l border-slate-200 relative"
                  style={{ gridTemplateColumns: `repeat(${northColumns.length}, minmax(0, 1fr))` }}
                >
                  {northColumns.map(lane => (
                    <div key={lane} className="relative">
                      {northSegments.map(s => renderSegment(s, lane))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Float Action Button */}
      <div className="fixed bottom-28 right-6 flex flex-col gap-4 z-50">
        {onDeleteAll && segments.length > 0 && (
          <button 
            onClick={onDeleteAll}
            className="flex items-center gap-2 px-5 py-3.5 bg-red-500 text-white rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all hover:bg-red-600 font-black text-sm group"
          >
            <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">一鍵刪除</span>
          </button>
        )}
        <button 
          onClick={() => onNavigateToEdit()}
          className="w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center self-end active:scale-95 transition-all hover:bg-blue-700 hover:rotate-90"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
      </div>
      {/* Lane Settings Modal */}
      {isLaneSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#005FB8] px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">車道配置管理</h3>
                  <p className="text-blue-100 text-[10px] font-medium opacity-80 uppercase tracking-wider">Lane Configuration Management</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLaneSettingsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold leading-relaxed">
                    <p className="mb-1 text-sm font-bold">警告：級聯刪除風險</p>
                    刪除車道會<span className="text-red-600 underline underline-offset-2 decoration-2 px-1">連帶刪除該車道的所有施工紀錄</span>。此操作無法復原。
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1 px-1">現有車道清單</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 customize-scrollbar">
                    {laneOptions.map((lane, index) => {
                      const isDefault = isDefaultLane(lane);
                      const count = segments.filter(s => s.highway === activeHighway && s.lanes.includes(lane)).length;
                      
                      return (
                        <div key={lane} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <button 
                                onClick={() => {
                                  if (index > 0 && onUpdateLaneOrder) {
                                    const newOrder = [...laneOptions];
                                    [newOrder[index-1], newOrder[index]] = [newOrder[index], newOrder[index-1]];
                                    onUpdateLaneOrder(newOrder);
                                  }
                                }}
                                disabled={index === 0}
                                className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m18 15-6-6-6 6"/></svg>
                              </button>
                              <button 
                                onClick={() => {
                                  if (index < laneOptions.length - 1 && onUpdateLaneOrder) {
                                    const newOrder = [...laneOptions];
                                    [newOrder[index+1], newOrder[index]] = [newOrder[index], newOrder[index+1]];
                                    onUpdateLaneOrder(newOrder);
                                  }
                                }}
                                disabled={index === laneOptions.length - 1}
                                className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
                              </button>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 flex items-center gap-2">
                                {lane}
                                {isDefault && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-black">預設</span>}
                                {!isDefault && <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md font-black">自定義</span>}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">包含 {count} 筆施工紀錄</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if (onDeleteLane) onDeleteLane(lane);
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                            title="刪除此車道及其所有資料"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="快速新增車道..." 
                      value={newLaneName}
                      onChange={(e) => setNewLaneName(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 test-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newLaneName.trim() && onAddLane) {
                          onAddLane(newLaneName.trim());
                          setNewLaneName('');
                        }
                      }}
                    />
                    <Plus className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsLaneSettingsOpen(false)}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all shadow-md active:scale-95"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出範圍 Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#005FB8] px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">匯出里程範圍</h3>
                  <p className="text-blue-100 text-[10px] font-medium opacity-80 uppercase tracking-wider">Export Mileage Range (Optional)</p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-90">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-bold">可留空代表不限（匯出全段），格式：<span className="text-blue-600">166k+500</span> 或 <span className="text-blue-600">166500</span></p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">起點里程</label>
                  <input
                    type="text"
                    placeholder="例：166k+427（留空=起始）"
                    value={exportStart}
                    onChange={e => setExportStart(e.target.value)}
                    className="mt-1 w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">終點里程</label>
                  <input
                    type="text"
                    placeholder="例：192k+000（留空=終點）"
                    value={exportEnd}
                    onChange={e => setExportEnd(e.target.value)}
                    className="mt-1 w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
              >取消</button>
              <button
                onClick={handleExportWithRange}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4 inline mr-1.5" />匯出圖片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
