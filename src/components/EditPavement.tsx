import React, { useState } from 'react';
import { ArrowLeft, Trash2, ChevronDown, Plus, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { PavementLayer } from '../types';
import { cn } from '../App';
import { generateId } from '../utils/ramp';

interface EditPavementProps {
  layers: PavementLayer[];
  defaultMonth?: string;
  onSave: (layers: PavementLayer[]) => void;
  onBack: () => void;
}

export default function EditPavement({ layers: initialLayers, defaultMonth, onSave, onBack }: EditPavementProps) {
  const [layers, setLayers] = useState<PavementLayer[]>(initialLayers);

  const handleLayerChange = (id: string, field: keyof PavementLayer, value: any) => {
    setLayers(layers.map(layer => layer.id === id ? { ...layer, [field]: value } : layer));
  };

  const handleDeleteLayer = (id: string) => {
    setLayers(layers.filter(layer => layer.id !== id));
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const newLayers = [...layers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
    setLayers(newLayers);
  };

  const handleAddLayer = () => {
    const newLayer: PavementLayer = {
      id: generateId(),
      type: 'DGAC (密級配瀝青混凝土)',
      thickness: 5.0,
      month: defaultMonth || '11305'
    };
    setLayers([...layers, newLayer]);
  };

  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-36 font-sans">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 h-16 shadow-xs border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-90 duration-150 transition-all border border-slate-200/60 shadow-2xs"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="font-black text-base sm:text-lg tracking-tight text-slate-900 leading-tight">鋪面結構編輯</h1>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">PAVEMENT LAYER STRUCTURE</span>
          </div>
        </div>
        <button 
          onClick={() => onSave(layers)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm tracking-wide px-5 py-2.5 rounded-2xl shadow-md shadow-blue-600/25 active:scale-95 transition-all"
        >
          儲存結構
        </button>
      </header>

      <main className="pt-24 px-4 sm:px-6 max-w-md md:max-w-2xl mx-auto space-y-6 md:space-y-7">
        {/* Stats Bento Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-start relative overflow-hidden group">
            <div className="w-1.5 h-full bg-blue-600 absolute left-0 top-0 rounded-l-2xl" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">總厚度 (CM)</span>
            <span className="font-mono font-black text-3xl text-slate-900 tracking-tight ml-1">{totalThickness.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-blue-600 ml-1 mt-0.5">設計總深</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col items-start relative overflow-hidden group">
            <div className="w-1.5 h-full bg-emerald-600 absolute left-0 top-0 rounded-l-2xl" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 ml-1">圖層總數</span>
            <span className="font-mono font-black text-3xl text-slate-900 tracking-tight ml-1">{String(layers.length).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-emerald-600 ml-1 mt-0.5">結構層數</span>
          </div>
        </div>

        {/* Layer List Header */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            斷面結構配置
          </h2>
          <span className="bg-blue-50 text-blue-700 text-[10px] px-2.5 py-1 rounded-full font-black tracking-wider uppercase border border-blue-100">
            STRUCTURE
          </span>
        </div>

        {/* Layer Cards */}
        <div className="space-y-3.5">
          {layers.map((layer, index) => (
            <div key={layer.id} className="bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200/80 transition-all hover:shadow-md">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-black text-xs sm:text-sm tracking-tight text-slate-800">
                    Layer {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveLayer(index, 'up')}
                    disabled={index === 0}
                    className="text-slate-400 hover:text-blue-600 active:scale-90 transition-all p-1.5 rounded-lg hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed"
                    title="上移"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveLayer(index, 'down')}
                    disabled={index === layers.length - 1}
                    className="text-slate-400 hover:text-blue-600 active:scale-90 transition-all p-1.5 rounded-lg hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed"
                    title="下移"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteLayer(layer.id)}
                    className="text-slate-400 hover:text-rose-600 active:scale-90 transition-all p-1.5 rounded-lg hover:bg-rose-50 ml-1"
                    title="刪除圖層"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">種類 TYPE</label>
                  <div className="relative">
                    <select 
                      value={layer.type}
                      onChange={(e) => handleLayerChange(layer.id, 'type', e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-slate-800 font-bold focus:ring-2 focus:ring-[#005fb8]/20 appearance-none"
                    >
                      <option value="PAC (多孔隙瀝青混凝土)">PAC (多孔隙瀝青混凝土)</option>
                      <option value="DGAC (密級配瀝青混凝土)">DGAC (密級配瀝青混凝土)</option>
                      <option value="OGAC (開級配瀝青混凝土)">OGAC (開級配瀝青混凝土)</option>
                      <option value="SMA (石膠泥瀝青混凝土)">SMA (石膠泥瀝青混凝土)</option>
                      <option value="GUSS (澆注式瀝青混凝土)">GUSS (澆注式瀝青混凝土)</option>
                      <option value="BTB (瀝青處理底層)">BTB (瀝青處理底層)</option>
                      <option value="AB (碎石級配底層)">AB (碎石級配底層)</option>
                      <option value="Sub-base (基層)">Sub-base (基層)</option>
                      <option value="其他/舊有">其他/舊有</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">厚度 THICKNESS (CM)</label>
                    <input 
                      className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-slate-800 font-black focus:ring-2 focus:ring-[#005fb8]/20" 
                      type="number" 
                      value={layer.thickness}
                      onChange={(e) => handleLayerChange(layer.id, 'thickness', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">施作月份 MONTH (民國年月)</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <select 
                          className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-slate-800 font-bold focus:ring-2 focus:ring-[#005fb8]/20 appearance-none" 
                          value={layer.month.substring(0, 3)}
                          onChange={(e) => {
                            const year = e.target.value.padStart(3, '0');
                            const month = layer.month.substring(3, 5);
                            handleLayerChange(layer.id, 'month', `${year}${month}`);
                          }}
                        >
                          <option value="" disabled>年份</option>
                          {Array.from({length: new Date().getFullYear() - 1911 + 5 - 67 + 1}, (_, i) => new Date().getFullYear() - 1911 + 5 - i).map(y => (
                            <option key={y} value={y.toString().padStart(3, '0')}>{y}</option>
                          ))}
                        </select>
                        <span className="absolute right-7 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">年</span>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="flex-1 relative">
                        <select 
                          className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-slate-800 font-bold focus:ring-2 focus:ring-[#005fb8]/20 appearance-none" 
                          value={layer.month.substring(3, 5)}
                          onChange={(e) => {
                            const year = layer.month.substring(0, 3);
                            const monthStr = e.target.value;
                            handleLayerChange(layer.id, 'month', `${year}${monthStr}`);
                          }}
                        >
                          <option value="" disabled>月份</option>
                          {Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <span className="absolute right-7 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">月</span>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Button */}
          <button 
            onClick={handleAddLayer}
            className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-[#005fb8]/30 transition-all active:scale-[0.98] group"
          >
            <Plus className="w-5 h-5 text-slate-300 group-hover:text-[#005fb8]" />
            <span className="font-black tracking-tight group-hover:text-[#005fb8]">新增圖層結構</span>
          </button>
        </div>
      </main>
    </div>
  );
}
