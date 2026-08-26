import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { ErogaLogo } from './Logo.js';
import { 
  LayoutDashboard, 
  Receipt, 
  Camera, 
  FolderTree, 
  PieChart, 
  FileSpreadsheet, 
  Building2, 
  ShieldAlert,
  Cpu,
  Activity,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  X,
  Key,
  FileCode2,
  Settings,
  Sliders,
  Network,
  Truck,
  Users
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string;
}

interface NavSection {
  title: string;
  isCollapsible?: boolean;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { 
    portal, 
    setPortal, 
    activeView, 
    setActiveView, 
    organization, 
    currentUser, 
    openScanner,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen
  } = useApp();

  const [isConfigOpen, setIsConfigOpen] = useState(true);

  // Grouped Navigation for Company Portal
  const companyNavSections: NavSection[] = [
    {
      title: 'Operaciones & Fiscal',
      items: [
        {
          id: 'dashboard',
          label: 'Panel Principal',
          icon: LayoutDashboard,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR', 'EMPLOYEE']
        },
        {
          id: 'expenses',
          label: 'Erogaciones & Facturas',
          icon: Receipt,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR', 'EMPLOYEE']
        },
        {
          id: 'dgii-606',
          label: 'Formato Fiscal DGII 606',
          icon: FileSpreadsheet,
          roles: ['ADMIN', 'ACCOUNTANT']
        },
        {
          id: 'cost-consolidation',
          label: 'Consolidación de Costos',
          icon: PieChart,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR'],
          badge: 'RD$'
        },
        {
          id: 'suppliers',
          label: 'Proveedores & RNC',
          icon: Building2,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR']
        },
        {
          id: 'categories',
          label: 'Categorías de Gastos',
          icon: FolderTree,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR']
        },
        {
          id: 'projects-vehicles',
          label: 'Proyectos & Flotilla',
          icon: Truck,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR']
        }
      ]
    },
    {
      title: 'Configuración & Sistema',
      isCollapsible: true,
      items: [
        {
          id: 'organization',
          label: 'Mi Empresa & Sedes',
          icon: Building2,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR', 'EMPLOYEE']
        },
        {
          id: 'team',
          label: 'Gestión de Equipo',
          icon: Users,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR', 'EMPLOYEE'],
          badge: 'RBAC'
        },
        {
          id: 'erp-integration',
          label: 'AllSender ERP',
          icon: Network,
          roles: ['ADMIN', 'ACCOUNTANT'],
          badge: 'Sync'
        },
        {
          id: 'api-keys',
          label: 'API Keys & Credenciales',
          icon: Key,
          roles: ['ADMIN', 'ACCOUNTANT'],
          badge: 'Auth'
        },
        {
          id: 'api-docs',
          label: 'Documentación API',
          icon: FileCode2,
          roles: ['ADMIN', 'ACCOUNTANT', 'SUPERVISOR', 'EMPLOYEE'],
          badge: 'v1'
        },
        {
          id: 'audit-logs',
          label: 'Pista de Auditoría',
          icon: ShieldCheck,
          roles: ['ADMIN', 'ACCOUNTANT']
        }
      ]
    }
  ];

  // Auto-expand Configuración if an item within it is active
  useEffect(() => {
    const configIds = ['organization', 'team', 'users', 'erp-integration', 'api-keys', 'api-docs', 'audit-logs'];
    if (configIds.includes(activeView)) {
      setIsConfigOpen(true);
    }
  }, [activeView]);

  const superAdminNavSections: NavSection[] = [
    {
      title: 'Administración SaaS',
      items: [
        {
          id: 'saas-tenants',
          label: 'Empresas Clientes',
          icon: Building2,
          roles: ['ADMIN']
        },
        {
          id: 'saas-ai-providers',
          label: 'Motores de IA & API',
          icon: Cpu,
          roles: ['ADMIN'],
          badge: 'Multi-LLM'
        },
        {
          id: 'saas-telemetry',
          label: 'Telemetría & Tokens',
          icon: Activity,
          roles: ['ADMIN']
        }
      ]
    }
  ];

