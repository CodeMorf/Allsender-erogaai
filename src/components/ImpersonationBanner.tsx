import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

export const ImpersonationBanner: React.FC = () => {
  const { organization, showToast } = useApp();
  const impersonatedOrgId = localStorage.getItem('eroga_impersonating_org_id');
  const impersonatedOrgName = localStorage.getItem('eroga_impersonating_org_name') || organization?.name || 'Organización Cliente';

  if (!impersonatedOrgId) return null;

  const handleStopImpersonation = async () => {
    try {
      await fetch('/api/platform/impersonation/stop', { method: 'POST' });
      localStorage.removeItem('eroga_impersonating_org_id');
      localStorage.removeItem('eroga_impersonating_org_name');
      showToast('info', 'Impersonación Finalizada', 'Has regresado al Portal SuperAdmin.');
      window.location.href = '/super-admin/tenants';
    } catch {
      localStorage.removeItem('eroga_impersonating_org_id');
      window.location.reload();
    }
  };

  return (
    <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
        <span>
          ⚠️ MODO SOPORTE: Estás administrando la organización <span className="underline">{impersonatedOrgName}</span> como Super Admin.
        </span>
      </div>
      <button
        onClick={handleStopImpersonation}
        className="px-3 py-1 bg-slate-950 text-white rounded-lg hover:bg-slate-900 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Salir de Impersonación</span>
      </button>
    </div>
  );
};
