import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Layers,
  CheckCircle2
} from 'lucide-react';
import { Company, Branch, Organization } from '../types.ts';

interface CompaniesViewProps {
  currentOrg: Organization;
  companies: Company[];
  branches: Branch[];
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  currentOrg,
  companies,
  branches
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || '');
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);

  const activeCompany = companies.find(c => c.id === selectedCompanyId) || companies[0];
  const companyBranches = branches.filter(b => b.company_id === activeCompany?.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Gestión de Empresas Filiales & Sucursales
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Configure las razones sociales, RNC y centros de costo / sucursales asociadas a {currentOrg.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-700/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Empresa Filial</span>
          </button>
        </div>
      </div>

      {/* Grid: Companies Cards & Branches Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Companies (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Empresas / Razones Sociales:
          </div>

          <div className="space-y-3">
            {companies.map((comp) => {
              const isSelected = comp.id === selectedCompanyId;
              const count = branches.filter(b => b.company_id === comp.id).length;

              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`all-card rounded-2xl p-4 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {comp.name}
                        {comp.is_active && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <div className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                        RNC: {comp.rnc}
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                      {count} {count === 1 ? 'Sucursal' : 'Sucursales'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{comp.address || 'Distrito Nacional, Santo Domingo'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Company Branches & Centers of Cost (7 cols) */}
        {activeCompany && (
          <div className="lg:col-span-7 space-y-4">
            <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Sucursales de {activeCompany.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Centros de costo para imputación de gastos operativos y compras.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddBranchModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Sucursal</span>
                </button>
              </div>

              {/* Branches Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-4">Nombre de Sucursal</th>
                      <th className="py-2.5 px-3">Dirección</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {companyBranches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {branch.code}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {branch.name}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {branch.address || 'N/D'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
