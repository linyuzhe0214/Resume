import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Calendar, ChevronDown, Trash2 } from 'lucide-react';
import { RampSegment } from '../types';
import { cn } from '../App';
import ConfirmDialog from './ConfirmDialog';

interface EditRampHistoryProps {
  segment?: RampSegment;
  availableRamps?: RampSegment[];
  onChange: (segment: RampSegment) => void;
  onSave: (segment: RampSegment) => void;
  onDelete?: (id: string) => void;
  onBack: () => void;
  onNavigateToPavement: () => void;
}

export default function EditRampHistory({ segment, availableRamps, onChange, onSave, onDelete, onBack, onNavigateToPavement }: EditRampHistoryProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<RampSegment>(segment || {
    id: '',
    highway: '',
    interchange: '',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '',
    constructionMonth: '',
    startMileage: 0,
    endMileage: 0,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [],
    rampId: '',
    rampName: '',
    rampNo: '',
    laneCount: 1,
    length: 0,
    status: 'Optimal'
  });

  useEffect(() => {
    if (segment) setFormData(segment);
  }, [segment]);

  const handleChange = (newData: RampSegment) => {
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e] pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 h-16 shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-[#005fb8] hover:bg-black/5 p-2 rounded-full active:scale-95 duration-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-black text-lg tracking-tight text-[#00488d]">施工履歷編輯</h1>
        </div>
        <div className="flex items-center gap-2">
          {segment && onDelete && (
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors active:scale-95 duration-150"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => onSave(formData)}
            className="text-[#005fb8] font-black text-lg tracking-tight haptic-feedback px-4 py-1"
          >
            儲存
          </button>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        {/* Construction History Details */}
        <section className="space-y-3">
          <h2 className="font-black text-sm uppercase tracking-wider text-slate-500 ml-2">施工履歷內容</h2>
          <div className="bg-white p-6 rounded-2xl space-y-5 shadow-sm border border-slate-100">
            {/* Ramp Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400 font-sans">匝道編碼 (RAMP ID)</label>
              <div className="relative">
                <select
                  className="w-full bg-slate-50 border-none h-12 px-4 pr-10 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800 appearance-none"
                  value={formData.rampId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const rampTemplate = availableRamps?.find(r => r.rampId === selectedId);
                    if (rampTemplate) {
                      handleChange({
                        ...formData, 
                        rampId: selectedId,
                        rampName: rampTemplate.rampName,
                        rampNo: rampTemplate.rampNo,
                        laneCount: rampTemplate.laneCount,
                        length: rampTemplate.length,
                        highway: rampTemplate.highway,
                        interchange: rampTemplate.interchange
                      });
                    } else {
                      handleChange({...formData, rampId: selectedId});
                    }
                  }}
                >
                  <option value="" disabled>請選擇匝道編碼</option>
                  {(() => {
                    const detailedIds = availableRamps?.map(r => r.rampId) || [];
                    // Merge with any IDs already in history that might not be in detailed data
                    const historyIds = segment && segment.rampId ? [segment.rampId] : []; 
                    const allIds = Array.from(new Set([...detailedIds, ...historyIds])).filter(Boolean);
                    return allIds.map(id => (
                      <option key={id} value={id}>{id}</option>
                    ));
                  })()}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Property */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">屬性 (PROPERTY)</label>
              <div className="flex gap-2">
                {['路堤', '橋梁'].map((p) => (
                  <button
                    key={p}
                    onClick={() => handleChange({...formData, property: p})}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                      formData.property === p 
                        ? "bg-[#00488d] text-white shadow-md shadow-blue-900/20" 
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Lane Count */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">車道數 (LANE COUNT)</label>
              <input 
                className="w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800" 
                type="number" 
                value={formData.laneCount}
                onChange={(e) => handleChange({...formData, laneCount: Number(e.target.value)})}
              />
            </div>

            {/* Mileage */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">起始里程 (START m)</label>
                  <input 
                    className="w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800" 
                    type="number" 
                    min={0}
                    max={formData.length}
                    value={formData.startMileage}
                    onChange={(e) => handleChange({...formData, startMileage: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">終點里程 (END m)</label>
                  <input 
                    className="w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800" 
                    type="number" 
                    min={0}
                    max={formData.length}
                    value={formData.endMileage}
                    onChange={(e) => handleChange({...formData, endMileage: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              {/* Position Preview Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 px-1">
                  <span>0m</span>
                  <span>匝道總長: {formData.length}m</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200 shadow-inner">
                  <div 
                    className="absolute h-full bg-[#00488d] rounded-full transition-all duration-300 shadow-sm"
                    style={{ 
                      left: `${Math.max(0, Math.min(100, (formData.startMileage / formData.length) * 100))}%`,
                      width: `${Math.max(0, Math.min(100, ((formData.endMileage - formData.startMileage) / formData.length) * 100))}%`
                    }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 italic text-center">藍色區塊代表此段施工在匝道中的位置</p>
              </div>
            </div>

            {/* Completion Time */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">完工時間 (COMPLETION TIME)</label>
              <div className="relative">
                <input 
                  className="w-full bg-slate-50 border-none h-12 px-4 pr-10 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800" 
                  type="month" 
                  value={(() => {
                    if (!formData.completionTime) return '';
                    const parts = formData.completionTime.split('/');
                    if (parts.length < 2) return '';
                    const year = Number(parts[0]) + 1911;
                    const month = parts[1].padStart(2, '0');
                    return `${year}-${month}`;
                  })()}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    if (year && month) {
                      const minguoYear = Number(year) - 1911;
                      const newCompletionTime = `${minguoYear}/${month}`;
                      const newCompMonth = `${minguoYear}${month}`;
                      const oldCompMonth = formData.completionTime ? formData.completionTime.replace('/', '') : '';
                      
                      // Update layers that matched the old completion time to the new one
                      const updatedLayers = formData.pavementLayers.map(layer => 
                        layer.month === oldCompMonth ? { ...layer, month: newCompMonth } : layer
                      );
                      
                      handleChange({
                        ...formData, 
                        completionTime: newCompletionTime,
                        pavementLayers: updatedLayers
                      });
                    }
                  }}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-[9px] text-slate-400 italic pl-1">完工時間精確到月份</p>
            </div>

            {/* Pavement Cross-Section Visualization */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#005fb8] rounded-sm"></div>
                  <h2 className="font-bold text-lg text-slate-800">Pavement Cross-section (鋪面斷面圖說)</h2>
                </div>
                <button 
                  onClick={onNavigateToPavement}
                  className="text-[#005fb8] font-bold text-sm flex items-center gap-1 hover:underline"
                >
                  調整斷面 <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div 
                onClick={onNavigateToPavement}
                className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 space-y-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  {formData.pavementLayers.length > 0 ? (
                    formData.pavementLayers.map((layer, index) => {
                      const compMonth = formData.completionTime ? formData.completionTime.replace('/', '') : '';
                      const isCurrent = layer.month === compMonth;
                      
                      const colors = ['#8ba1b5', '#5c7089', '#4a5a6e', '#374354', '#2c3643'];
                      const color = colors[index % colors.length];
                      const typeAbbr = layer.type.split('(')[0].trim();
                      const displayType = typeAbbr;

                      return (
                        <div 
                          key={layer.id || index}
                          className={cn(
                            "relative h-14 w-full flex items-center justify-center px-4 rounded-xl shadow-sm transition-all",
                            isCurrent && "ring-4 ring-[#005fb8]/30 z-10"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          <span className="font-bold text-base tracking-wider text-white">
                            {layer.thickness.toFixed(1)}cm {displayType}
                          </span>
                          
                          <div className="absolute right-3 bg-white/20 backdrop-blur-sm rounded px-2 py-1 flex items-center">
                            <span className="text-xs font-medium text-white">
                              施工: {layer.month}
                            </span>
                          </div>

                          {isCurrent && (
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-[#005fb8] rounded-full shadow-md"></div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-28 w-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 font-bold">
                      尚未設定鋪面層
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-end justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">TOTAL THICKNESS 總厚度</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[#00488d] tracking-tighter">
                      {formData.pavementLayers.reduce((acc, curr) => acc + curr.thickness, 0).toFixed(1)}
                    </span>
                    <span className="text-lg font-bold text-[#00488d]">cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">備註 (REMARKS)</label>
              <textarea 
                className="w-full bg-slate-50 border-none p-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-bold text-slate-800 placeholder:text-slate-300 text-sm leading-relaxed resize-none" 
                placeholder="輸入備註事項..." 
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => handleChange({...formData, notes: e.target.value})}
              />
            </div>
          </div>
        </section>
      </main>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        title="確定要刪除此施工履歷嗎？"
        message="此操作無法復原，該施工履歷資料將被永久移除。"
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
