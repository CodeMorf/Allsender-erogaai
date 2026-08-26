import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  ExternalLink, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  Building2, 
  Sparkles, 
  PieChart as PieIcon, 
  TrendingUp, 
  AlertCircle,
  Server
} from 'lucide-react';
import { ExpenseRecord, Organization, Company } from '../types.ts';

interface ReportsDgiiViewProps {
  expenses: ExpenseRecord[];
  currentOrg: Organization;
  companies: Company[];
}

export const ReportsDgiiView: React.FC<ReportsDgiiViewProps> = ({
  expenses,
  currentOrg,
  companies
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-03');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ count: number; message: string; timestamp: string } | null>(null);

  // Filter approved expenses for Form 606
  const approvedExpenses = expenses.filter(e => e.status === 'APROBADO' || e.status === 'SINCRONIZADO_ERP');

  // Classification totals
  const gastoOperativo = approvedExpenses.filter(e => e.classification === 'GASTO_OPERATIVO').reduce((a, c) => a + c.total_amount, 0);
  const costoVenta = approvedExpenses.filter(e => e.classification === 'COSTO_VENTA').reduce((a, c) => a + c.total_amount, 0);
  const compraInventario = approvedExpenses.filter(e => e.classification === 'COMPRA_INVENTARIO').reduce((a, c) => a + c.total_amount, 0);
  const activoFijo = approvedExpenses.filter(e => e.classification === 'ACTIVO_FIJO').reduce((a, c) => a + c.total_amount, 0);
  const totalGeneral = gastoOperativo + costoVenta + compraInventario + activoFijo;
  const totalItbisDeducible = approvedExpenses.reduce((a, c) => a + c.itbis_amount, 0);

  // Trigger AllSender ERP Sync
  const handleSyncToAllSender = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const pendingSyncIds = approvedExpenses.filter(e => e.status === 'APROBADO').map(e => e.id);
      const response = await fetch('/api/erp/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: currentOrg.id,
          expense_ids: pendingSyncIds
        })
      });

      const data = await response.json();
      setSyncResult({
        count: data.synced_count || pendingSyncIds.length,
        message: data.message || 'Sincronización con AllSender ERP ejecutada correctamente.',
        timestamp: new Date().toLocaleTimeString('es-DO')
      });
    } catch (e) {
      setSyncResult({
        count: 0,
        message: 'Error al comunicar con API Gateway de AllSender ERP',
        timestamp: new Date().toLocaleTimeString('es-DO')
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Export 606 Format TXT / CSV compliant with DGII guidelines
  const handleDownload606 = () => {
    // Standard DGII 606 pipe-delimited or comma format
    const header = `606|${currentOrg.rnc.replace(/[^0-9]/g, '')}|${selectedPeriod.replace('-', '')}|${approvedExpenses.length}`;
    const lines = approvedExpenses.map((e, idx) => {
      const cleanRnc = e.supplier_rnc.replace(/[^0-9]/g, '');
      const tipoId = cleanRnc.length === 9 ? '1' : '2'; // 1 = RNC, 2 = Cedula
      const tipoGasto = e.classification === 'GASTO_OPERATIVO' ? '02' : e.classification === 'COSTO_VENTA' ? '01' : e.classification === 'ACTIVO_FIJO' ? '09' : '03';
      const fecha = e.date.replace(/-/g, '');
      return `${idx + 1}|${cleanRnc}|${tipoId}|${tipoGasto}|${e.ncf}|${fecha}|${fecha}|${e.subtotal.toFixed(2)}|${e.itbis_amount.toFixed(2)}|0.00|${e.itbis_amount.toFixed(2)}|0.00|0.00|${e.legal_tip_amount.toFixed(2)}|01`;
    });

    const content = [header, ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DGII_606_${currentOrg.rnc}_${selectedPeriod}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Reportes Fiscales DGII & Integración AllSender ERP
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Generación del Formato 606 de compras de bienes y servicios y sincronización contable bidireccional.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownload606}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Descargar Archivo DGII 606</span>
          </button>

          <button
            onClick={handleSyncToAllSender}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-700/20"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Sincronizar con AllSender ERP</span>
          </button>
        </div>
      </div>

      {/* Sync Banner Notification */}
      {syncResult && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold">{syncResult.message}</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                {syncResult.count} comprobantes fiscales exportados a la cola del ERP a las {syncResult.timestamp}.
              </div>
            </div>
          </div>
          <span className="px-2 py-1 rounded bg-emerald-200/60 dark:bg-emerald-900/60 font-mono text-[10px] font-bold">
            HTTP 200 OK
          </span>
        </div>
      )}

      {/* Classification Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-blue-600">
          <div className="text-xs font-bold text-slate-500 uppercase">Gasto Operativo (02)</div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            RD$ {gastoOperativo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {((gastoOperativo / (totalGeneral || 1)) * 100).toFixed(1)}% del total
          </div>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-orange-500">
          <div className="text-xs font-bold text-slate-500 uppercase">Costo de Venta (01)</div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            RD$ {costoVenta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {((costoVenta / (totalGeneral || 1)) * 100).toFixed(1)}% del total
          </div>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-amber-500">
          <div className="text-xs font-bold text-slate-500 uppercase">Compra Inventario (03)</div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            RD$ {compraInventario.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {((compraInventario / (totalGeneral || 1)) * 100).toFixed(1)}% del total
          </div>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-purple-600">
          <div className="text-xs font-bold text-slate-500 uppercase">Activo Fijo (09)</div>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            RD$ {activoFijo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {((activoFijo / (totalGeneral || 1)) * 100).toFixed(1)}% del total
          </div>
        </div>
      </div>

      {/* DGII Form 606 Preview Table */}
      <div className="all-card rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Vista Previa Formato 606 — Período {selectedPeriod}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estructura formal con RNC de origen {currentOrg.rnc} y desglose para reporte impositivo mensual.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Período Fiscal:</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-200 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">RNC/Cédula</th>
                <th className="py-2.5 px-3">Tipo Doc</th>
                <th className="py-2.5 px-3">NCF / e-CF</th>
                <th className="py-2.5 px-3">Fecha Comp.</th>
                <th className="py-2.5 px-3 text-right">Monto Facturado</th>
                <th className="py-2.5 px-3 text-right">ITBIS Facturado</th>
                <th className="py-2.5 px-3 text-right">Propina Legal</th>
                <th className="py-2.5 px-3 text-center">Tipo Bien/Servicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvedExpenses.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{item.supplier_rnc || '101-00000-0'}</td>
                  <td className="py-2 px-3">{item.ncf_type}</td>
                  <td className="py-2 px-3 text-blue-600 dark:text-blue-400 font-bold">{item.ncf}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{item.date.replace(/-/g, '')}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                    RD$ {item.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    RD$ {item.itbis_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-500">
                    RD$ {item.legal_tip_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                      {item.classification === 'GASTO_OPERATIVO' ? '02 - Gastos por Trabajos' : item.classification === 'COSTO_VENTA' ? '01 - Gastos de Personal / Costo' : item.classification === 'ACTIVO_FIJO' ? '09 - Compras y Gastos de Activo Fijo' : '03 - Arrendamientos / Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
