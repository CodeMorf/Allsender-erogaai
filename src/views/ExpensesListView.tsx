import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ClassificationBadge } from '../components/ClassificationBadge.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { ExpenseClassification, ExpenseStatus } from '../types.js';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  Eye, 
  Building,
  Sparkles,
  Layers
} from 'lucide-react';

export const ExpensesListView: React.FC = () => {
  const { 
    expenses, 
    setSelectedExpense, 
    openScanner, 
    updateExpenseStatus, 
    syncWithAllSenderERP, 
    currentUser,
    companies,
    showToast 
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    return list.filter(e => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (classificationFilter !== 'ALL' && e.classification !== classificationFilter) return false;
      if (companyFilter !== 'ALL' && e.company_id !== companyFilter) return false;
      if (search.trim() !== '') {
        const s = search.toLowerCase();
        const match = 
          e.supplier_name.toLowerCase().includes(s) ||
          e.supplier_rnc.toLowerCase().includes(s) ||
          e.ncf.toLowerCase().includes(s) ||
          (e.expense_category || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [expenses, search, statusFilter, classificationFilter, companyFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredExpenses.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await updateExpenseStatus(id, 'APROBADO', 'Aprobación por lote');
    }
    setSelectedIds([]);
    showToast('success', 'Lote Aprobado', `${selectedIds.length} erogaciones aprobadas para deducción.`);
  };

  const handleBatchSyncERP = async () => {
    if (selectedIds.length === 0) return;
    await syncWithAllSenderERP(selectedIds);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    const headers = ['NCF', 'Proveedor', 'RNC', 'Fecha', 'Clasificación', 'Subtotal', 'ITBIS', 'Total', 'Estado'];
    const rows = filteredExpenses.map(e => [
      e.ncf,
      `"${e.supplier_name.replace(/"/g, '""')}"`,
      e.supplier_rnc,
      e.date,
      e.classification,
      e.subtotal,
      e.itbis_amount,
      e.total_amount,
      e.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ErogaAI_Erogaciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('info', 'Exportación Exitosa', 'El archivo CSV ha sido generado.');
  };

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ACCOUNTANT';

  return (
    <div id="expenses-list-view" className="space-y-5">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Erogaciones y Comprobantes Fiscales
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro, validación DGII y clasificación contable de gastos de la empresa
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => openScanner()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm shadow-blue-600/20"
          >
            <Camera className="w-4 h-4" />
            <span>Nuevo Comprobante</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="all-card rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por NCF, RNC o proveedor..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filtrar por Estado"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDIENTE_REVISION">Pendiente de Revisión</option>
              <option value="APROBADO">Aprobado</option>
              <option value="SINCRONIZADO_ERP">Sincronizado AllSender</option>
              <option value="BORRADOR">Borrador</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>

          {/* Classification Filter */}
          <div>
            <select
              value={classificationFilter}
              onChange={e => setClassificationFilter(e.target.value)}
              aria-label="Filtrar por Clasificación Contable"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Todas las Clasificaciones</option>
              <option value="GASTO_OPERATIVO">Gasto Operativo</option>
              <option value="COSTO_VENTA">Costo de Venta</option>
              <option value="COMPRA_INVENTARIO">Compra para Inventario</option>
              <option value="ACTIVO_FIJO">Activo Fijo</option>
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              aria-label="Filtrar por Empresa del Grupo"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Todas las Empresas del Grupo</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Action Strip */}
        {selectedIds.length > 0 && canManage && (
          <div className="flex items-center justify-between p-2.5 bg-blue-50/90 dark:bg-blue-950/60 rounded-lg border border-blue-200 dark:border-blue-900/60 text-xs animate-in fade-in">
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              {selectedIds.length} comprobantes seleccionados
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchApprove}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aprobar Seleccionados</span>
              </button>
              <button
                onClick={handleBatchSyncERP}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Sincronizar AllSender ERP</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Expenses Table */}
      <div className="all-card rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredExpenses.length}
                    onChange={handleSelectAll}
                    aria-label="Seleccionar todos los comprobantes"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">Comprobante (NCF)</th>
                <th className="p-3">Proveedor / RNC</th>
                <th className="p-3">Clasificación Contable</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">ITBIS</th>
                <th className="p-3 text-right">Total RD$</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No se encontraron comprobantes fiscales que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr 
                    key={exp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedExpense(exp)}
                  >
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(exp.id)}
                        onChange={() => handleToggleSelect(exp.id)}
                        aria-label={`Seleccionar comprobante ${exp.ncf}`}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <div>{exp.ncf}</div>
                      <span className="text-[10px] text-slate-400 font-sans font-normal">{exp.ncf_type}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{exp.supplier_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">RNC: {exp.supplier_rnc}</div>
                    </td>
                    <td className="p-3">
                      <ClassificationBadge classification={exp.classification} />
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {formatDate(exp.date)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(exp.subtotal, exp.currency)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(exp.itbis_amount, exp.currency)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(exp.total_amount, exp.currency)}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={exp.status} />
                    </td>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedExpense(exp)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Ver Documento"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
