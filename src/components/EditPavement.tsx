import React, { useState } from 'react';
import { ArrowLeft, Trash2, ChevronDown, Plus, Layers } from 'lucide-react';
import { PavementLayer } from '../types';
import { cn } from '../App';

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

  const handleAddLayer = () => {
    const newLayer: PavementLayer = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'DGAC (密級配瀝青混凝土)',
      thickness: 5.0,
      month: defaultMonth || '11305'
    };
    setLayers([...layers, newLayer]);
  };

  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e] pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 h-16 shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-[#005fb8] hover:bg-black/5 p-2 rounded-full active:scale-95 duration-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-black text-lg tracking-tight">匝道鋪面編輯</h1>
        </div>
        <button 
          onClick={() => onSave(layers)}
          className="text-[#005fb8] font-black text-lg tracking-tight haptic-feedback px-4 py-1"
        >
          儲存
        </button>
      </header>

      <main className="pt-24 px-6 max-w-md md:max-w-2xl mx-auto space-y-6 md:space-y-8">
        {/* Stats Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-start border-l-4 border-[#005fb8]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">總厚度 (CM)</span>
            <span className="font-black text-3xl text-slate-900 tracking-tighter">{totalThickness.toFixed(1)}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-start border-l-4 border-[#005412]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">圖層總數</span>
            <span className="font-black text-3xl text-slate-900 tracking-tighter">{String(layers.length).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Layer List Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="font-black text-xl text-slate-900">斷面結構配置</h2>
          <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded font-black tracking-widest uppercase">SENTINEL VIEW</span>
        </div>

        {/* Layer Cards */}
        <div className="space-y-4">
          {layers.map((layer, index) => (
            <div key={layer.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <div className="flex items-center justify-between px-6 py-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#005fb8]" />
                  <span className="font-black text-sm tracking-tight">Layer {String(index + 1).padStart(2, '0')}</span>
                </div>
                <button 
                  onClick={() => handleDeleteLayer(layer.id)}
                  className="text-rose-400 hover:text-rose-600 active:scale-90 transition-all p-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
                      <option value="Sub-base (路基/底層)">Sub-base (路基/底層)</option>
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
                          {Array.from({length: 60}, (_, i) => 125 - i).map(y => (
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
