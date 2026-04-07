import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Calendar, Edit2, Trash2, Lock, Unlock } from 'lucide-react';
import { Segment } from '../types';
import { cn } from '../App';
import ConfirmDialog from './ConfirmDialog';
import { parseMileage, formatMileage } from '../utils/mileage';
import MileageInput from './MileageInput';

interface EditSegmentProps {
  segment?: Segment;
  isPlanning?: boolean;
  laneOptions?: string[];
  onChange: (segment: Segment) => void;
  onSave: (segment: Segment) => void;
  onDelete?: (id: string) => void;
  onMoveToPlanning?: (segment: Segment) => void;
  onBack: () => void;
  onNavigateToPavement: () => void;
}

export default function EditSegment({ segment, isPlanning, laneOptions = [], onChange, onSave, onDelete, onMoveToPlanning, onBack, onNavigateToPavement }: EditSegmentProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lockLength, setLockLength] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Segment>(segment || {
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
    pavementLayers: []
  });

  useEffect(() => {
    if (segment) {
      setFormData(segment);
    }
  }, [segment]);

  const handleChange = (newData: Segment) => {
    // Validation
    if (newData.startMileage > newData.endMileage) {
      setError('起點里程不可大於終點里程');
    } else {
      setError(null);
    }
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
    onSave(formData);
  };

  const totalThickness = formData.pavementLayers.reduce((sum, layer) => sum + layer.thickness, 0);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e] pb-32">
      {/* TopAppBar */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm flex items-center justify-between px-6 h-16 w-full">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors active:scale-95 duration-150">
            <ArrowLeft className="w-6 h-6 text-[#005FB8]" />
          </button>
          <h1 className="font-bold text-xl tracking-tight">{segment ? '編輯路段' : '新增路段'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {segment && !isPlanning && onMoveToPlanning && (
            <button 
              onClick={() => onMoveToPlanning(formData)} 
              className="text-[#005FB8] bg-[#005FB8]/10 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 duration-150 hover:bg-[#005FB8]/20"
            >
              移至整修規劃
            </button>
          )}
          {segment && onDelete && (
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors active:scale-95 duration-150"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={handleSave} className="bg-[#00488d] text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm active:scale-95 duration-150 hover:bg-[#003d7a]">
            儲存
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Basic Path Info Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-6 bg-[#00488d] rounded-full"></span>
            <h2 className="font-extrabold text-lg tracking-tight">基本路徑資訊</h2>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-5 border border-slate-100">
            {/* Highway Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">Highway 國道</label>
              <div className="relative">
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
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:ring-2 focus:ring-[#005fb8]/20 transition-all font-medium outline-none"
                >
                  <option value="國道1號">國道1號</option>
                  <option value="國道3號">國道3號</option>
                  <option value="國道4號">國道4號</option>
                </select>
                <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* Property Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">Property 屬性</label>
              <div className="relative">
                <select 
                  value={formData.property}
                  onChange={(e) => handleChange({...formData, property: e.target.value})}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:ring-2 focus:ring-[#005fb8]/20 transition-all font-medium outline-none"
                >
                  <option value="路堤">路堤</option>
                  <option value="橋梁">橋梁</option>
                  <option value="隧道">隧道</option>
                </select>
                <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* Lane Category Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">Lane Category 車道別</label>
              <div className="relative">
                <select 
                  value={formData.lanes[0] || ''}
                  onChange={(e) => handleChange({...formData, lanes: [e.target.value]})}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 focus:ring-2 focus:ring-[#005fb8]/20 transition-all font-medium outline-none"
                >
                  <option value="" disabled>選擇車道名稱</option>
                  {laneOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
              <label className="text-[10px] font-bold uppercase tracking-[0.05rem] text-slate-500 ml-1">End Date 結束日期</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="month" 
                  value={`${Number(formData.constructionYear) + 1911}-${formData.constructionMonth}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    if (year && month) {
                      handleChange({
                        ...formData,
                        constructionYear: (Number(year) - 1911).toString(),
                        constructionMonth: month
                      });
                    }
                  }}
                  className="bg-transparent outline-none w-full"
                />
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
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-top-1">
                ⚠️ {error}
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
            <button 
              onClick={onNavigateToPavement}
              className="text-[#005fb8] font-bold text-sm flex items-center gap-1 hover:underline"
            >
              調整斷面 <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div 
            onClick={() => {
              onNavigateToPavement();
            }}
            className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 space-y-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            {/* Visual Layering representation */}
            <div className="space-y-2">
              {formData.pavementLayers.length > 0 ? (
                formData.pavementLayers.map((layer, index) => {
                  const colors = ['#8ba1b5', '#5c7089', '#4a5a6e', '#374354', '#2c3643'];
                  const color = colors[index % colors.length];
                  const typeAbbr = layer.type.split('(')[0].trim();
                  const displayType = typeAbbr;

                  return (
                    <div 
                      key={layer.id || index}
                      className="relative h-14 w-full flex items-center justify-center px-4 rounded-xl shadow-sm transition-all"
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
                  {totalThickness.toFixed(1)} 
                </span>
                <span className="text-lg font-bold text-[#00488d]">cm</span>
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
