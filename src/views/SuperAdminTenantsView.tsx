import React, { useState, useEffect } from 'react';
import { Building2, Search, Plus, ShieldCheck, UserCheck, Activity, Eye, PauseCircle, PlayCircle, AlertCircle, DollarSign, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext.js';

export const SuperAdminTenantsView: React.FC = () => {
  const { showToast, fetchSession } = useApp();
  const [tenants, setTenants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Tenant Form
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgRnc, setNewOrgRnc] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState('PROFESSIONAL');

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/platform/tenants');
      const data = await res.json();
      setTenants(Array.isArray(data.tenants) ? data.tenants : []);
    } catch {
      showToast('error', 'Error', 'No se pudieron cargar los inquilinos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleStartImpersonation = async (tenant: any) => {
    try {
      const res = await fetch(`/api/platform/impersonation/start/${tenant.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar impersonación');

      localStorage.setItem('eroga_impersonating_org_id', tenant.id);
      localStorage.setItem('eroga_impersonating_org_name', tenant.name);

      showToast('success', 'Modo Soporte Activo', `Ahora estás administrando ${tenant.name}`);
      await fetchSession();
      window.location.href = '/company/dashboard';
    } catch (err: any) {
      showToast('error', 'Error de Impersonación', err.message);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName,
          rnc: newOrgRnc,
          plan: newOrgPlan
        })
      });

      if (!res.ok) throw new Error('Error al crear la organización');

      showToast('success', 'Inquilino Creado', `Organización "${newOrgName}" registrada exitosamente.`);
      setShowCreateModal(false);
      setNewOrgName('');
      setNewOrgRnc('');
      loadTenants();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.rnc.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-900/40 text-blue-400 rounded-2xl border border-blue-800/60">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Gestión de Inquilinos (Tenants Multi-Tenant)</h1>
            <p className="text-xs text-slate-400">Panel Global de Administración de Organizaciones Clientes de ErogaAI SaaS</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Inquilino</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar inquilino por razón social o RNC..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                <th className="p-4">Organización / RNC</th>
                <th className="p-4">Plan SaaS</th>
                <th className="p-4">Empresas</th>
                <th className="p-4">Usuarios</th>
                <th className="p-4">Comprobantes</th>
                <th className="p-4">Monto Facturado</th>
                <th className="p-4 text-right">Acciones de Soporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{t.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">RNC: {t.rnc || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-blue-950 text-blue-300 border border-blue-800/60 font-bold rounded-lg text-[10px]">
                      {t.plan}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-200">{t.companies_count || 1}</td>
                  <td className="p-4 font-mono font-bold text-slate-200">{t.users_count || 1}</td>
                  <td className="p-4 font-mono font-bold text-emerald-400">{t.expenses_count || 0}</td>
                  <td className="p-4 font-mono font-bold text-white">
                    RD$ {(t.total_spent || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleStartImpersonation(t)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] rounded-xl transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                      title="Entrar como soporte para inspeccionar esta organización"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Impersonar Soporte</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Inquilino */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-white">Alta de Nuevo Inquilino (Tenant)</h2>
            <form onSubmit={handleCreateTenant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Razón Social</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Empresa Cliente SAS"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">RNC o Cédula</label>
                <input
                  type="text"
                  required
                  value={newOrgRnc}
                  onChange={(e) => setNewOrgRnc(e.target.value)}
                  placeholder="131-89241-2"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Plan Asignado</label>
                <select
                  value={newOrgPlan}
                  onChange={(e) => setNewOrgPlan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="BUSINESS">Business</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30"
                >
                  Crear Inquilino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