  const currentNavSections = portal === 'super-admin' ? superAdminNavSections : companyNavSections;

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId as any);
    setIsMobileDrawerOpen(false);
  };

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const Icon = item.icon;
    const isActive = activeView === item.id || (item.id === 'team' && activeView === 'users');
    
    return (
      <button
        key={item.id}
        id={`nav-item-${item.id}`}
        onClick={() => handleNavClick(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
          isSubItem ? 'pl-3.5' : ''
        } ${
          isActive
            ? 'bg-slate-800 text-white border border-slate-600/60 shadow-xs font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-semibold'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-100' : 'text-slate-400'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
            isActive 
              ? 'bg-slate-700 text-slate-200 border-slate-500' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-1 border border-slate-700/60 shadow-lg shadow-slate-950/40">
            <ErogaLogo size={34} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-base tracking-tight flex items-center">
                <span>Eroga</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-white font-extrabold ml-0.5 drop-shadow-[0_1px_3px_rgba(255,255,255,0.25)]">AI</span>
              </span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 shadow-xs">
                {portal === 'super-admin' ? 'SuperAdmin' : 'SaaS'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Gestión Fiscal & Erogaciones</span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          id="btn-close-mobile-drawer"
          onClick={() => setIsMobileDrawerOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action Button (Company Portal only) */}
      {portal === 'company' && (
        <div className="p-3.5 border-b border-slate-800/60 shrink-0">
          <button
            id="btn-scan-sidebar"
            onClick={() => {
              openScanner();
              setIsMobileDrawerOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 hover:from-white hover:to-slate-200 text-slate-900 font-bold text-xs transition-all shadow-md shadow-slate-950/20 active:scale-[0.98] cursor-pointer"
          >
            <Camera className="w-4 h-4 text-slate-900" />
            <span>Escanear Comprobante</span>
          </button>
        </div>
      )}

      {/* Super Admin Notice */}
      {portal === 'super-admin' && (
        <div className="p-3.5 border-b border-indigo-900/60 bg-indigo-950/30 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Modo Master SaaS</span>
            </span>
            <button
              onClick={() => {
                setPortal('company');
                setIsMobileDrawerOpen(false);
              }}
              className="text-[10px] font-semibold text-slate-400 hover:text-white underline cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      )}

      {/* Main Scrollable Navigation */}
      <div className="flex-1 px-3 py-3 space-y-3.5 overflow-y-auto custom-scrollbar">
        {currentNavSections.map((section) => {
          const filteredItems = section.items.filter(item => 
            !currentUser || item.roles.includes(currentUser.role)
          );

          if (filteredItems.length === 0) return null;

          const isCollapsible = section.isCollapsible;
          const isSectionOpen = !isCollapsible || isConfigOpen;

          return (
            <div key={section.title} className="space-y-1">
              {/* Section Header (Clickable if collapsible) */}
              {isCollapsible ? (
                <button
                  onClick={() => setIsConfigOpen(!isConfigOpen)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    <span>{section.title}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-medium px-1.5 py-0.2 text-slate-400 bg-slate-800 rounded border border-slate-700/80">
                      {filteredItems.length}
                    </span>
                    {isConfigOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>
              ) : (
                <div className="px-2.5 pt-1 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>{section.title}</span>
                </div>
              )}

              {/* Section Items (Collapsible body) */}
              {isSectionOpen && (
                <div className={`space-y-0.5 ${isCollapsible ? 'pl-2 border-l border-slate-800/80 ml-2 mt-1 animate-in fade-in duration-200' : ''}`}>
                  {filteredItems.map(item => renderNavItem(item, isCollapsible))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Switcher / Organization Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3 px-1.5 py-1">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt="Usuario"
            className="w-8 h-8 rounded-lg object-cover border border-slate-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-slate-300" />
              <span className="text-[10px] text-slate-400 font-medium">
                {currentUser?.role === 'ADMIN' ? 'Administrador' : currentUser?.role === 'ACCOUNTANT' ? 'Contabilidad' : currentUser?.role === 'SUPERVISOR' ? 'Supervisor' : 'Empleado'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between px-1">
          <span className="truncate max-w-[170px]">{organization?.name || 'Empresa'}</span>
          <span className="text-slate-300 font-mono font-bold">RD DGII</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside 
        id="main-sidebar-desktop"
        className="hidden md:flex w-64 flex-shrink-0 flex-col bg-slate-900 text-slate-300 border-r border-slate-800 select-none z-30 transition-all duration-200"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer Backdrop & Panel */}
      {isMobileDrawerOpen && (
        <div 
          id="mobile-sidebar-backdrop"
          className="fixed inset-0 z-50 md:hidden bg-black/70 backdrop-blur-xs flex animate-in fade-in duration-200"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div 
            id="main-sidebar-mobile"
            className="w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-250 border-r border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
