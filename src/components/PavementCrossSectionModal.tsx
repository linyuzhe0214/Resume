import React from 'react';
import { X, Layers, Sparkles } from 'lucide-react';
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

  // Realistic pavement layer tone palette
  const layerGradients = [
    'from-slate-700 to-slate-800 border-slate-600/40',
    'from-slate-600 to-slate-700 border-slate-500/40',
    'from-slate-500 to-slate-600 border-slate-400/40',
    'from-stone-600 to-stone-700 border-stone-500/40',
    'from-zinc-600 to-zinc-700 border-zinc-500/40',
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md anim-fade-scale" 
        onClick={onClose} 
      />
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 anim-slide-up overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-md shadow-blue-500/20 text-white">
              <Layers size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-black text-lg text-slate-900 leading-tight">鋪面斷面圖說</h3>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">PAVEMENT CROSS-SECTION</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-6 max-h-[65vh] overflow-y-auto customize-scrollbar">
          <div className="space-y-3">
            {segment.pavementLayers && segment.pavementLayers.length > 0 ? (
              segment.pavementLayers.map((layer, index) => {
                const gradientClass = layerGradients[index % layerGradients.length];
                const typeAbbr = layer.type.split('(')[0].trim();

                return (
                  <div 
                    key={layer.id || index}
                    className={cn(
                      "relative h-20 w-full flex items-center justify-between px-5 rounded-2xl shadow-sm border bg-gradient-to-r text-white transition-all hover:scale-[1.01] hover:shadow-md",
                      gradientClass
                    )}
                  >
                    <div className="flex flex-col z-10">
                      <span className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">
                        LAYER {index + 1}
                      </span>
                      <span className="font-black text-base sm:text-lg text-white leading-tight drop-shadow-sm">
                        {typeAbbr}
                      </span>
                      <span className="text-[11px] font-bold text-white/70 mt-1 font-mono">
                        施作: {formatMonth(layer.month)}
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-1 bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-inner z-10">
                      <span className="text-2xl font-mono font-black text-white">{layer.thickness.toFixed(1)}</span>
                      <span className="text-xs font-bold text-white/70">cm</span>
                    </div>

                    {/* Subtle road texture dots */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />
                  </div>
                );
              })
            ) : (
              <div className="h-32 w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 gap-2 bg-slate-50/50">
                <span className="text-sm font-black tracking-wide">無鋪面層資料</span>
              </div>
            )}
          </div>
          
          {/* Total Thickness Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 -mx-6 sm:-mx-7 -mb-6 sm:-mb-7 p-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TOTAL THICKNESS</span>
              <span className="text-xs font-bold text-slate-700">總設計厚度</span>
            </div>
            <div className="flex items-baseline gap-1.5 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl">
              <span className="text-3xl font-mono font-black text-blue-600 tracking-tight">
                {totalThickness.toFixed(1)} 
              </span>
              <span className="text-xs font-black text-blue-500 uppercase">cm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
