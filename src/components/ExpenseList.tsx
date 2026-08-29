import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ExternalLink, 
  Building, 
  FileText, 
  Layers, 
  Trash2, 
  Edit3, 
  Sparkles,
  ChevronDown,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ExpenseRecord, 
  ExpenseStatus, 
  ExpenseClassification, 
  Organization, 
  User, 
  Company, 
  Branch 
} from '../types.ts';

interface ExpenseListProps {
  expenses: ExpenseRecord[];
  currentOrg: Organization;
  currentUser: User;
  companies: Company[];
  branches: Branch[];
  onSelectExpense: (expense: ExpenseRecord) => void;
  onOpenScanner: () => void;
  onRefresh: () => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  currentOrg,
  currentUser,
  companies,
  branches,
  onSelectExpense,
  onOpenScanner,
  onRefresh,
  onDeleteExpense
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  // Filtered List
  const filtered = expenses.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (classificationFilter !== 'ALL' && item.classification !== classificationFilter) return false;
    if (companyFilter !== 'ALL' && item.company_id !== companyFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.supplier_name.toLowerCase().includes(q) ||
        item.supplier_rnc.toLowerCase().includes(q) ||
        item.ncf.toLowerCase().includes(q) ||
        item.expense_category.toLowerCase().includes(q) ||
        item.created_by_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Financial Stats
  const totalAmount = filtered.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalItbis = filtered.reduce((acc, curr) => acc + curr.itbis_amount, 0);
  const pendingCount = filtered.filter(e => e.status === 'PENDIENTE_REVISION').length;
  const syncedCount = filtered.filter(e => e.status === 'SINCRONIZADO_ERP').length;

  const getStatusBadge = (status: ExpenseStatus) => {
    switch (status) {
      case 'APROBADO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"><CheckCircle2 className="w-3 h-3" /> Aprobado</span>;
      case 'PENDIENTE_REVISION':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"><Clock className="w-3 h-3" /> Revisión</span>;
      case 'RECHAZADO':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"><XCircle className="w-3 h-3" /> Rechazado</span>;
      case 'SINCRONIZADO_ERP':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"><ExternalLink className="w-3 h-3" /> AllSender ERP</span>;
      case 'BORRADOR':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Borrador</span>;
    }
  };

  const getClassificationBadge = (cls: ExpenseClassification) => {
    switch (cls) {
      case 'GASTO_OPERATIVO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">Gasto Operativo</span>;
      case 'COSTO_VENTA':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40">Costo de Venta</span>;
      case 'COMPRA_INVENTARIO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">Compra Inventario</span>;
      case 'ACTIVO_FIJO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">Activo Fijo</span>;
    }
  };

  const exportCSV = () => {
    const headers = ['Fecha', 'Proveedor', 'RNC', 'NCF', 'Tipo NCF', 'Clasificación', 'Categoría', 'Subtotal', 'ITBIS', 'Total RD$', 'Estado'];
    const rows = filtered.map(e => [
      e.date,
      `"${e.supplier_name.replace(/"/g, '""')}"`,
      e.supplier_rnc,
      e.ncf,
      e.ncf_type,
      e.classification,
      `"${e.expense_category}"`,
      e.subtotal,
      e.itbis_amount,
      e.total_amount,
      e.status
    ]);
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ErogaAI_Gastos_${currentOrg.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Registro de Erogaciones & Comprobantes
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Control centralizado de facturas de compras, tickets POS, costos y activos fijos para {currentOrg.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white transition-colors shadow-md shadow-blue-700/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Erogación</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Erogado
          </div>
          <div className="text-lg md:text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            RD$ {totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {filtered.length} comprobantes registrados
          </div>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            ITBIS Facturado (18%)
          </div>
          <div className="text-lg md:text-2xl font-black text-blue-700 dark:text-blue-400 font-mono mt-1">
            RD$ {totalItbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            Deducible en Formato 606
          </div>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pendientes de Revisión
          </div>
          <div className="text-lg md:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Requiere visto bueno contable
          </div>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Sincronizados AllSender
          </div>
          <div className="text-lg md:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {syncedCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Integrados vía API ERP
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Proveedor, RNC, NCF o Empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="PENDIENTE_REVISION">Pendiente Revisión</option>
              <option value="APROBADO">Aprobado</option>
              <option value="SINCRONIZADO_ERP">Sincronizado ERP</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="BORRADOR">Borrador</option>
            </select>

            {/* Classification Filter */}
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">Todas las Clasificaciones</option>
              <option value="GASTO_OPERATIVO">Gasto Operativo</option>
              <option value="COSTO_VENTA">Costo de Venta</option>
              <option value="COMPRA_INVENTARIO">Compra Inventario</option>
              <option value="ACTIVO_FIJO">Activo Fijo</option>
            </select>

            {/* Company Filter */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="ALL">Todas las Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="all-card rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header with AllSender corporate blue / teal tone */}
            <thead className="bg-slate-900 dark:bg-slate-950 text-slate-200 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold select-none">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Proveedor & RNC</th>
                <th className="py-3 px-3">NCF / Tipo</th>
                <th className="py-3 px-3">Clasificación</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">ITBIS (18%)</th>
                <th className="py-3 px-4 text-right">Total RD$</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Lectura</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold">No se encontraron erogaciones con los filtros seleccionados.</p>
                    <button
                      onClick={onOpenScanner}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Escanear Primer Ticket</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr 
                    key={item.id}
                    onClick={() => onSelectExpense(item)}
                    className="hover:bg-blue-50/60 dark:hover:bg-slate-750/70 transition-colors cursor-pointer group"
                  >
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {item.date}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {item.supplier_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        RNC: {item.supplier_rnc || 'No detectado'}
                      </div>
                    </td>

                    {/* NCF */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        {item.ncf || 'S/N'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.ncf_type}
                      </div>
                    </td>

                    {/* Classification */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div>{getClassificationBadge(item.classification)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                        {item.expense_category}
                      </div>
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      RD$ {item.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>

                    {/* ITBIS */}
                    <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      RD$ {item.itbis_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      RD$ {item.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* AI Score */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.ai_confidence_score}%
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectExpense(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Ver y editar comprobante"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
