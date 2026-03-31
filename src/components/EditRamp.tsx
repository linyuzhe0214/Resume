import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Trash2, Lock, Unlock, ChevronDown } from 'lucide-react';
import { HIGHWAY_INTERCHANGE_MAP } from '../constants';
import { RampSegment } from '../types';
import { cn } from '../App';
import ConfirmDialog from './ConfirmDialog';
import MileageInput from './MileageInput';

interface EditRampProps {
  segment?: RampSegment;
  onChange: (segment: RampSegment) => void;
  onSave: (segment: RampSegment) => void;
  onDelete?: (id: string) => void;
  onBack: () => void;
  onNavigateToPavement: () => void;
}

export default function EditRamp({ segment, onChange, onSave, onDelete, onBack, onNavigateToPavement }: EditRampProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lockLength, setLockLength] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RampSegment>(segment || {
    id: '',
    highway: '國道3號',
    interchange: '中興系統',
    property: '路堤',
    laneCategory: '一般路段',
    constructionYear: '113',
    constructionMonth: '08',
    startMileage: 0,
    endMileage: 670,
    direction: 'Southbound',
    lanes: ['第一車道'],
    pavementLayers: [],
    rampId: 'R-045-22',
    rampName: '國道3號-中興系統',
    rampNo: '匝道二',
    laneCount: 2,
    length: 670,
    status: 'Optimal'
  });

  useEffect(() => {
    if (segment) setFormData(segment);
  }, [segment]);

  const handleChange = (newData: RampSegment) => {
    // Validation
    if (newData.startMileage > newData.endMileage) {
      setError('起點里程不可大於終點里程');
    } else {
      setError(null);
    }
    // Sync length
    newData.length = newData.endMileage - newData.startMileage;
    
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

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e] pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 h-16 shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-[#005fb8] hover:bg-black/5 p-2 rounded-full active:scale-95 duration-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-black text-lg tracking-tight text-[#00488d]">匝道資料編輯 - 功能優化版</h1>
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
        {/* Basic Path Info Section */}
        <section className="space-y-3">
          <h2 className="font-black text-sm uppercase tracking-wider text-slate-500 ml-2">匝道詳細資料</h2>
          <div className="bg-white p-6 rounded-2xl space-y-5 shadow-sm border border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">國道選擇</label>
                <div className="relative">
                  <select 
                    value={formData.highway}
                    onChange={(e) => {
                      const highway = e.target.value;
                      const interchanges = HIGHWAY_INTERCHANGE_MAP[highway] || [];
                      handleChange({ ...formData, highway, interchange: interchanges[0] || '' });
                    }}
                    className="appearance-none w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800 pr-10"
                  >
                    {Object.keys(HIGHWAY_INTERCHANGE_MAP).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">交流道選擇</label>
                <div className="relative">
                  <select 
                    value={formData.interchange}
                    onChange={(e) => handleChange({...formData, interchange: e.target.value})}
                    className="appearance-none w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800 pr-10"
                  >
                    {(HIGHWAY_INTERCHANGE_MAP[formData.highway] || []).map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">匝道名稱 (RAMP NAME)</label>
              <input 
                className="w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800" 
                type="text" 
                value={formData.rampName}
                onChange={(e) => handleChange({...formData, rampName: e.target.value})}
                placeholder="例如: 國道3號-中興系統"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">匝道編碼 (RAMP ID)</label>
              <input 
                className="w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-[#00488d]" 
                type="text" 
                value={formData.rampId}
                onChange={(e) => handleChange({...formData, rampId: e.target.value})}
                placeholder="例如: R-045-22"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">匝道長度 (LENGTH m)</label>
              <div className="relative">
                <input 
                  className="w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800" 
                  type="number" 
                  value={formData.length}
                  onChange={(e) => {
                    const newLength = Number(e.target.value);
                    handleChange({...formData, length: newLength});
                  }}
                  placeholder="例如: 670"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                  公尺 (m)
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.05rem] text-slate-400">匝環道名稱 (RAMP NO.)</label>
              <input 
                className="w-full bg-slate-50 border-none h-12 px-4 rounded-xl focus:ring-2 focus:ring-[#005fb8]/20 font-black text-slate-800" 
                type="text" 
                value={formData.rampNo}
                onChange={(e) => handleChange({...formData, rampNo: e.target.value})}
                placeholder="例如: 匝道二"
              />
            </div>

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

        {/* Pavement Section Details Section - Removed in Optimizer Version */}

      </main>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        title="確定要刪除此匝道資料嗎？"
        message="此操作無法復原，該匝道資料將被永久移除。"
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
