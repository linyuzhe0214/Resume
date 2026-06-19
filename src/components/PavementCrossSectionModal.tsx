import React from 'react';
import { X, Layers } from 'lucide-react';
import { formatMonth } from '../utils/pavement';
import { cn } from '../App';
import type { Segment, RampSegment } from '../types';

interface PavementCrossSectionModalProps {
  segment: Segment | RampSegment | null;
  onClose: () => void;
}

export default function PavementCrossSectionModal({ segment, onClose }: PavementCrossSectionModalProps) {
  if (!segment) return null;

  const totalThickness = segment.pavementLayers?.reduce((sum, layer) => sum + layer.thickness, 0) || 0;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div 
        className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-[#005fb8] p-2 rounded-xl shadow-sm">
              <Layers size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-black text-lg text-slate-900 leading-tight">鋪面斷面圖說</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pavement Cross-section</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8 max-h-[60vh] overflow-y-auto customize-scrollbar">
          <div className="space-y-3">
            {segment.pavementLayers && segment.pavementLayers.length > 0 ? (
              segment.pavementLayers.map((layer, index) => {
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
                <span className="text-sm font-black uppercase tracking-widest">無鋪面層資料</span>
              </div>
            )}
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TOTAL THICKNESS</span>
              <span className="text-xs font-bold text-slate-600">總設計厚度</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-[#005fb8] tracking-tighter">
                {totalThickness.toFixed(1)} 
              </span>
              <span className="text-sm font-black text-[#005fb8]/60 uppercase">cm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
