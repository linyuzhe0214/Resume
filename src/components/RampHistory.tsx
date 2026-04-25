import React, { useState, useMemo } from 'react';
import { Download, Plus, Layers, ChevronDown, MapPin, Search, ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-react';
import { RampSegment } from '../types';
import { cn } from '../App';
import ConfirmDialog from './ConfirmDialog';
import { HIGHWAY_INTERCHANGE_MAP } from '../constants';
import { getPavementColor, getPavementDisplayInfo, getColorFromLabel } from '../utils/pavement';
import { exportComponentAsImage, exportMultipleAsImage } from '../utils/exportImage';

interface RampHistoryProps {
  rampSegments: RampSegment[];
  activeHighway: string;
  onActiveHighwayChange: (highway: string) => void;
  activeInterchange: string;
  onActiveInterchangeChange: (interchange: string) => void;
  onNavigateToEditDetails: (rampId?: string, defaultHighway?: string, defaultInterchange?: string, prototypeId?: string) => void;
  onNavigateToEditHistory: (rampId?: string, prototypeId?: string, defaultStart?: number, defaultEnd?: number) => void;
  onDeleteRamp?: (rampId: string) => void;
  onUpdateRampOrder?: (newOrder: string[]) => void;
}

export default function RampHistory(props: RampHistoryProps) {
  const {
    rampSegments,
    activeHighway: selectedHighway,
    onActiveHighwayChange: setSelectedHighway,
    activeInterchange: selectedInterchange,
    onActiveInterchangeChange: setSelectedInterchange,
    onNavigateToEditDetails,
    onNavigateToEditHistory,
    onDeleteRamp,
    onUpdateRampOrder
  } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRampId, setDeletingRampId] = useState<string | null>(null);
  const [selectedRampId, setSelectedRampId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const highways = Object.keys(HIGHWAY_INTERCHANGE_MAP);

  const interchanges = HIGHWAY_INTERCHANGE_MAP[selectedHighway] || [];

  React.useEffect(() => {
    if (interchanges.length > 0 && !interchanges.includes(selectedInterchange)) {
      setSelectedInterchange(interchanges[0]);
    }
  }, [selectedHighway, interchanges, selectedInterchange, setSelectedInterchange]);

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
    const map = new Map<string, { groupId: string, rampId: string, rampName: string, length: number, segments: RampSegment[] }>();
    
    filteredRamps.forEach(ramp => {
      if (!ramp.rampId) return;
      if (!map.has(ramp.rampId)) {
        map.set(ramp.rampId, {
          groupId: ramp.rampId,
          rampId: ramp.rampId,
          rampName: ramp.rampName || '',
          length: ramp.length || 0,
          segments: []
        });
      }
      const group = map.get(ramp.rampId)!;
      group.segments.push(ramp);
      if (ramp.length > group.length) group.length = ramp.length;
      if (!group.rampName && ramp.rampName) group.rampName = ramp.rampName;
    });
    
    return Array.from(map.values());
  }, [filteredRamps]);

  const displayRamps = useMemo(() => {
    if (!searchTerm.trim()) return groupedRamps;
    const term = searchTerm.toLowerCase();
    return groupedRamps.filter(g => 
      g.rampId.toLowerCase().includes(term) || 
      g.rampName.toLowerCase().includes(term) ||
      (g.segments[0]?.rampNo || '').toLowerCase().includes(term)
    );
  }, [groupedRamps, searchTerm]);

  const selectedRampData = useMemo(() => {
    const raw = selectedRampId 
      ? groupedRamps.find(g => g.groupId === selectedRampId) || groupedRamps[0] || null
      : groupedRamps[0] || null;
    
    if (!raw) return null;

    const allLanes: string[] = Array.from(new Set(raw.segments.flatMap(s => s.lanes)));
    const sortedLanes = allLanes.sort((a, b) => {
       const order = ['第一車道', '第二車道', '第三車道', '第四車道', '內路肩', '外路肩', '路肩'];
       const idxA = order.indexOf(a);
       const idxB = order.indexOf(b);
       if (idxA === -1 && idxB === -1) return a.localeCompare(b);
       if (idxA === -1) return 1;
       if (idxB === -1) return -1;
       return idxA - idxB;
    });

    return { ...raw, lanes: sortedLanes.length > 0 ? sortedLanes : ['第一車道'] };
  }, [groupedRamps, selectedRampId]);

  React.useEffect(() => {
    if (selectedRampData && selectedRampId !== selectedRampData.groupId) {
       setSelectedRampId(selectedRampData.groupId);
    }
  }, [selectedRampData, selectedRampId]);

  const getSegmentData = (ramp: RampSegment) => {
    if (!ramp.pavementLayers || ramp.pavementLayers.length === 0) {
      if (ramp.maintenanceHistory && ramp.maintenanceHistory.length > 0) {
         const latest = ramp.maintenanceHistory[ramp.maintenanceHistory.length - 1];
         const color = getColorFromLabel(latest.label);
         return { 
           color, 
           depth: latest.depth || 0, 
           label: latest.label 
         };
      }
      return { color: '#e7e6e6', depth: 0, label: '其他/舊有' };
    }
    
    const targetMonth = ramp.constructionYear + ramp.constructionMonth;
    const info = getPavementDisplayInfo(ramp.pavementLayers, targetMonth);
    
    if (info.thickness === 0 && ramp.pavementLayers.length > 0) {
      const sortedMonths = Array.from(new Set(ramp.pavementLayers.map(l => l.month))).sort((a, b) => b.localeCompare(a));
      const latestMonth = sortedMonths[0];
      const latestInfo = getPavementDisplayInfo(ramp.pavementLayers, latestMonth);
      return { ...latestInfo, color: latestInfo.color, depth: latestInfo.thickness, label: latestInfo.combinedType };
    }

    return { color: info.color, depth: info.thickness, label: info.combinedType };
  };

  const getLegendItems = () => {
    const methodMap: Record<string, { color: string }> = {};
    
    filteredRamps.forEach(ramp => {
      const data = getSegmentData(ramp);
      if (data.depth > 0 || data.label !== '其他/舊有') {
        const material = data.label.replace(/局部|銑削|刨除|加鋪|milling|REINFORCE|REINFORCEMENT/gi, '').trim().toUpperCase();
        const label = data.depth > 0 ? `${data.depth}cm ${material}` : material;
        if (!methodMap[label]) {
          methodMap[label] = { color: data.color };
        }
      }
      
      if (ramp.maintenanceHistory) {
        ramp.maintenanceHistory.forEach(event => {
          const material = event.label.replace(/局部|銑削|刨除|加鋪|milling|REINFORCE|REINFORCEMENT/gi, '').trim().toUpperCase();
          const label = `${event.depth || 0}cm ${material}`;
          if (!methodMap[label]) {
            methodMap[label] = { color: getColorFromLabel(event.label) };
          }
        });
      }
    });

    return Object.entries(methodMap).map(([label, data]) => ({
      label,
      color: getColorFromLabel(label)
    }));
  };

  const legendItems = getLegendItems();

  const maxLength = useMemo(() => {
    const max = Math.max(...rampSegments.map(r => r.length), 0);
    return Math.ceil(max / 500) * 500 || 1500;
  }, [rampSegments]);

  const scaleMarkers = useMemo(() => {
    const markers = [];
    const step = 200;
    for (let i = 0; i <= maxLength; i += step) {
      markers.push(i);
    }
    if (markers[markers.length - 1] !== maxLength && maxLength - markers[markers.length - 1] > 50) {
       markers.push(maxLength);
    }
    return markers;
  }, [maxLength]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 pb-24">
      {/* Section 1: Filters & Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-600/20">
              <Layers size={24} className="text-white" />
            </div>
            <h1 className="font-black text-2xl sm:text-3xl tracking-tight text-slate-900 leading-none">匝道履歷資料</h1>
          </div>
          <p className="text-slate-500 font-bold text-sm sm:text-base opacity-80">交流道匝道結構與維護歷程管理系統</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 lg:flex lg:items-center">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">國道 Highway</label>
            <div className="relative group">
              <select 
                value={selectedHighway}
                onChange={(e) => setSelectedHighway(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 pr-12 text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              >
                {highways.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">交流道 Interchange</label>
            <div className="relative group">
              <select 
                value={selectedInterchange}
                onChange={(e) => setSelectedInterchange(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 pr-12 text-sm font-black text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              >
                {interchanges.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 匯出按鈕移到頂部 Header */}
          <button 
            onClick={() => exportMultipleAsImage(
              ['ramp-details-export', 'ramp-export-container'],
              `${selectedHighway}_${selectedInterchange}_匝道資料`
            )}
            className="hidden sm:flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95 col-span-2 lg:col-span-1"
            title="匯出（含施工履歷與詳細資料）"
          >
            <Download size={18} /> 匯出資料
          </button>
        </div>
      </header>

      {/* Section 2: Road Network Map */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 sticky top-4 z-40 shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <h3 className="font-black text-lg tracking-tight text-slate-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#00488d]" /> 匝道路網圖
          </h3>
        </div>
        <div className="p-4 bg-slate-50 flex justify-center items-center align-middle">
          <div className="w-full max-w-4xl aspect-[16/9] lg:aspect-[21/9] bg-slate-100/50 rounded-xl border border-slate-200 overflow-hidden relative flex flex-col items-center justify-center shadow-inner">
            <span className="text-slate-400 font-bold mb-2 flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8 opacity-50" />
              無對應交流道之 PDF
              <span className="text-xs font-normal">({`/${selectedHighway}-${selectedInterchange}.pdf`})</span>
            </span>
            <iframe 
              key={`${selectedHighway}-${selectedInterchange}`}
              src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/${selectedHighway}-${selectedInterchange}.pdf#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} 
              className="w-full h-full absolute inset-0 z-10 bg-white border-0" 
              title={`${selectedHighway}-${selectedInterchange} 匝道路網圖`}
            >
               <div className="w-full h-full flex flex-col gap-3 items-center justify-center bg-slate-100 text-slate-600 font-bold p-6 text-center shadow-inner">
                 <span>您的瀏覽器不支援即時 PDF 預覽，或系統找不到該檔案。</span>
                 {/* @ts-ignore */}
                 <a href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/${selectedHighway}-${selectedInterchange}.pdf`} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-[#00488d] text-white rounded-xl text-sm shadow hover:bg-[#005fb8] transition-colors hover:shadow-md cursor-pointer inline-flex">
                   點此另開視窗下載 / 檢視 PDF
                 </a>
               </div>
            </iframe>
          </div>
        </div>
      </section>

      {/* Section 3: Ramp Detailed Data Table */}
      <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-8">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 bg-slate-50/30">
          <div className="flex flex-col gap-1">
            <h3 className="font-black text-xl tracking-tight text-slate-800">匝道詳細資料</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ramp Detailed Structure</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigateToEditDetails(undefined, selectedHighway, selectedInterchange)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Plus size={16} /> 新增資料
            </button>

          </div>
        </div>
        <div id="ramp-details-export" className="bg-white">
          <div className="p-6 border-b border-slate-50 flex items-center gap-4">
             <div className="relative flex-1 max-w-sm group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="搜尋匝道編碼或名稱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all"
                />
             </div>
          </div>
          <div className="overflow-hidden shadow-inner">
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/90 backdrop-blur-sm">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">匝道編碼</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">匝道名稱</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">匝環道名稱</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">長度 (m)</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">備註</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center border-b border-slate-200">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRamps.map((group, index) => {
                    const ramp = group.segments[0];
                    if (!ramp) return null;
                    return (
                      <tr key={ramp.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                            {ramp.rampId}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-700">{ramp.rampName}</td>
                        <td className="px-6 py-5 font-bold text-slate-600">{ramp.rampNo}</td>
                        <td className="px-6 py-5 font-mono font-bold text-slate-800">{ramp.length}</td>
                        <td className="px-6 py-5 text-xs font-medium text-slate-500 italic max-w-[200px] truncate">
                          {ramp.notes || '-'}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => onNavigateToEditDetails(ramp.id)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all active:scale-90"
                              title="編輯"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setDeletingRampId(ramp.rampId);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                              title="刪除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-slate-50/50">
              {displayRamps.map((group) => {
                const ramp = group.segments[0];
                if (!ramp) return null;
                return (
                  <div key={ramp.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{ramp.rampId}</span>
                        <h4 className="font-black text-lg text-slate-800">{ramp.rampName}</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => onNavigateToEditDetails(ramp.id)}
                          className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setDeletingRampId(ramp.rampId);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-3 bg-red-50 text-red-500 rounded-2xl active:scale-90 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">匝環道</span>
                        <span className="font-bold text-slate-700">{ramp.rampNo}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">總長度</span>
                        <span className="font-mono font-black text-slate-900">{ramp.length}m</span>
                      </div>
                    </div>

                    {ramp.notes && (
                      <div className="bg-slate-50 p-3 rounded-2xl text-[11px] font-medium text-slate-500 italic">
                        {ramp.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Construction History */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#00488d]" />
            <h3 className="font-black text-lg tracking-tight text-slate-800">
              施工履歷 (Construction History)
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigateToEditHistory(undefined)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00488d] text-white rounded-xl text-xs font-black hover:bg-[#005fb8] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> 新增履歷
            </button>
          </div>
        </div>

        <div id="ramp-export-container" className="bg-white">
          <div className="px-6 py-3 bg-slate-50/50 flex flex-wrap gap-4 border-y border-slate-100">
            {legendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div 
                  className="w-6 h-3 border border-black/10 rounded-sm shadow-sm"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{item.label}</span>
              </div>
            ))}
            {legendItems.length === 0 && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 bg-[#e7e6e6] border border-black/10 rounded-sm"></div>
                <span className="text-[10px] font-bold text-slate-500">其他/舊有</span>
              </div>
            )}
          </div>
          
          <div className="p-6 overflow-x-auto">
            <div className="min-w-[800px] space-y-1">
              <div className="grid grid-cols-[180px_100px_1fr] items-center text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
                <div className="text-center">匝道編碼</div>
                <div className="text-center border-l border-slate-200">車道長度 (m)</div>
                <div className="relative h-6 flex items-center px-4">
                  {scaleMarkers.map(val => (
                    <span key={val} className="absolute text-slate-900 text-[10px] font-black" style={{ left: `${(val / maxLength) * 100}%`, transform: 'translateX(-50%)' }}>{val}</span>
                  ))}
                </div>
              </div>

              {displayRamps.map((group, idx) => (
                <div 
                  key={group.groupId} 
                  className="grid grid-cols-[180px_100px_1fr] items-stretch group transition-colors"
                >
                  <div className={cn(
                    "flex flex-col items-center justify-center py-4 border-b border-white rounded-l-md transition-shadow",
                    idx % 4 === 0 ? "bg-[#a3f69c]/40" :
                    idx % 4 === 1 ? "bg-[#cbe7f5]" :
                    idx % 4 === 2 ? "bg-[#ffdad6]" :
                    "bg-[#d6e3ff]"
                  )}>
                    <span className="font-black text-xs text-slate-950 drop-shadow-sm">{group.rampName}</span>
                    <span className="text-[10px] font-black tracking-widest uppercase mt-0.5 text-black">
                      {group.rampId}
                    </span>
                  </div>
                  <div className="flex items-center justify-center bg-yellow-50/50 font-bold text-sm text-slate-800 border-l border-slate-100 border-b border-white">
                    {group.length}
                  </div>
                  <div className="relative bg-yellow-50/50 flex items-center px-4 border-b border-white rounded-r-md">
                    {scaleMarkers.map(val => (
                      <div key={val} className="absolute top-0 bottom-0 w-[1px] bg-slate-200/40" style={{ left: `${(val / maxLength) * 100}%` }}></div>
                    ))}
                    <div 
                      className="relative z-10 w-full mt-7 mb-2" 
                      style={{ width: `${(group.length / maxLength) * 100}%` }}
                    >
                      <div
                        className="h-9 w-full bg-[#e7e6e6]/30 hover:bg-[#e7e6e6]/80 rounded-md shadow-inner relative overflow-hidden flex border border-slate-200 cursor-pointer transition-colors"
                        onClick={(e) => {
                          if (e.target === e.currentTarget && group.segments[0]) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const clickMileage = (clickX / rect.width) * group.length;

                            let occupied: { start: number, end: number }[] = [];
                            group.segments.forEach(r => {
                              const s = r.startMileage || 0;
                              const e = r.endMileage || group.length;
                              if (e > s) occupied.push({ start: s, end: e });
                              r.maintenanceHistory?.forEach(m => {
                                if (m.endMileage > m.startMileage) occupied.push({ start: m.startMileage, end: m.endMileage });
                              });
                            });
                            
                            occupied.sort((a, b) => a.start - b.start);
                            let defaultStart = 0;
                            let defaultEnd = group.length;
                            
                            for (let i = 0; i < occupied.length; i++) {
                              if (clickMileage < occupied[i].start) {
                                defaultEnd = occupied[i].start;
                                break;
                              } else if (clickMileage >= occupied[i].end) {
                                defaultStart = occupied[i].end;
                              }
                            }

                            onNavigateToEditHistory(undefined, group.segments[0].id, defaultStart, defaultEnd);
                          }
                        }}
                        title="點擊空白處新增目前匝道之新履歷資料"
                      >
                        {group.segments.map(ramp => {
                          const segmentData = getSegmentData(ramp);
                          const start = ramp.startMileage || 0;
                          const end = ramp.endMileage || group.length;
                          if (end <= start) return null;
                          const segmentColor = segmentData.color;
                          
                          return (
                            <div
                              key={ramp.id}
                              onClick={() => onNavigateToEditHistory(ramp.id)}
                              className="h-full absolute flex flex-col items-center justify-center border-r border-black/10 last:border-0 transition-all hover:brightness-95 group cursor-pointer z-10 border-2 border-black/10"
                              style={{ 
                                left: `${(start / group.length) * 100}%`, 
                                width: `${((end - start) / group.length) * 100}%`, 
                                backgroundColor: segmentColor 
                              }}
                            >
                              <span className="drop-shadow-sm truncate px-1 text-[11px] font-black leading-none text-slate-950">
                                {ramp.constructionYear}
                              </span>
                              <span className="text-[10px] font-black leading-none mt-0.5 text-slate-950">
                                {segmentData.depth}cm
                              </span>
                              {ramp.prevConstructionYear && (
                                <span className="text-[9px] leading-none mt-0.5 text-slate-950/70 truncate px-1 max-w-full">
                                  EX：{ramp.prevConstructionYear}{ramp.prevConstructionDepth ? `  ${ramp.prevConstructionDepth}cm` : ''}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {group.segments.map(ramp => 
                          ramp.maintenanceHistory?.map((event) => {
                            const left = (event.startMileage / group.length) * 100;
                            const width = ((event.endMileage - event.startMileage) / group.length) * 100;
                            if (width <= 0) return null;
                            const eventColor = getColorFromLabel(event.label);
                            
                            return (
                              <div
                                key={event.id}
                                onClick={() => onNavigateToEditHistory(ramp.id)}
                                className="h-full absolute flex flex-col items-center justify-center border-r border-black/10 last:border-0 transition-all hover:brightness-95 group cursor-pointer z-10 border-2 border-black/10"
                                style={{ left: `${left}%`, width: `${width}%`, backgroundColor: eventColor }}
                              >
                                <span className="drop-shadow-sm truncate px-1 text-[11px] font-black leading-none text-slate-950">
                                  {event.year}
                                </span>
                                {event.depth && (
                                   <span className="text-[10px] font-black leading-none mt-0.5 text-slate-950">
                                     {event.depth}cm
                                   </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {Array.from(new Set<number>(
                        group.segments.flatMap(r => [r.startMileage || 0, r.endMileage || group.length])
                        .concat(group.segments.flatMap(r => r.maintenanceHistory?.flatMap(m => [m.startMileage, m.endMileage]) || []))
                      ))
                      .sort((a, b) => a - b)
                      .filter(m => m > 0 && m < group.length)
                      .map((m, index) => (
                        <div key={`marker-${m}`} className="absolute top-0 h-9 w-[1px] bg-slate-400/60 z-30 pointer-events-none" style={{ left: `${(m / group.length) * 100}%` }}>
                          <span className={cn(
                            "absolute left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-800 shadow-sm whitespace-nowrap bg-white/95 px-1 py-[1px] rounded leading-none border border-slate-200",
                            "-top-4"
                          )}>
                            {m}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
