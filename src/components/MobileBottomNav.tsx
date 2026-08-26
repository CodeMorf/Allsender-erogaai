import React from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  LayoutDashboard, 
  Receipt, 
  Camera, 
  PieChart, 
  Menu,
  Sparkles
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeView, setActiveView, openScanner, toggleMobileDrawer, isMobileDrawerOpen } = useApp();

  return (
    <nav 
      id="mobile-bottom-navigation"
      aria-label="Navegación Móvil Principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 text-slate-400 px-2 py-1.5 shadow-2xl safe-area-bottom"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Inicio */}
        <button
          id="btn-mob-nav-home"
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeView === 'dashboard' && !isMobileDrawerOpen
              ? 'text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-5 h-5" />
            {activeView === 'dashboard' && !isMobileDrawerOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Inicio</span>
        </button>

        {/* 2. Facturas */}
        <button
          id="btn-mob-nav-expenses"
          onClick={() => setActiveView('expenses')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeView === 'expenses' && !isMobileDrawerOpen
              ? 'text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Receipt className="w-5 h-5" />
            {activeView === 'expenses' && !isMobileDrawerOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Facturas</span>
        </button>

        {/* 3. CENTER ACTION: Escanear Comprobante (Floating Native Camera Action) */}
        <div className="relative -top-4 flex flex-col items-center">
          <button
            id="btn-mob-nav-scan"
            onClick={() => openScanner()}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 border-4 border-slate-900 active:scale-90 hover:scale-105 transition-all cursor-pointer group"
            title="Escanear Factura / Comprobante Fiscal DGII"
          >
            <Camera className="w-6 h-6 text-white group-hover:rotate-6 transition-transform" />
          </button>
          <span className="text-[10px] font-bold text-blue-400 mt-0.5 tracking-tight flex items-center gap-0.5">
            Escanear
          </span>
        </div>

        {/* 4. Costos & Reportes */}
        <button
          id="btn-mob-nav-costs"
          onClick={() => setActiveView('cost-consolidation')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            (activeView === 'cost-consolidation' || activeView === 'dgii-606') && !isMobileDrawerOpen
              ? 'text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <PieChart className="w-5 h-5" />
            {(activeView === 'cost-consolidation' || activeView === 'dgii-606') && !isMobileDrawerOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Costos</span>
        </button>

        {/* 5. Menú / Más */}
        <button
          id="btn-mob-nav-menu"
          onClick={() => toggleMobileDrawer()}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isMobileDrawerOpen
              ? 'text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {isMobileDrawerOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Menú</span>
        </button>
      </div>
    </nav>
  );
};
