import React from 'react';
import { Route as RouteIcon, Split, HardHat, Layers } from 'lucide-react';
import { cn } from '../../utils/utils';
import { Link, useLocation, Outlet } from 'react-router-dom';

interface MainLayoutProps {
  overlays: React.ReactNode;
}

export function MainLayout({ overlays }: MainLayoutProps) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Outlet />

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:rounded-full md:px-3 md:py-2 flex justify-around md:justify-center md:gap-2 items-center px-2 pb-6 pt-3 md:pb-2 bg-white/90 md:bg-white/80 backdrop-blur-xl border-t md:border border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:shadow-2xl z-[100] rounded-t-3xl transition-all">
        <Link 
          to="/"
          className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", path === '/' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}
        >
          <Layers className="w-6 h-6 md:w-5 md:h-5" />
          <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">路面資料</span>
        </Link>
        <Link 
          to="/mainline"
          className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", path === '/mainline' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}
        >
          <RouteIcon className="w-6 h-6 md:w-5 md:h-5" />
          <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">主線履歷</span>
        </Link>
        <Link 
          to="/ramp"
          className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", path === '/ramp' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}
        >
          <Split className="w-6 h-6 md:w-5 md:h-5" />
          <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">匝道履歷</span>
        </Link>
        <Link 
          to="/planning"
          className={cn("flex flex-col md:flex-row md:gap-2 items-center justify-center rounded-xl md:rounded-full px-4 py-2 active:scale-95 transition-all cursor-pointer", path === '/planning' ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}
        >
          <HardHat className="w-6 h-6 md:w-5 md:h-5" />
          <span className="text-[11px] md:text-xs font-bold tracking-wider uppercase mt-1 md:mt-0">整修規劃</span>
        </Link>
      </footer>

      {overlays}
    </div>
  );
}
