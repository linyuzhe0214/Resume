import React, { useState, useMemo } from 'react';
import { Filter, Download, Plus, Layers, ChevronDown, MapPin, Trash2 } from 'lucide-react';
import { RampSegment } from '../types';
import { cn } from '../App';
import ConfirmDialog from './ConfirmDialog';

interface RampHistoryProps {
  rampSegments: RampSegment[];
  onNavigateToEditDetails: (rampId?: string) => void;
  onNavigateToEditHistory: (rampId: string) => void;
  onDeleteRamp?: (rampId: string) => void;
}

export default function RampHistory({ rampSegments, onNavigateToEditDetails, onNavigateToEditHistory, onDeleteRamp }: RampHistoryProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRampId, setDeletingRampId] = useState<string | null>(null);
  const HIGHWAY_INTERCHANGE_MAP: Record<string, string[]> = {
    '國道1號': ['豐原交流道', '大雅系統', '大雅交流道', '台中交流道', '南屯交流道', '王田交流道'],
    '國道3號': ['彰化系統', '和美交流道'],
    '國道4號': ['后豐交流道', '豐勢交流道', '潭子交流道', '潭子系統']
  };

  const highways = Object.keys(HIGHWAY_INTERCHANGE_MAP);
  const [selectedHighway, setSelectedHighway] = useState<string>('國道1號');

  const interchanges = HIGHWAY_INTERCHANGE_MAP[selectedHighway] || [];
  const [selectedInterchange, setSelectedInterchange] = useState<string>(interchanges[0] || '');

  React.useEffect(() => {
    if (interchanges.length > 0 && !interchanges.includes(selectedInterchange)) {
      setSelectedInterchange(interchanges[0]);
    }
  }, [selectedHighway, interchanges, selectedInterchange]);

  const filteredRamps = useMemo(() => {
    return rampSegments.filter(ramp => {
      const matchHighway = ramp.highway === selectedHighway;
      const matchInterchange = ramp.interchange === selectedInterchange;
      return matchHighway && matchInterchange;
    });
  }, [rampSegments, selectedHighway, selectedInterchange]);

  const formatMileage = (m: number) => {
    const km = Math.floor(m / 1000);
    const meters = m % 1000;
    return `${km}k+${meters.toString().padStart(3, '0')}`;
  };

  const groupedRamps = useMemo(() => {
    const groups: Record<string, {
      rampId: string;
      rampName: string;
      length: number;
      segments: RampSegment[];
    }> = {};

    filteredRamps.forEach(ramp => {
      if (!groups[ramp.rampId]) {
        groups[ramp.rampId] = {
          rampId: ramp.rampId,
          rampName: ramp.rampName,
          length: ramp.length,
          segments: []
        };
      }
      groups[ramp.rampId].segments.push(ramp);
    });

    return Object.values(groups);
  }, [filteredRamps]);

  const getSegmentData = (ramp: RampSegment) => {
    if (!ramp.pavementLayers || ramp.pavementLayers.length === 0) return { color: '#ffffff', depth: 0, label: '' };
    
    // Normalize completionTime (e.g., "113/08" -> "11308")
    const compMonth = ramp.completionTime ? ramp.completionTime.replace('/', '') : '';
    
    // Filter layers where construction month matches completion month
    const currentLayers = ramp.pavementLayers.filter(l => l.month === compMonth);
    
    if (currentLayers.length === 0) return { color: '#ffffff', depth: 0, label: '' };
    
    const depth = currentLayers.reduce((acc, curr) => acc + curr.thickness, 0);
    const types = currentLayers.map(l => l.type.split('(')[0].trim());
    const combinedType = types.join('+');
    
    let color = '#e7e6e6';
    if (combinedType.includes('OG')) color = '#ffff00';
    else if (combinedType.includes('PAC')) color = '#00b0f0';
    else if (combinedType.includes('SMA')) color = '#7030a0';
    else if (combinedType.includes('GUSS')) color = '#c00000';
    else if (combinedType.includes('BTB')) color = '#843c0c';
    else if (combinedType.includes('AB')) color = '#7f7f7f';
    else if (combinedType.includes('DG')) color = '#ffc000';

    return { color, depth, label: `${combinedType}` };
  };

  const getLegendItems = () => {
    const methodMap: Record<string, { thickness: number; types: string[]; color: string }> = {};
    
    rampSegments.forEach(ramp => {
      const data = getSegmentData(ramp);
      if (data.depth > 0) {
        // Clean up the label
        let cleanLabel = data.label.replace(/局部|銑削|刨除|加鋪|milling|REINFORCE|REINFORCEMENT/gi, '').trim();
        if (!methodMap[cleanLabel]) {
          methodMap[cleanLabel] = { thickness: data.depth, types: [], color: data.color };
        }
      }
      
      if (ramp.maintenanceHistory) {
        ramp.maintenanceHistory.forEach(event => {
          let cleanLabel = event.label.replace(/局部|銑削|刨除|加鋪|milling|REINFORCE|REINFORCEMENT/gi, '').trim();
          if (!methodMap[cleanLabel]) {
            methodMap[cleanLabel] = { thickness: event.depth || 0, types: [], color: event.color };
          }
        });
      }
    });

    return Object.entries(methodMap).map(([label, data]) => ({
      label,
      color: data.color
    }));
  };

  const legendItems = getLegendItems();

  const maxLength = useMemo(() => {
    const max = Math.max(...rampSegments.map(r => r.length), 0);
    return Math.ceil(max / 500) * 500 || 1500;
  }, [rampSegments]);

  const scaleMarkers = useMemo(() => {
    const markers = [];
    const step = maxLength / 5;
    for (let i = 0; i <= 5; i++) {
      markers.push(Math.round(i * step));
    }
    return markers;
  }, [maxLength]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-24">
      {/* Section 1: Filters & Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="font-black text-3xl tracking-tight text-[#00488d]">匝道詳細資料</h1>
          <p className="text-slate-500 font-medium mt-1">交流道匝道結構與維護歷程管理</p>
        </div>
        
          <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">國道選擇</label>
            <div className="relative">
              <select 
                value={selectedHighway}
                onChange={(e) => {
                  setSelectedHighway(e.target.value);
                }}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#005fb8] focus:border-transparent min-w-[140px]"
              >
                {highways.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">交流道選擇</label>
            <div className="relative">
              <select 
                value={selectedInterchange}
                onChange={(e) => setSelectedInterchange(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#005fb8] focus:border-transparent min-w-[160px]"
              >
                {interchanges.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

            {/* Section 2: Road Network Map */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <h3 className="font-black text-lg tracking-tight text-slate-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#00488d]" /> 匝道路網圖
          </h3>
        </div>
        <div className="p-4 bg-slate-50 flex justify-center items-center align-middle">
          <div className="w-full max-w-4xl aspect-[16/9] bg-slate-100/50 rounded-xl border border-slate-200 overflow-hidden relative flex flex-col items-center justify-center shadow-inner">
            <span className="text-slate-400 font-bold mb-2 flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8 opacity-50" />
              無對應交流道之 PDF
              <span className="text-xs font-normal">({`/${selectedHighway}-${selectedInterchange}.pdf`})</span>
            </span>
            <iframe 
              key={`${selectedHighway}-${selectedInterchange}`}
              src={`/${selectedHighway}-${selectedInterchange}.pdf`} 
              className="w-full h-full absolute inset-0 z-10 bg-white border-0" 
              title={`${selectedHighway}-${selectedInterchange} 匝道路網圖`}
            >
               <div className="w-full h-full flex flex-col gap-3 items-center justify-center bg-slate-100 text-slate-600 font-bold p-6 text-center shadow-inner">
                 <span>您的瀏覽器不支援即時 PDF 預覽，或系統找不到該檔案。</span>
                 <a href={`/${selectedHighway}-${selectedInterchange}.pdf`} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-[#00488d] text-white rounded-xl text-sm shadow hover:bg-[#005fb8] transition-colors hover:shadow-md cursor-pointer inline-flex">
                   點此另開視窗下載 / 檢視 PDF
                 </a>
               </div>
            </iframe>
          </div>
        </div>
      </section>

{/* Section 3: Ramp Detailed Data Table */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-slate-50/30">
          <h3 className="font-black text-lg tracking-tight text-slate-800">匝道詳細資料 (Ramp Detailed Data)</h3>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigateToEditDetails()}
              className="flex items-center gap-2 px-4 py-2 bg-[#00488d] text-white rounded-xl text-xs font-bold hover:bg-[#005fb8] transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> 新增資料
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
              <Download className="w-3.5 h-3.5" /> 匯出報表
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">匝道編碼</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">匝道名稱</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">匝環道名稱</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">匝道長度 (m)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">備註</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedRamps.map((group) => {
                const ramp = group.segments[0];
                if (!ramp) return null;
                return (
                <tr key={group.rampId} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-5">
                    <span className="font-black text-[#00488d]">{ramp.rampId}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-slate-700">{ramp.rampName}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-slate-600">{ramp.rampNo}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-mono font-bold text-slate-800">{ramp.length}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-medium text-slate-500 italic">
                      {ramp.notes || '無備註'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => onNavigateToEditDetails(ramp.id)}
                        className="text-[#005fb8] font-black text-xs hover:underline"
                      >
                        修改
                      </button>
                      <button 
                        onClick={() => {
                          setDeletingRampId(ramp.rampId);
                          setShowDeleteConfirm(true);
                        }}
                        className="text-red-600 font-black text-xs hover:underline"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Construction History (Length-based Visualization) */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <h3 className="font-black text-lg tracking-tight text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#00488d]" /> 施工履歷 (Construction History)
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {legendItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div 
                    className="w-8 h-3 border border-black/10 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
                </div>
              ))}
              {legendItems.length === 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 bg-[#e7e6e6] border border-black/10 rounded-sm"></div>
                  <span className="text-[10px] font-bold text-slate-500">其他/舊有</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => onNavigateToEditHistory('')}
              className="flex items-center gap-2 px-6 py-2 bg-[#00488d] text-white rounded-xl text-sm font-black hover:bg-[#005fb8] transition-all shadow-lg shadow-blue-900/10 active:scale-95"
            >
              <Plus className="w-4 h-4" /> 新增匝道
            </button>
          </div>
        </div>
        
        <div className="p-8 overflow-x-auto">
          <div className="min-w-[800px] space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-[200px_100px_1fr] items-center text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
              <div className="text-center">匝道編碼 / 名稱</div>
              <div className="text-center border-l border-slate-200">車道長度 (m)</div>
              <div className="relative h-6 flex items-center px-4">
                {scaleMarkers.map(val => (
                  <span key={val} className="absolute text-slate-900 text-xs" style={{ left: `${(val / maxLength) * 100}%`, transform: 'translateX(-50%)' }}>{val}</span>
                ))}
              </div>
            </div>

            {/* Data Rows */}
            {groupedRamps.map((group, idx) => (
              <div 
                key={group.rampId} 
                className="grid grid-cols-[200px_100px_1fr] items-stretch group transition-colors"
              >
                <div className={cn(
                  "flex flex-col items-center justify-center py-3 border-b border-white",
                  idx % 4 === 0 ? "bg-[#a3f69c]/40 text-[#005312]" :
                  idx % 4 === 1 ? "bg-[#cbe7f5] text-[#00488d]" :
                  idx % 4 === 2 ? "bg-[#ffdad6] text-[#ba1a1a]" :
                  "bg-[#d6e3ff] text-[#00468b]"
                )}>
                  <span className="font-black text-sm">{group.rampId}</span>
                  <span className="text-[9px] font-bold opacity-70">{group.rampName}</span>
                </div>
                <div className="flex items-center justify-center bg-[#fff8e1] font-bold text-lg text-slate-800 border-l border-slate-200 border-b border-white">
                  {group.length}
                </div>
                <div className="relative bg-[#fff8e1] flex items-center px-4 border-b border-white">
                  {/* Grid Lines */}
                  {scaleMarkers.map(val => (
                    <div key={val} className="absolute top-0 bottom-0 w-[1px] bg-slate-200/50" style={{ left: `${(val / maxLength) * 100}%` }}></div>
                  ))}
                  {/* Length Bar with Construction History */}
                  <div 
                    className="h-8 bg-white rounded-md shadow-inner relative z-10 overflow-hidden flex border border-slate-200" 
                    style={{ width: `${(group.length / maxLength) * 100}%` }}
                  >
                    {/* Render all segments for this ramp */}
                    {group.segments.map(ramp => {
                      const segmentData = getSegmentData(ramp);
                      const start = ramp.startMileage || 0;
                      const end = ramp.endMileage || group.length;
                      
                      return (
                        <div
                          key={ramp.id}
                          onClick={() => onNavigateToEditHistory(ramp.id)}
                          className="h-full absolute flex flex-col items-center justify-center text-[9px] font-bold border-r border-black/10 last:border-0 transition-all hover:brightness-95 group cursor-pointer"
                          style={{ 
                            left: `${(start / group.length) * 100}%`, 
                            width: `${((end - start) / group.length) * 100}%`, 
                            backgroundColor: segmentData.color 
                          }}
                        >
                          <span className={cn(
                            "drop-shadow-sm truncate px-1",
                            ['#ffff00', '#e7e6e6', '#ffffff', '#ffc000', '#00b0f0'].includes(segmentData.color) ? "text-slate-900" : "text-white"
                          )}>
                            {ramp.constructionYear}
                          </span>
                          <span className={cn(
                            "text-[8px] opacity-90",
                            ['#ffff00', '#e7e6e6', '#ffffff', '#ffc000', '#00b0f0'].includes(segmentData.color) ? "text-slate-800" : "text-white"
                          )}>
                            {segmentData.depth}cm
                          </span>
                          
                          {/* Mileage Annotations */}
                          <span className="absolute -bottom-4 left-0 text-[7px] font-black text-slate-400 whitespace-nowrap">{formatMileage(start)}</span>
                          <span className="absolute -bottom-4 right-0 text-[7px] font-black text-slate-400 whitespace-nowrap">{formatMileage(end)}</span>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                            <div className="bg-gray-900 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap shadow-xl">
                              {ramp.constructionYear}年: {segmentData.label} ({formatMileage(start)} - {formatMileage(end)})
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Render maintenance history if any */}
                    {group.segments.map(ramp => 
                      ramp.maintenanceHistory?.map((event) => {
                        const left = (event.startMileage / group.length) * 100;
                        const width = ((event.endMileage - event.startMileage) / group.length) * 100;
                        return (
                          <div
                            key={event.id}
                            onClick={() => onNavigateToEditHistory(ramp.id)}
                            className="h-full absolute flex flex-col items-center justify-center text-[9px] font-bold border-r border-black/10 last:border-0 transition-all hover:brightness-95 group cursor-pointer"
                            style={{ left: `${left}%`, width: `${width}%`, backgroundColor: event.color }}
                          >
                            <span className={cn(
                              "drop-shadow-sm truncate px-1",
                              ['#ffff00', '#e7e6e6', '#ffffff', '#ffc000', '#00b0f0'].includes(event.color) ? "text-slate-900" : "text-white"
                            )}>{event.year}</span>
                            
                            {/* Mileage Annotations */}
                            <span className="absolute -bottom-4 left-0 text-[7px] font-black text-slate-400 whitespace-nowrap">{formatMileage(event.startMileage)}</span>
                            <span className="absolute -bottom-4 right-0 text-[7px] font-black text-slate-400 whitespace-nowrap">{formatMileage(event.endMileage)}</span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                              <div className="bg-gray-900 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap shadow-xl">
                                {event.year}年: {event.label} ({formatMileage(event.startMileage)} - {formatMileage(event.endMileage)})
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {group.segments.length === 0 && (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] italic">
                        暫無維護紀錄
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        title="確定要刪除此匝道資料嗎？"
        message="此操作無法復原，該匝道資料將被永久移除。"
        type="danger"
        onConfirm={() => {
          if (deletingRampId && onDeleteRamp) {
            onDeleteRamp(deletingRampId);
          }
          setShowDeleteConfirm(false);
          setDeletingRampId(null);
        }}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingRampId(null);
        }}
      />
    </div>
  );
}
