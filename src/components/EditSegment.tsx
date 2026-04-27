import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Calendar, Edit2, Trash2, Lock, Unlock, Copy } from 'lucide-react';
import { Segment } from '../types';
import { cn } from '../App';
import ConfirmDialog from './ConfirmDialog';
import { parseMileage, formatMileage } from '../utils/mileage';
import MileageInput from './MileageInput';
import { formatMonth } from '../utils/pavement';
import { HIGHWAY_MILEAGE_LIMITS } from '../constants';

interface EditSegmentProps {
  segment?: Segment;
  isPlanning?: boolean;
  laneOptions?: string[];
  allSegments?: Segment[];   // 用於複製鋪面功能
  onChange: (segment: Segment) => void;
  onSave: (segment: Segment) => void;
  onDelete?: (id: string) => void;
  onCopy?: () => void;
  onMoveToPlanning?: (segment: Segment) => void;
  onCopyPavement?: (targetIds: string[], layers: Segment['pavementLayers']) => void;
  onBack: () => void;
  onNavigateToPavement: () => void;
}

export default function EditSegment({ segment, isPlanning, laneOptions = [], allSegments = [], onChange, onSave, onDelete, onCopy, onMoveToPlanning, onCopyPavement, onBack, onNavigateToPavement }: EditSegmentProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCopyPavementModal, setShowCopyPavementModal] = useState(false);
  const [copyTargetIds, setCopyTargetIds] = useState<string[]>([]);
  const [lockLength, setLockLength] = useState(!!segment?.id);
  const [formData, setFormData] = useState<Segment>(
    segment || {
      id: crypto.randomUUID(),
      highway: '國道1號',
      property: '路堤',
      laneCategory: '',
      constructionYear: '',
      constructionMonth: '',
      startMileage: 0,
      endMileage: 0,
      direction: 'Southbound',
      lanes: [],
      pavementLayers: []
    }
  );

  const validationError = React.useMemo(() => {
    const errors: string[] = [];
    if (formData.startMileage > formData.endMileage) {
      errors.push('起點里程不可大於終點里程');
    }
    const limits = HIGHWAY_MILEAGE_LIMITS[formData.highway];
    if (limits) {
      if (formData.startMileage < limits.min || formData.startMileage > limits.max) {
        errors.push(`${formData.highway} 起點里程需介於 ${formatMileage(limits.min)} ~ ${formatMileage(limits.max)}`);
      }
      if (formData.endMileage < limits.min || formData.endMileage > limits.max) {
        errors.push(`${formData.highway} 終點里程需介於 ${formatMileage(limits.min)} ~ ${formatMileage(limits.max)}`);
      }
    }

    const fStart = Math.round(formData.startMileage);
    const fEnd = Math.round(formData.endMileage);

    const overlaps = allSegments.filter(s => {
      if (s.id === formData.id) return false;
      if (s.highway !== formData.highway) return false;
      if (s.direction !== formData.direction) return false;
      if (!s.lanes.some(l => formData.lanes.includes(l))) return false;
      
      const sStart = Math.round(s.startMileage);
      const sEnd = Math.round(s.endMileage);
      return sStart < fEnd && sEnd > fStart;
    });

    if (overlaps.length > 0) {
      const overlapMsgs = overlaps.slice(0, 2).map(o => `(${o.lanes.join(',')} ${formatMileage(o.startMileage)}~${formatMileage(o.endMileage)})`);
      errors.push(`區間與現有路段重疊 ${overlapMsgs.join(', ')}${overlaps.length > 2 ? ' 等' : ''}`);
    }

    return errors.length > 0 ? errors.join('；') : null;
  }, [formData, allSegments]);


  useEffect(() => {
    if (segment) {
      setFormData(segment);
    }
  }, [segment]);

  const handleChange = (newData: Segment) => {
    setFormData(newData);
    onChange(newData);
  };

  const handleStartMileageChange = (newStart: number) => {
    if (lockLength) {
      const length = formData.endMileage - formData.startMileage;
      handleChange({ ...formData, startMileage: newStart, endMileage: newStart + length });
    } else {
      handleChange({ ...formData, startMileage: newStart });
    }
  };

  const handleEndMileageChange = (newEnd: number) => {
    if (lockLength) {
      const length = formData.endMileage - formData.startMileage;
      handleChange({ ...formData, startMileage: newEnd - length, endMileage: newEnd });
    } else {
      handleChange({ ...formData, endMileage: newEnd });
    }
  };

  const handleSave = () => {
    if (validationError) return;
    onSave(formData);
  };

  const totalThickness = formData.pavementLayers.reduce((sum, layer) => sum + layer.thickness, 0);

  return (
    <div className="h-[100dvh] bg-[#f7f9fc] text-[#191c1e] flex flex-col overflow-hidden">
      {/* TopAppBar */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 h-16 w-full">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-slate-100 transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h1 className="font-black text-lg tracking-tight leading-none text-slate-900">
              {segment ? '編輯路段' : '新增路段'}
            </h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">MAINLINE EDIT</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {segment && onDelete && (
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="w-10 h-10 flex items-center justify-center rounded-2xl text-red-500 hover:bg-red-50 transition-all active:scale-90"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleSave} 
            disabled={!!validationError}
            className={cn(
              "px-6 py-2.5 rounded-2xl text-sm font-black shadow-lg transition-all active:scale-95",
              validationError 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                : "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700"
            )}
          >
            儲存
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="max-w-md md:max-w-2xl mx-auto px-4 py-6 space-y-6 md:space-y-8">
        {/* Basic Path Info Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
              <h2 className="font-black text-lg tracking-tight text-slate-800">基本路徑資訊</h2>
            </div>
            <div className="flex gap-2">
              {segment && onCopy && (
                <button 
                  onClick={onCopy} 
                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors active:scale-90"
                  title="複製新增"
                >
                  <Copy size={18} />
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm space-y-6 border border-slate-100">
            {/* Highway Select */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Highway 國道</label>
              <div className="relative group">
                <select 
                  value={formData.highway}
                  onChange={(e) => {
                    const newHighway = e.target.value;
                    let newDir = formData.direction;
                    if (newHighway === '國道4號' && ['Northbound', 'Southbound'].includes(newDir)) {
                      newDir = newDir === 'Northbound' ? 'Eastbound' : 'Westbound';
                    } else if (newHighway !== '國道4號' && ['Eastbound', 'Westbound'].includes(newDir)) {
                      newDir = newDir === 'Eastbound' ? 'Northbound' : 'Southbound';
                    }
                    handleChange({...formData, highway: newHighway, direction: newDir as any});
                  }}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none group-hover:bg-slate-100/50"
                >
                  <option value="國道1號">國道1號</option>
                  <option value="國道3號">國道3號</option>
                  <option value="國道4號">國道4號</option>
                </select>
                <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* Property & Lane Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Property 屬性</label>
                <div className="relative group">
                  <select 
                    value={formData.property}
                    onChange={(e) => handleChange({...formData, property: e.target.value})}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none"
                  >
                    <option value="路堤">路堤</option>
                    <option value="橋梁">橋梁</option>
                    <option value="隧道">隧道</option>
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Lane 車道</label>
                <div className="relative group">
                  <select 
                    value={formData.lanes[0] || ''}
                    onChange={(e) => handleChange({...formData, lanes: [e.target.value]})}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none"
                  >
                    <option value="" disabled>選擇車道</option>
                    {(() => {
                      const isSouthSide = ['Southbound', 'Westbound'].includes(formData.direction);
                      const displayLanes = isSouthSide ? [...laneOptions].reverse() : laneOptions;
                      
                      return displayLanes.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ));
                    })()}
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Construction Period Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-6 bg-[#48626e] rounded-full"></span>
            <h2 className="font-extrabold text-lg tracking-tight">施工期間</h2>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="space-y-1.5 w-full">
              <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">End Date 結束日期 (民國年/月)</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <select 
                    value={formData.constructionYear}
                    onChange={(e) => handleChange({ ...formData, constructionYear: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-[#005fb8]/20 transition-all outline-none appearance-none"
                  >
                    <option value="" disabled>年份</option>
                    {Array.from({length: 60}, (_, i) => 125 - i).map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold pointer-events-none">年</span>
                  <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <div className="flex-1 relative">
                  <select 
                    value={formData.constructionMonth}
                    onChange={(e) => handleChange({ ...formData, constructionMonth: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-[#005fb8]/20 transition-all outline-none appearance-none"
                  >
                    <option value="" disabled>月份</option>
                    {Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold pointer-events-none">月</span>
                  <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mileage & Direction Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#1d6e25] rounded-full"></span>
              <h2 className="font-extrabold text-lg tracking-tight">里程與方向</h2>
            </div>
            <button 
              onClick={() => setLockLength(!lockLength)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                lockLength ? "bg-blue-50 text-[#005fb8]" : "bg-slate-100 text-slate-500"
              )}
            >
              {lockLength ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {lockLength ? '鎖定長度' : '自由調整'}
            </button>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-slate-100">
            {validationError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-top-1">
                ⚠️ {validationError}
              </div>
            )}
            <div className="flex gap-4">
              <MileageInput 
                label="Start Mileage 起點" 
                value={formData.startMileage} 
                onChange={handleStartMileageChange} 
              />
              <MileageInput 
                label="End Mileage 終點" 
                value={formData.endMileage} 
                onChange={handleEndMileageChange} 
              />
            </div>
            <div className="bg-slate-100 rounded-xl p-1 flex">
              <button 
                onClick={() => handleChange({...formData, direction: formData.highway === '國道4號' ? 'Eastbound' : 'Northbound'})}
                className={`flex-1 py-2 text-sm font-bold rounded-lg shadow-sm transition-colors ${['Northbound', 'Eastbound'].includes(formData.direction) ? 'text-[#00488d] bg-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {formData.highway === '國道4號' ? 'East 東向' : 'North 北上'}
              </button>
              <button 
                onClick={() => handleChange({...formData, direction: formData.highway === '國道4號' ? 'Westbound' : 'Southbound'})}
                className={`flex-1 py-2 text-sm font-bold rounded-lg shadow-sm transition-colors ${['Southbound', 'Westbound'].includes(formData.direction) ? 'text-[#00488d] bg-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {formData.highway === '國道4號' ? 'West 西向' : 'South 南下'}
              </button>
            </div>
          </div>
        </section>

        {/* Pavement Section Details Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#005fb8] rounded-sm"></div>
              <h2 className="font-bold text-lg text-slate-800">Pavement Cross-section (鋪面斷面圖說)</h2>
            </div>
            <div className="flex items-center gap-2">
              {onCopyPavement && formData.pavementLayers.length > 0 && (
                <button
                  onClick={() => { setCopyTargetIds([]); setShowCopyPavementModal(true); }}
                  className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 duration-150 hover:bg-emerald-100 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  複製斷面
                </button>
              )}
              <button
                onClick={onNavigateToPavement}
                className="text-[#005fb8] font-bold text-sm flex items-center gap-1 hover:underline"
              >
                調整斷面 <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div 
            onClick={() => {
              onNavigateToPavement();
            }}
            className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-8 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
          >
            {/* Visual Layering representation */}
            <div className="space-y-3">
              {formData.pavementLayers.length > 0 ? (
                formData.pavementLayers.map((layer, index) => {
                  const colors = ['bg-slate-400', 'bg-slate-500', 'bg-slate-600', 'bg-slate-700', 'bg-slate-800'];
                  const colorClass = colors[index % colors.length];
                  const typeAbbr = layer.type.split('(')[0].trim();

                  return (
                    <div 
                      key={layer.id || index}
                      className={cn(
                        "relative h-16 w-full flex items-center justify-between px-6 rounded-2xl shadow-sm border border-white/10 overflow-hidden",
                        colorClass
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">LAYER {index + 1}</span>
                        <span className="font-black text-lg text-white leading-none">
                          {typeAbbr}
                        </span>
                        <span className="text-[10px] font-bold text-white/60 mt-1">
                          施作: {formatMonth(layer.month)}
                        </span>
                      </div>
                      
                      <div className="flex items-baseline gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                        <span className="text-xl font-black text-white">{layer.thickness.toFixed(1)}</span>
                        <span className="text-[10px] font-bold text-white/70">cm</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-32 w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 gap-2">
                  <Edit2 size={24} />
                  <span className="text-sm font-black uppercase tracking-widest">尚未設定鋪面層</span>
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TOTAL THICKNESS</span>
                <span className="text-xs font-bold text-slate-600">總設計厚度</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black text-blue-600 tracking-tighter">
                  {totalThickness.toFixed(1)} 
                </span>
                <span className="text-sm font-black text-blue-400 uppercase">cm</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notes & Previous History Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-6 bg-[#f59e0b] rounded-full"></span>
            <h2 className="font-extrabold text-lg tracking-tight">備註與歷史</h2>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">Prev Year 前次施工年份</label>
                <input 
                  type="text" 
                  value={formData.prevConstructionYear || ''}
                  onChange={(e) => handleChange({...formData, prevConstructionYear: e.target.value})}
                  placeholder="例如: 105"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#005fb8]/20 transition-all font-medium outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">Prev Depth 前次施工深度 (cm)</label>
                <input 
                  type="number" 
                  value={formData.prevConstructionDepth || ''}
                  onChange={(e) => handleChange({...formData, prevConstructionDepth: Number(e.target.value)})}
                  placeholder="例如: 12"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#005fb8]/20 transition-all font-medium outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">Notes 備註</label>
              <textarea 
                value={formData.notes || ''}
                onChange={(e) => handleChange({...formData, notes: e.target.value})}
                placeholder="輸入備註事項..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#005fb8]/20 transition-all font-medium outline-none resize-none"
              />
            </div>
          </div>
        </section>
      </main>
    </div>

      {/* Copy Pavement Modal */}
      {showCopyPavementModal && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={() => setShowCopyPavementModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-slate-900">複製鋪面斷面至</h3>
              <button onClick={() => setShowCopyPavementModal(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100">✕ 關閉</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">選擇要套用相同鋪面斷面的路段（同國道，排除當前路段）</p>

            {/* 同向其他車道快捷 */}
            {(() => {
              const sameDirOverlaps = allSegments.filter(s =>
                s.id !== formData.id &&
                s.highway === formData.highway &&
                s.direction === formData.direction &&
                s.startMileage < formData.endMileage &&
                s.endMileage > formData.startMileage
              );
              if (sameDirOverlaps.length === 0) return null;
              return (
                <div className="mb-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">同向其他車道</p>
                  {sameDirOverlaps.map(s => (
                    <label key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-blue-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#005fb8]"
                        checked={copyTargetIds.includes(s.id)}
                        onChange={e => setCopyTargetIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
                      />
                      <div>
                        <span className="font-bold text-sm text-slate-800 mr-2">{s.lanes[0]}</span>
                        <span className="text-xs text-slate-500">{s.direction === 'Northbound' || s.direction === 'Eastbound' ? '北上/東向' : '南下/西向'}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{Math.floor(s.startMileage/1000)}k+{String(s.startMileage%1000).padStart(3,'0')} ~ {Math.floor(s.endMileage/1000)}k+{String(s.endMileage%1000).padStart(3,'0')}</span>
                      </div>
                    </label>
                  ))}
                </div>
              );
            })()}

            {/* 對向同里程快捷 */}
            {(() => {
              const oppositeDir = ['Northbound', 'Eastbound'].includes(formData.direction)
                ? (['Southbound', 'Westbound'] as const)
                : (['Northbound', 'Eastbound'] as const);
              const opposites = allSegments.filter(s =>
                s.id !== formData.id &&
                s.highway === formData.highway &&
                oppositeDir.includes(s.direction as any) &&
                s.startMileage < formData.endMileage &&
                s.endMileage > formData.startMileage
              );
              if (opposites.length === 0) return null;
              return (
                <div className="mb-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">對向重疊路段</p>
                  {opposites.map(s => (
                    <label key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-emerald-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-600"
                        checked={copyTargetIds.includes(s.id)}
                        onChange={e => setCopyTargetIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
                      />
                      <div>
                        <span className="font-bold text-sm text-slate-800 mr-2">{s.lanes[0]}</span>
                        <span className="text-xs text-slate-500">{s.direction === 'Northbound' || s.direction === 'Eastbound' ? '北上/東向' : '南下/西向'}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{Math.floor(s.startMileage/1000)}k+{String(s.startMileage%1000).padStart(3,'0')} ~ {Math.floor(s.endMileage/1000)}k+{String(s.endMileage%1000).padStart(3,'0')}</span>
                      </div>
                    </label>
                  ))}
                </div>
              );
            })()}

            {/* 其他同國道路段 */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">其他同國道路段</p>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {allSegments
                  .filter(s => s.id !== formData.id && s.highway === formData.highway)
                  .map(s => (
                    <label key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#005fb8]"
                        checked={copyTargetIds.includes(s.id)}
                        onChange={e => setCopyTargetIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
                      />
                      <div>
                        <span className="font-bold text-sm text-slate-800 mr-2">{s.lanes[0]}</span>
                        <span className="text-xs text-slate-500">{s.direction === 'Northbound' || s.direction === 'Eastbound' ? '北上/東向' : '南下/西向'}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{Math.floor(s.startMileage/1000)}k+{String(s.startMileage%1000).padStart(3,'0')} ~ {Math.floor(s.endMileage/1000)}k+{String(s.endMileage%1000).padStart(3,'0')}</span>
                      </div>
                    </label>
                  ))}
                {allSegments.filter(s => s.id !== formData.id && s.highway === formData.highway).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">無其他同國道路段</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowCopyPavementModal(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">取消</button>
              <button
                disabled={copyTargetIds.length === 0}
                onClick={() => {
                  if (onCopyPavement) onCopyPavement(copyTargetIds, formData.pavementLayers);
                  setShowCopyPavementModal(false);
                  setCopyTargetIds([]);
                }}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                套用至 {copyTargetIds.length} 個路段
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        title="確定要刪除此路段嗎？"
        message="此操作無法復原，該路段資料將被永久移除。"
        type="danger"
        onConfirm={() => {
          if (segment && onDelete) onDelete(segment.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
