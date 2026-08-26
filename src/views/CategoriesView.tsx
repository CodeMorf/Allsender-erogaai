import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { ExpenseCategory, ExpenseClassification } from '../types.js';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Tag, 
  DollarSign, 
  FileText, 
  Sparkles,
  Layers,
  Fuel,
  UtensilsCrossed,
  Laptop,
  Boxes,
  Paperclip,
  Wrench,
  Scale,
  Building2,
  AlertTriangle,
  X,
  TrendingUp
} from 'lucide-react';

const DGII_606_TYPES = [
  '01 - Gastos de Personal',
  '02 - Gastos por Trabajos, Suministros y Servicios',
  '03 - Arrendamientos',
  '04 - Gastos de Activos Fijo',
  '05 - Gastos de Representación',
  '06 - Otras Deducciones Admitidas',
  '07 - Gastos Financieros',
  '08 - Gastos Extraordinarios',
  '09 - Compras que forman parte del Costo de Venta',
  '10 - Adquisiciones de Activos',
  '11 - Gastos de Seguros'
];

export const CategoriesView: React.FC = () => {
  const { categories, saveCategory, deleteCategory, expenses, isLoadingCategories } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
  const [editingCategory, setEditingCategory] = useState<Partial<ExpenseCategory> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.dgii_type_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassification === 'ALL' || cat.default_classification === selectedClassification;
    return matchesSearch && matchesClass;
  });

  // Calculate actual spent per category from loaded expenses
  const getSpentForCategory = (catName: string) => {
    return expenses
      .filter(e => e.expense_category.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(e.expense_category.toLowerCase()))
      .reduce((sum, e) => sum + (e.total_amount || 0), 0);
  };

  const handleOpenNew = () => {
    setEditingCategory({
      name: '',
      code: `CAT-${Math.floor(100 + Math.random() * 900)}`,
      account_code: '6105-01',
      dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios',
      default_classification: 'GASTO_OPERATIVO',
      default_itbis_rate: 18,
      monthly_budget: 50000,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: ExpenseCategory) => {
    setEditingCategory({ ...cat });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name?.trim()) return;
    await saveCategory(editingCategory);
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    setDeletingId(null);
  };

  const totalBudgetAllocated = categories.reduce((sum, c) => sum + (c.monthly_budget || 0), 0);
  const activeCount = categories.filter(c => c.is_active).length;

  return (
    <div id="categories-view" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FolderTree className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Catálogo de Categorías de Gastos
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Gestiona los rubros de erogación de la empresa, su correlación con las cuentas contables y la clasificación obligatoria del <strong>Formato DGII 606</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-new-category"
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Categorías Habilitadas</span>
            <Tag className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeCount} <span className="text-xs font-normal text-slate-400">/ {categories.length}</span></p>
          <span className="text-[11px] text-emerald-600 font-medium">Reconocimiento IA activo en escaneo</span>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Presupuesto Mensual Total</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">RD$ {totalBudgetAllocated.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
          <span className="text-[11px] text-slate-400">Techo presupuestario asignado</span>
        </div>

        <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Cumplimiento DGII 606</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">100% Mapeado</p>
          <span className="text-[11px] text-slate-400">Tipos 01 al 11 asignados automáticamente</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="all-card rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o DGII..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
            className="text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todas las Clasificaciones</option>
            <option value="GASTO_OPERATIVO">Gasto Operativo</option>
            <option value="COSTO_VENTA">Costo de Venta</option>
            <option value="COMPRA_INVENTARIO">Compra Inventario</option>
            <option value="ACTIVO_FIJO">Activo Fijo</option>
          </select>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const spent = getSpentForCategory(cat.name);
          const budget = cat.monthly_budget || 50000;
          const percentage = Math.min(Math.round((spent / budget) * 100), 100);

          return (
            <div
              key={cat.id}
              className={`all-card rounded-2xl p-5 bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between ${
                cat.is_active 
                  ? 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/50 shadow-xs' 
                  : 'border-slate-200/60 dark:border-slate-800/60 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                {/* Category Top Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: `${cat.color || '#3B82F6'}20`, color: cat.color || '#3B82F6' }}
                    >
                      <Tag className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{cat.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">{cat.code}</span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">Cta: {cat.account_code}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cat.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {cat.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Fiscal DGII Mapping */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/40 text-xs space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Tipo DGII 606:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={cat.dgii_type_code}>
                      {cat.dgii_type_code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Tasa ITBIS Habitual:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {cat.default_itbis_rate === 0 ? '0% (Exento de Ley)' : `${cat.default_itbis_rate}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Clasificación:</span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {cat.default_classification.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Budget vs Actual Spent Progress */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Gasto Mes vs Presupuesto:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      RD$ {spent.toLocaleString('es-DO')} <span className="text-[10px] text-slate-400 font-normal">/ {budget.toLocaleString('es-DO')}</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        percentage > 90 ? 'bg-rose-500' : percentage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => setDeletingId(cat.id)}
                  className="flex items-center gap-1 text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FolderTree className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No se encontraron categorías</h3>
          <p className="text-xs text-slate-500 mt-1">Intenta con otro término de búsqueda o crea una nueva.</p>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingCategory.id ? 'Editar Categoría de Gasto' : 'Crear Nueva Categoría'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre del Rubro / Categoría *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="Ej. Combustibles y Movilidad"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Código Interno</label>
                  <input
                    type="text"
                    value={editingCategory.code || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cuenta Contable</label>
                  <input
                    type="text"
                    value={editingCategory.account_code || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, account_code: e.target.value })}
                    placeholder="Ej. 6105-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Bienes y Servicios (DGII 606)</label>
                <select
                  value={editingCategory.dgii_type_code || DGII_606_TYPES[1]}
                  onChange={(e) => setEditingCategory({ ...editingCategory, dgii_type_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
                >
                  {DGII_606_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Clasificación por Defecto</label>
                  <select
                    value={editingCategory.default_classification || 'GASTO_OPERATIVO'}
                    onChange={(e) => setEditingCategory({ ...editingCategory, default_classification: e.target.value as ExpenseClassification })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="GASTO_OPERATIVO">Gasto Operativo</option>
                    <option value="COSTO_VENTA">Costo de Venta</option>
                    <option value="COMPRA_INVENTARIO">Compra Inventario</option>
                    <option value="ACTIVO_FIJO">Activo Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tasa ITBIS Sugerida</label>
                  <select
                    value={editingCategory.default_itbis_rate ?? 18}
                    onChange={(e) => setEditingCategory({ ...editingCategory, default_itbis_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={18}>18% (Tasa Estándar RD)</option>
                    <option value={16}>16% (Reducida)</option>
                    <option value={0}>0% (Exento / Combustibles)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Presupuesto Mensual (RD$)</label>
                  <input
                    type="number"
                    value={editingCategory.monthly_budget || 0}
                    onChange={(e) => setEditingCategory({ ...editingCategory, monthly_budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                  <select
                    value={editingCategory.is_active ? '1' : '0'}
                    onChange={(e) => setEditingCategory({ ...editingCategory, is_active: e.target.value === '1' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="1">Activa para Nuevos Gastos</option>
                    <option value="0">Desactivada / Oculta</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">¿Eliminar esta categoría?</h4>
              <p className="text-xs text-slate-500">Las facturas ya registradas mantendrán su historial, pero no se sugerirá para nuevos escaneos.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
