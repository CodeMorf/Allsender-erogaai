import React from 'react';
import { 
  Building2, 
  Camera, 
  Search, 
  Bell, 
  ChevronRight, 
  Sun, 
  Moon, 
  Laptop, 
  ShieldCheck, 
  UserCheck, 
  Briefcase, 
  User as UserIcon,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Organization, RoleType, User } from '../types.ts';
import { ThemeMode } from '../lib/theme.ts';

interface HeaderProps {
  currentOrg: Organization;
  organizations: Organization[];
  onSelectOrg: (org: Organization) => void;
  currentUser: User;
  onSwitchUser: (user: User) => void;
  allUsers: User[];
  currentSection: string;
  subSection?: string;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onOpenScanner: () => void;
  isOnline: boolean;
  pendingOfflineCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentOrg,
  organizations,
  onSelectOrg,
  currentUser,
  onSwitchUser,
  allUsers,
  currentSection,
  subSection,
  themeMode,
  onThemeChange,
  onOpenScanner,
  isOnline,
  pendingOfflineCount
}) => {
  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = React.useState(false);

  const getRoleBadge = (role: RoleType | string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"><ShieldCheck className="w-3.5 h-3.5" /> Administrador</span>;
      case 'ACCOUNTANT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><Briefcase className="w-3.5 h-3.5" /> Contable</span>;
      case 'SUPERVISOR':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><UserCheck className="w-3.5 h-3.5" /> Supervisor</span>;
      case 'EMPLOYEE':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><UserIcon className="w-3.5 h-3.5" /> Empleado</span>;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Left: Breadcrumbs & Organization Selector */}
      <div className="flex items-center gap-3">
        {/* Organization Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Cambiar Organización"
          >
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="max-w-[140px] md:max-w-[200px] truncate">{currentOrg.name}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">({currentOrg.currency})</span>
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Organizaciones
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    onSelectOrg(org);
                    setOrgDropdownOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-lg text-xs md:text-sm transition-colors ${
                    org.id === currentOrg.id 
                      ? 'bg-blue-50 text-blue-800 font-semibold dark:bg-blue-900/30 dark:text-blue-200' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4 mt-0.5 text-slate-400" />
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">RNC: {org.rnc} • {org.plan}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Breadcrumb path */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-200 font-semibold">{currentSection}</span>
          {subSection && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span>{subSection}</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Search / Offline Status */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por RNC, NCF, Proveedor..."
            className="w-56 lg:w-72 pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Connection status pill */}
        {isOnline ? (
          <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-200 dark:border-emerald-800/50">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>En línea</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-md border border-amber-200 dark:border-amber-800/50">
            <WifiOff className="w-3 h-3 text-amber-500" />
            <span>Modo Offline ({pendingOfflineCount})</span>
          </div>
        )}
      </div>

      {/* Right: Quick Action Scanner, Theme Switcher, Role Tester & Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Capture Button */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-lg shadow-sm hover:shadow transition-all"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Capturar Ticket</span>
        </button>

        {/* Theme Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title={`Tema: ${themeMode === 'light' ? 'Claro' : themeMode === 'dark' ? 'Oscuro' : 'Automático'}`}
          >
            {themeMode === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
            {themeMode === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
            {themeMode === 'auto' && <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
          </button>

          {themeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 text-xs">
              <button
                onClick={() => { onThemeChange('light'); setThemeDropdownOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  themeMode === 'light' ? 'bg-amber-50 text-amber-900 font-semibold dark:bg-amber-950/40 dark:text-amber-200' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Claro</span>
              </button>
              <button
                onClick={() => { onThemeChange('dark'); setThemeDropdownOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  themeMode === 'dark' ? 'bg-blue-50 text-blue-900 font-semibold dark:bg-blue-950/40 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Moon className="w-4 h-4 text-blue-400" />
                <span>Oscuro</span>
              </button>
              <button
                onClick={() => { onThemeChange('auto'); setThemeDropdownOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  themeMode === 'auto' ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-700 dark:text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Laptop className="w-4 h-4 text-slate-400" />
                <span>Automático</span>
              </button>
            </div>
          )}
        </div>

        {/* User Role Switcher Dropdown (Allows testing Admin/Contable/Supervisor/Empleado) */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Cambiar Rol de Usuario"
          >
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-700"
            />
            <div className="hidden xl:block text-left text-xs leading-tight">
              <div className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.name.split(' ')[0]}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{currentUser.role.toLowerCase()}</div>
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{currentUser.email}</div>
                <div className="mt-1.5">{getRoleBadge(currentUser.role)}</div>
              </div>

              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Simular Rol para Pruebas:
              </div>

              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u);
                    setUserDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                    u.id === currentUser.id 
                      ? 'bg-blue-50 text-blue-800 font-semibold dark:bg-blue-900/30 dark:text-blue-200' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                    <div>
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{u.department}</div>
                    </div>
                  </div>
                  {getRoleBadge(u.role)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
