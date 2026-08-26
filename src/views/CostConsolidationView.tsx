import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  Building2, 
  MapPin, 
  Calendar, 
  Download, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Layers, 
  FileSpreadsheet, 
  ShieldCheck,
  Fuel,
  Laptop,
  UtensilsCrossed,
  Boxes,
  Tag,
  Filter
} from 'lucide-react';

export const CostConsolidationView: React.FC = () => {
  const { expenses, categories, costCenters, currentCompany, currentBranch, branches, showToast } = useApp();

  const [period, setPeriod] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Filter expenses by branch if selected
  const branchFilteredExpenses = expenses.filter(e => {
    if (selectedBranchId !== 'ALL' && e.branch_id !== selectedBranchId) return false;
    return true;
  });

  // Calculate totals by classification
  const totalAmount = branchFilteredExpenses.reduce((sum, e) => sum + (e.total_amount || 0), 0);
  const totalItbis = branchFilteredExpenses.reduce((sum, e) => sum + (e.itbis_amount || 0), 0);
  const totalSubtotal = branchFilteredExpenses.reduce((sum, e) => sum + (e.subtotal || 0), 0);

  const opex = branchFilteredExpenses
    .filter(e => e.classification === 'GASTO_OPERATIVO')
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const costOfSales = branchFilteredExpenses
    .filter(e => e.classification === 'COSTO_VENTA')
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const inventory = branchFilteredExpenses
    .filter(e => e.classification === 'COMPRA_INVENTARIO')
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  const capex = branchFilteredExpenses
    .filter(e => e.classification === 'ACTIVO_FIJO')
    .reduce((sum, e) => sum + (e.total_amount || 0), 0);

  // Group by Category
  const categorySummaryMap = new Map<string, { count: number; total: number; itbis: number }>();
  branchFilteredExpenses.forEach(e => {
    const cat = e.expense_category || 'Otras Erogaciones';
    const prev = categorySummaryMap.get(cat) || { count: 0, total: 0, itbis: 0 };
    categorySummaryMap.set(cat, {
      count: prev.count + 1,
      total: prev.total + (e.total_amount || 0),
      itbis: prev.itbis + (e.itbis_amount || 0)
    });
  });

  const categorySummaryList = Array.from(categorySummaryMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);

  // Group by Supplier
  const supplierSummaryMap = new Map<string, { count: number; total: number; rnc: string }>();
  branchFilteredExpenses.forEach(e => {
    const sup = e.supplier_name || 'Desconocido';
    const prev = supplierSummaryMap.get(sup) || { count: 0, total: 0, rnc: e.supplier_rnc };
    supplierSummaryMap.set(sup, {
      count: prev.count + 1,
      total: prev.total + (e.total_amount || 0),
      rnc: e.supplier_rnc
    });
  });

  const topSuppliers = Array.from(supplierSummaryMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const handleExportConsolidated = () => {
    const headers = ['Centro de Costo / Rubro', 'Cantidad Comprobantes', 'Subtotal RD$', 'ITBIS RD$', 'Total Facturado RD$', '% del Total'];
    const rows = categorySummaryList.map(c => [
      `"${c.name}"`,
      c.count,
      (c.total - c.itbis).toFixed(2),
      c.itbis.toFixed(2),
      c.total.toFixed(2),
      `${((c.total / (totalAmount || 1)) * 100).toFixed(1)}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Consolidacion_Costos_ErogaAI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Reporte Consolidado Exportado', 'Archivo CSV descargado con el balance completo.');
  };

  return (
    <div id="cost-consolidation-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <PieChart className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Consolidación y Análisis de Costos
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Control integral de desembolsos por departamentos, presupuesto vs erogación real y desglose de ITBIS deducible de la empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportConsolidated}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Balance (.CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Classification KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gastos Operativos (OPEX)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
            RD$ {opex.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Combustibles, dietas y oficina</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{((opex / (totalAmount || 1)) * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Costos de Venta</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            RD$ {costOfSales.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Materiales y servicios a clientes</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{((costOfSales / (totalAmount || 1)) * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Compra de Inventario</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
            RD$ {inventory.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Repuestos y mercancía en almacén</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{((inventory / (totalAmount || 1)) * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Activos Fijos (CAPEX)</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Laptop className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
            RD$ {capex.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Equipos de cómputo y mobiliario</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{((capex / (totalAmount || 1)) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Centros de Costos vs Desglose por Rubro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Centros de Costo Status (2 Cols) */}
        <div className="lg:col-span-2 all-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ejecución Presupuestaria por Centro de Costos
              </h3>
              <p className="text-[11px] text-slate-500">Seguimiento en tiempo real de techos mensuales y desviaciones</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Presupuestos OK
            </span>
          </div>

          <div className="space-y-4">
            {costCenters.map(cc => {
              const pct = Math.min(Math.round((cc.spent_current_month / cc.budget_monthly) * 100), 100);
              const isHigh = pct > 80;

              return (
                <div key={cc.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{cc.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-medium">({cc.code})</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Responsable: {cc.manager_name}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        RD$ {cc.spent_current_month.toLocaleString('es-DO')} <span className="text-slate-400 font-normal text-[11px]">/ RD$ {cc.budget_monthly.toLocaleString('es-DO')}</span>
                      </p>
                      <span className={`text-[10px] font-bold ${isHigh ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {pct}% Ejecutado
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Proveedores del Mes (1 Col) */}
        <div className="all-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Top Proveedores con Mayor Volumen
            </h3>
            <p className="text-[11px] text-slate-500">Concentración de compras y pagos fiscales</p>
          </div>

          <div className="space-y-3">
            {topSuppliers.map((sup, idx) => (
              <div key={sup.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/40">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{sup.name}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 pl-6.5">RNC: {sup.rnc} • {sup.count} facturas</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    RD$ {sup.total.toLocaleString('es-DO')}
                  </p>
                  <span className="text-[10px] text-slate-400">{((sup.total / (totalAmount || 1)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Breakdown Table */}
      <div className="all-card rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Desglose Consolidado por Rubro de Gasto
            </h3>
            <p className="text-[11px] text-slate-500">Monto neto facturado, ITBIS generado y peso porcentual sobre el total</p>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Total General: RD$ {totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3">Categoría / Rubro</th>
                <th className="px-4 py-3 text-center">Facturas</th>
                <th className="px-4 py-3 text-right">Subtotal Neto</th>
                <th className="px-4 py-3 text-right">ITBIS Deducible (18%)</th>
                <th className="px-4 py-3 text-right">Total Facturado</th>
                <th className="px-6 py-3 text-right">Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {categorySummaryList.map((cat) => {
                const sub = cat.total - cat.itbis;
                const share = ((cat.total / (totalAmount || 1)) * 100).toFixed(1);

                return (
                  <tr key={cat.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 text-slate-900 dark:text-slate-100 font-bold flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                      <span>{cat.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-500 font-semibold">{cat.count}</td>
                    <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300">RD$ {sub.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">RD$ {cat.itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">RD$ {cat.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{share}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
