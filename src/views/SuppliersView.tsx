import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Supplier } from '../types.ts';
import { 
  Building2, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  FileText, 
  DollarSign, 
  X,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { suppliers, isLoadingSuppliers, saveSupplier, deleteSupplier, categories } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Supplier['status_dgii']>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rnc.includes(searchTerm) ||
      (s.trade_name && s.trade_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || s.status_dgii === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingSupplier({
      rnc: '',
      name: '',
      trade_name: '',
      phone: '',
      email: '',
      category_default: categories[0]?.name || 'Suministros de Oficina y Papelería',
      status_dgii: 'DESCONOCIDO',
      total_invoiced: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier({ ...sup });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    await saveSupplier(editingSupplier);
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar al proveedor "${name}"?`)) {
      await deleteSupplier(id);
    }
  };

  return (
    <div id="suppliers-view-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Directorio de Proveedores</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Gestión de RNC y cédulas dominicanas registradas ante la DGII para validación fiscal y asignación automática.
          </p>
        </div>
        <button
          id="btn-add-supplier"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Registrar Proveedor
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-search-suppliers"
            type="text"
            placeholder="Buscar por RNC o Razón Social..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado DGII:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            {(['ALL', 'ACTIVO', 'SUSPENDIDO', 'INACTIVO', 'DADO_DE_BAJA', 'NO_LOCALIZADO', 'DESCONOCIDO'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Todos' : st === 'ACTIVO' ? 'Activos' : st === 'SUSPENDIDO' ? 'Suspendidos' : st === 'INACTIVO' ? 'Inactivos' : st === 'DADO_DE_BAJA' ? 'Dados de baja' : st === 'NO_LOCALIZADO' ? 'No localizados' : 'Sin verificar'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3.5 px-4">RNC / Cédula</th>
                <th className="py-3.5 px-4">Razón Social & Nombre Comercial</th>
                <th className="py-3.5 px-4">Categoría Habitual</th>
                <th className="py-3.5 px-4">Estado DGII</th>
                <th className="py-3.5 px-4 text-right">Total Facturado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
              {isLoadingSuppliers ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Cargando catálogo de proveedores...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium">No se encontraron proveedores</p>
                    <p className="text-xs text-slate-400">Registra un nuevo proveedor o ajusta el filtro de búsqueda.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                          {sup.rnc}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{sup.name}</div>
                      {sup.trade_name && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">{sup.trade_name}</div>
                      )}
                      {(sup.phone || sup.email) && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          {sup.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{sup.phone}</span>}
                          {sup.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{sup.email}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {sup.category_default || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {sup.status_dgii === 'ACTIVO' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> RNC Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3" /> {sup.status_dgii === 'SUSPENDIDO' ? 'Suspendido' : sup.status_dgii === 'INACTIVO' ? 'Empresa inactiva' : sup.status_dgii === 'DADO_DE_BAJA' ? 'Dado de baja' : sup.status_dgii === 'NO_LOCALIZADO' ? 'No localizado' : 'Sin verificar'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      RD$ {(sup.total_invoiced || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          id={`btn-edit-sup-${sup.id}`}
                          onClick={() => handleOpenEdit(sup)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Editar Proveedor"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-sup-${sup.id}`}
                          onClick={() => handleDelete(sup.id, sup.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Modal */}
      {isModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {editingSupplier.id ? 'Editar Proveedor' : 'Nuevo Proveedor Fiscal'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    RNC o Cédula *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="101-00774-8"
                    value={editingSupplier.rnc || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, rnc: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Estado DGII
                  </label>
                  <select
                    value={editingSupplier.status_dgii || 'DESCONOCIDO'}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, status_dgii: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="SUSPENDIDO">Suspendido</option>
                    <option value="INACTIVO">Empresa inactiva</option>
                    <option value="DADO_DE_BAJA">Dado de baja</option>
                    <option value="NO_LOCALIZADO">No Localizado</option>
                    <option value="DESCONOCIDO">Sin verificar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Razón Social (Oficial DGII) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="GRUPO RAMOS S.A."
                  value={editingSupplier.name || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nombre Comercial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Hipermercados La Sirena"
                  value={editingSupplier.trade_name || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, trade_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="(809) 472-2000"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="facturacion@proveedor.com"
                    value={editingSupplier.email || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Categoría Predeterminada de Gasto
                </label>
                <select
                  value={editingSupplier.category_default || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, category_default: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
