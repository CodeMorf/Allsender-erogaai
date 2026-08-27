import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { usePWA } from '../context/PWAContext.js';
import { RoleType, AppPortal } from '../types.js';
import { 
  Camera, 
  Sun, 
  Moon, 
  Building, 
  MapPin, 
  ChevronDown, 
  ChevronRight, 
  UserCheck,
  Bell,
  ShieldAlert,
  Settings,
  LogOut,
  Sparkles,
  PieChart,
  FolderTree,
  FileText,
  Download,
  Smartphone,
  Menu
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    portal,
    setPortal,
    activeView, 
    organization, 
    companies, 
    branches, 
    currentCompany, 
    currentBranch, 
    setCurrentCompany, 
    setCurrentBranch,
    currentUser, 
    setUserRole, 
    openScanner,
    expenses,
    toggleMobileDrawer
  } = useApp();

  const { theme, setTheme } = useTheme();
  const { isInstallable, isInstalled, isIOS, promptInstall, setShowInstallModal } = usePWA();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(event.target as Node)) {
        setIsBranchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbTitle = () => {
    if (portal === 'super-admin') {
      return 'Super Administrador SaaS';
    }
    switch (activeView) {
      case 'dashboard': return 'Panel Principal';
      case 'expenses': return 'Erogaciones & Facturas';
      case 'cost-consolidation': return 'Consolidación de Costos';
      case 'categories': return 'Categorías de Gastos';
      case 'dgii-606': return 'Reporte Fiscal DGII 606';
      case 'organization': return 'Mi Empresa y Sedes';
      case 'mobile-capacitor': return 'App Móvil';
      default: return 'Panel Principal';
    }
  };

  const pendingCount = expenses.filter(e => e.status === 'PENDIENTE_REVISION').length;

  return (
    <header 
      id="main-navbar"
      className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm sticky top-0 z-20"
    >
      {/* Left: Organization & Section Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Toggle */}
        <button
          id="btn-mobile-menu-toggle"
          onClick={() => toggleMobileDrawer()}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Branch / Sede Dropdown */}
        <div className="relative" ref={branchMenuRef}>
          <button
            id="btn-branch-dropdown"
            onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              {currentCompany?.name || organization?.name || 'AllSender SRL'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isBranchMenuOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Empresas & Sucursales
              </div>
              <div className="space-y-1 mt-1">
                {companies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCurrentCompany(c);
                      setIsBranchMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      currentCompany?.id === c.id 
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate">{c.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 font-normal">RNC: {c.rnc}</p>
                    </div>
                    {currentCompany?.id === c.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{getBreadcrumbTitle()}</span>
        </div>
      </div>

      {/* Right: Actions, Dark Mode & User Profile */}
      <div className="flex items-center gap-2.5">
        {/* PWA Install Button (shown when installable or on iOS) */}
        {!isInstalled && (isInstallable || isIOS) && (
          <button
            id="btn-pwa-install-nav"
            onClick={() => {
              if (isIOS) {
                setShowInstallModal(true);
              } else {
                promptInstall();
              }
            }}
            className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Instalar ErogaAI como App en tu dispositivo"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Instalar App</span>
            <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded font-mono">PWA</span>
          </button>
        )}

        {/* Quick Scan Button */}
        <button
          id="btn-scan-header"
          onClick={() => openScanner()}
          className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-600/20 active:scale-95 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Registrar Factura</span>
        </button>

        {/* Dark/Light Mode Switcher */}
        <button
          id="theme-btn-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            id="btn-user-profile"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {currentUser?.name || 'Usuario'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {currentUser?.role === 'ADMIN' ? 'Administrador' : currentUser?.role === 'ACCOUNTANT' ? 'Contabilidad DGII' : 'Supervisor'}
              </p>
            </div>
            <img 
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
              alt={currentUser?.name || 'Avatar'}
              className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-slate-100">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser?.email}</p>
              </div>

              {/* Portal Switcher (Company vs Super Admin) */}
              <div className="p-1 space-y-1 mt-1 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setPortal('company');
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between font-semibold transition-all ${
                    portal === 'company' 
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-blue-500" />
                    <span>Portal Empresa (Gastos)</span>
                  </div>
                  {portal === 'company' && <span className="text-[10px] bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-100">Activo</span>}
                </button>

                <button
                  onClick={() => {
                    setPortal('super-admin');
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between font-semibold transition-all ${
                    portal === 'super-admin' 
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Super Admin SaaS</span>
                  </div>
                  {portal === 'super-admin' && <span className="text-[10px] bg-indigo-200 dark:bg-indigo-800 px-1.5 py-0.5 rounded text-indigo-900 dark:text-indigo-100">Activo</span>}
                </button>
              </div>

              {/* Role Simulation Switcher in Menu (Cleanly nested) */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Cambiar Rol de Sesión
                </span>
                <select
                  value={currentUser?.role || 'ADMIN'}
                  onChange={(e) => setUserRole(e.target.value as RoleType)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ADMIN">Administrador (Total)</option>
                  <option value="ACCOUNTANT">Contador (Fiscal DGII)</option>
                  <option value="SUPERVISOR">Supervisor (Aprobaciones)</option>
                  <option value="EMPLOYEE">Empleado (Registro)</option>
                </select>
              </div>

              <div className="p-1">
                <button
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                    } catch (e) {
                      console.warn('Logout error', e);
                    } finally {
                      localStorage.removeItem('eroga_impersonating_org_id');
                      localStorage.removeItem('eroga_impersonating_org_name');
                      window.location.href = '/';
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-2 font-bold cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
