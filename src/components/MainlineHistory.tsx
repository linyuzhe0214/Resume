import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../App';
import { Segment } from '../types';
import { getPavementColor, getPavementDisplayInfo } from '../utils/pavement';

interface MainlineHistoryProps {
  segments: Segment[];
  onNavigateToEdit: (segmentId?: string) => void;
  onDeleteAll?: () => void;
  title?: string;
}

export default function MainlineHistory({ segments, onNavigateToEdit, onDeleteAll, title = '路面整修履歷' }: MainlineHistoryProps) {
  const [activeHighway, setActiveHighway] = React.useState('國道1號');

  const highways = [
    { name: '國道1號', start: 166427, end: 192000, label: '國道1號 (166k+427~192k)' },
    { name: '國道3號', start: 183587, end: 198217, label: '國道3號 (183k+587~198k+217)' },
    { name: '國道4號', start: 10982, end: 27321, label: '國道4號 (10k+982~27k+321)' },
  ];

  const currentHighway = highways.find(h => h.name === activeHighway) || highways[0];
  const baseMileage = currentHighway.start;
  const totalLength = currentHighway.end - currentHighway.start;
  const numRows = Math.ceil(totalLength / 100); // 100 meters per row

  const filteredSegments = segments.filter(s => s.highway === activeHighway);
  const southSegments = filteredSegments.filter(s => ['Southbound', 'Westbound'].includes(s.direction));
  const northSegments = filteredSegments.filter(s => ['Northbound', 'Eastbound'].includes(s.direction));

  const uniqueSouthLanes = Array.from(new Set(southSegments.flatMap(s => s.lanes)));
  const uniqueNorthLanes = Array.from(new Set(northSegments.flatMap(s => s.lanes)));

  const STANDARD_LANES_SOUTH = ['外路肩', '第四車道', '第三車道', '第二車道', '第一車道', '內路肩'];
  const STANDARD_LANES_NORTH = ['內路肩', '第一車道', '第二車道', '第三車道', '第四車道', '第五車道', '外路肩'];

  const customSouthLanes = uniqueSouthLanes.filter(l => !STANDARD_LANES_SOUTH.includes(l));
  const customNorthLanes = uniqueNorthLanes.filter(l => !STANDARD_LANES_NORTH.includes(l));

  const southColumns = [...customSouthLanes, ...STANDARD_LANES_SOUTH];
  const northColumns = [...STANDARD_LANES_NORTH, ...customNorthLanes];

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

    const top = (segment.startMileage - baseMileage) * 0.4;
    const height = (segment.endMileage - segment.startMileage) * 0.4;

    const targetMonth = segment.constructionYear + segment.constructionMonth;
    const info = getPavementDisplayInfo(segment.pavementLayers, targetMonth);
    
    let bgColor = info.color;
    let thickness = info.thickness;
    let combinedType = info.combinedType;
    
    if (thickness === 0 && segment.pavementLayers.length > 0) {
      // Fallback for older data or different month logic
      const latestMonth = [...segment.pavementLayers].sort((a, b) => b.month.localeCompare(a.month))[0].month;
      const latestInfo = getPavementDisplayInfo(segment.pavementLayers, latestMonth);
      thickness = latestInfo.thickness;
      combinedType = latestInfo.combinedType;
      bgColor = '#e7e6e6';
    } else if (thickness === 0) {
      bgColor = '#ffffff';
    }


    const formatMileage = (m: number) => {
      const km = Math.floor(m / 1000);
      const meters = m % 1000;
      return `${km}k+${meters.toString().padStart(3, '0')}`;
    };

    return (
      <div
        key={`${segment.id}-${lane}`}
        onClick={() => onNavigateToEdit(segment.id)}
        className="absolute w-full border border-black/10 flex flex-col items-center justify-center leading-none cursor-pointer hover:opacity-90 overflow-hidden group"
        style={{ top: `${top}px`, height: `${height}px`, backgroundColor: bgColor }}
      >
        <span className="font-black text-[11px] text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] px-1 leading-none">
          {segment.constructionYear}
        </span>
        {height >= 35 && (
          <span className="truncate w-full text-center font-black text-[10px] text-slate-950 leading-none mt-0.5">
            {thickness}cm
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

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f7f9fc] relative pb-24">
      {/* Top Navigation Shell */}
      <header className="bg-[#f7f9fc] z-50 w-full pt-4 px-6 flex flex-col border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#005FB8]"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </div>
            <h1 className="font-bold text-xl tracking-tight text-[#191c1e]">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 cursor-pointer"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          </div>
        </div>
        {/* Highway Selection Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-4">
          {highways.map(h => (
            <button 
              key={h.name}
              onClick={() => setActiveHighway(h.name)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl font-medium transition-all duration-200 ease-in-out",
                activeHighway === h.name 
                  ? "text-[#005FB8] border-b-2 border-[#005FB8] font-bold bg-[#005FB8]/5" 
                  : "text-[#48626e] hover:bg-[#eceef1]"
              )}
            >
              {h.label}
            </button>
          ))}
        </div>
      </header>

      {/* Legend Section */}
      <section className="mx-4 mb-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200 shrink-0">
        <h2 className="font-bold text-xs tracking-wider text-slate-500 uppercase mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-[#00488d] rounded-full"></span>
          整修工法圖例 LEGEND
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div 
                className="w-6 h-4 border border-black/10 rounded-sm"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-[10px] font-medium text-slate-600 leading-tight">{item.label}</span>
            </div>
          ))}
          {legendItems.length === 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-[#e7e6e6] border border-black/10 rounded-sm"></div>
              <span className="text-[10px] font-medium text-slate-600 leading-tight">其他/舊有</span>
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
              <div className="grid grid-cols-[1fr_100px_1fr] bg-slate-50 border-b border-slate-200 text-center">
                <div className="py-3 px-2 flex flex-col items-center justify-center border-r border-slate-200">
                  <span className="text-[9px] font-bold text-[#00488d] tracking-[0.1em] uppercase">
                    {activeHighway === '國道4號' ? 'Westbound' : 'Southbound'}
                  </span>
                  <span className="font-extrabold text-sm">
                    {activeHighway === '國道4號' ? '西向' : '南下'}
                  </span>
                </div>
                <div className="py-3 px-2 flex flex-col items-center justify-center bg-blue-50/50">
                  <span className="text-[9px] font-bold text-slate-500 tracking-[0.1em] uppercase">Mileage</span>
                  <span className="font-extrabold text-sm">里程</span>
                </div>
                <div className="py-3 px-2 flex flex-col items-center justify-center border-l border-slate-200">
                  <span className="text-[9px] font-bold text-[#00488d] tracking-[0.1em] uppercase">
                    {activeHighway === '國道4號' ? 'Eastbound' : 'Northbound'}
                  </span>
                  <span className="font-extrabold text-sm">
                    {activeHighway === '國道4號' ? '東向' : '北上'}
                  </span>
                </div>
              </div>

              {/* Lane Sub-headers */}
              <div className="grid grid-cols-[1fr_100px_1fr] bg-slate-100/50 text-[9px] font-bold text-slate-500 text-center border-b border-slate-200">
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
              {/* The background lines for rows */}
              <div 
                className="absolute inset-0 grid divide-y divide-slate-100 pointer-events-none"
                style={{ gridTemplateRows: `repeat(${numRows}, 40px)` }}
              >
                {Array.from({ length: numRows }).map((_, i) => <div key={i}></div>)}
              </div>

              {/* Layout Content */}
              <div className="grid grid-cols-[1fr_100px_1fr] text-[9px]">
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
                <div className="bg-blue-50/10 divide-y divide-slate-100 text-center font-mono font-bold text-slate-500 text-[10px] z-20">
                  {Array.from({ length: numRows }).map((_, i) => {
                    const currentM = baseMileage + i * 100;
                    const endM = Math.min(currentM + 100, currentHighway.end);
                    const km = Math.floor(currentM / 1000);
                    const m = currentM % 1000;
                    const endKm = Math.floor(endM / 1000);
                    const endMStr = endM % 1000;
                    return (
                      <div key={i} className="h-[40px] flex flex-col items-center justify-center leading-none gap-0.5">
                        <span>{km}k+{m.toString().padStart(3, '0')}</span>
                        <span className="text-[8px] text-slate-400">~</span>
                        <span>{endKm}k+{endMStr.toString().padStart(3, '0')}</span>
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
      <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-50">
        {onDeleteAll && segments.length > 0 && (
          <button 
            onClick={onDeleteAll}
            className="flex items-center gap-2 px-4 py-3 bg-red-500 text-white rounded-full shadow-lg active:scale-95 transition-all hover:bg-red-600 font-bold text-sm"
          >
            <Trash2 className="w-5 h-5" />
            一鍵刪除
          </button>
        )}
        <button 
          onClick={() => onNavigateToEdit()}
          className="w-14 h-14 bg-[#00488d] text-white rounded-full shadow-lg flex items-center justify-center self-end active:scale-95 transition-all hover:bg-[#003d7a]"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
