import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UploadCloud, 
  Download,
  Filter
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs, expenses } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'APROBAR_GASTO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Aprobación
          </span>
        );
      case 'RECHAZAR_GASTO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> Rechazo
          </span>
        );
      case 'SOLICITAR_CORRECCION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" /> Corrección Pedida
          </span>
        );
      case 'EXPORTAR_606':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Download className="w-3 h-3" /> Exportó 606
          </span>
        );
      case 'SINCRONIZAR_ERP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <UploadCloud className="w-3 h-3" /> Sync AllSender ERP
          </span>
        );
      case 'IMPORTAR_DEMO':
      case 'LIMPIAR_DEMO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            Demostración
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
            {action.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div id="audit-log-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            Pista de Auditoría Fiscal & Trazabilidad
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Registro inmutable de todas las acciones operativas: lecturas de comprobantes, ediciones de campos, autorizaciones, rechazos y exportaciones 606.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuario o detalle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todas las acciones</option>
            <option value="CREAR_GASTO">Creación / Escaneo</option>
            <option value="ACTUALIZAR_GASTO">Edición Manual</option>
            <option value="APROBAR_GASTO">Aprobaciones</option>
            <option value="RECHAZAR_GASTO">Rechazos</option>
            <option value="SOLICITAR_CORRECCION">Correcciones Solicitadas</option>
            <option value="EXPORTAR_606">Exportaciones 606</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-medium">No hay eventos de auditoría registrados</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5">
                    {getActionBadge(log.action)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {log.details}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.user_name}
                      </span>
                      {log.entity_id && (
                        <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {log.entity_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap self-end sm:self-center">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(log.created_at).toLocaleString('es-DO', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
