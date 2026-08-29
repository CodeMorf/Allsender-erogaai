import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';
import { 
  Building2, 
  MapPin, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Phone, 
  Mail, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  Layers, 
  Globe, 
  Sparkles, 
  FileText,
  BadgePercent,
  X,
  Lock,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { Company, Branch, Organization, TaxRegimeType } from '../types.ts';
import { validateDominicanRnc, formatRnc } from '../utils/fiscalValidators.ts';

export const OrganizationView: React.FC = () => {
  const { 
    organization, 
    companies, 
    branches, 
    users, 
    currentCompany,
    setCurrentCompany,
    saveCompany,
    saveOrganization,
    deactivateCompany,
    saveBranch,
    deactivateBranch,
    setActiveView,
    hasPermission
  } = useApp();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'companies' | 'roles' | 'users' | 'settings'>('companies');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(currentCompany?.id || companies[0]?.id || '');
  const canManageOrganization = hasPermission('company.manage');

  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    rnc: '',
    address: '',
    phone: '',
    currency: 'DOP' as Organization['currency']
  });

  useEffect(() => {
    if (!organization) return;
    setOrganizationForm({
      name: organization.name || '',
      rnc: organization.rnc || '',
      address: organization.address || '',
      phone: organization.phone || '',
      currency: organization.currency || 'DOP'
    });
  }, [organization]);

  // Modals state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<Company> | null>(null);
  
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);

  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  // Form states for Company
  const [compForm, setCompForm] = useState({
    name: '',
    trade_name: '',
    rnc: '',
    tax_regime: 'REGIMEN_GENERAL' as TaxRegimeType,
    address: '',
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo de Guzmán',
    sector: 'Piantini',
    phone: '',
    email: '',
    currency: 'DOP' as 'DOP' | 'USD' | 'EUR',
    is_main: false
  });

  // Form states for Branch
  const [branchForm, setBranchForm] = useState({
    company_id: '',
    name: '',
    code: '',
    address: '',
    province: 'Distrito Nacional',
    municipality: 'Santo Domingo',
    phone: '',
    responsible: ''
  });

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || companies[0] || null;
  const companyBranches = branches.filter(b => b.company_id === selectedCompany?.id);

  // Live validation of RNC in company form
  const rncValidation = validateDominicanRnc(compForm.rnc);

  const handleOpenNewCompany = () => {
    setEditingCompany(null);
    setCompForm({
      name: '',
      trade_name: '',
      rnc: '',
      tax_regime: 'REGIMEN_GENERAL',
      address: '',
      province: 'Distrito Nacional',
      municipality: 'Santo Domingo de Guzmán',
      sector: '',
      phone: '',
      email: '',
      currency: 'DOP',
      is_main: companies.length === 0
    });
    setIsCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (comp: Company) => {
    setEditingCompany(comp);
    setCompForm({
      name: comp.name,
      trade_name: comp.trade_name || comp.name,
      rnc: comp.rnc,
      tax_regime: comp.tax_regime || 'REGIMEN_GENERAL',
      address: comp.address || '',
      province: comp.province || 'Distrito Nacional',
      municipality: comp.municipality || 'Santo Domingo de Guzmán',
      sector: comp.sector || '',
      phone: comp.phone || '',
      email: comp.email || '',
      currency: comp.currency || 'DOP',
      is_main: comp.is_main
    });
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.name.trim()) return;

    const payload: Partial<Company> = {
      ...(editingCompany?.id ? { id: editingCompany.id } : {}),
      name: compForm.name.trim(),
      trade_name: compForm.trade_name.trim() || compForm.name.trim(),
      rnc: compForm.rnc.trim(),
      id_type: rncValidation.type === 'CEDULA' ? 'CEDULA' : 'RNC',
      tax_regime: compForm.tax_regime,
      address: compForm.address.trim(),
      province: compForm.province,
      municipality: compForm.municipality,
      sector: compForm.sector.trim(),
      phone: compForm.phone.trim(),
      email: compForm.email.trim(),
      currency: compForm.currency,
      is_main: compForm.is_main
    };

    const res = await saveCompany(payload);
    if (res.company) {
      setIsCompanyModalOpen(false);
      setSelectedCompanyId(res.company.id);
    }
  };

  const handleOpenNewBranch = (companyId?: string) => {
    setEditingBranch(null);
    setBranchForm({
      company_id: companyId || selectedCompany?.id || companies[0]?.id || '',
      name: '',
      code: `SUC-${Math.floor(100 + Math.random() * 900)}`,
      address: '',
      province: selectedCompany?.province || 'Distrito Nacional',
      municipality: selectedCompany?.municipality || 'Santo Domingo',
      phone: selectedCompany?.phone || '',
      responsible: ''
    });
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({
      company_id: branch.company_id,
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      province: branch.province || 'Distrito Nacional',
      municipality: branch.municipality || 'Santo Domingo',
      phone: branch.phone || '',
      responsible: branch.responsible || ''
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim() || !branchForm.company_id) return;

    const payload: Partial<Branch> = {
      ...(editingBranch?.id ? { id: editingBranch.id } : {}),
      company_id: branchForm.company_id,
      name: branchForm.name.trim(),
      code: branchForm.code.trim().toUpperCase(),
      address: branchForm.address.trim(),
      province: branchForm.province,
      municipality: branchForm.municipality,
      phone: branchForm.phone.trim(),
      responsible: branchForm.responsible.trim()
    };

    const res = await saveBranch(payload);
    if (res.branch) {
      setIsBranchModalOpen(false);
    }
  };

  const roleDescriptions = [
    {
      role: 'Administrador General',
      code: 'ADMIN',
      desc: 'Control total de la organización, gestión de empresas y sedes, emisión de API Keys, llaves de IA y aprobación definitiva.',
      color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
      badge: 'Acceso Total'
    },
    {
      role: 'Oficial Contable DGII',
      code: 'ACCOUNTANT',
      desc: 'Auditoría fiscal de comprobantes, corrección de NCF, desglose de ITBIS y retenciones, y generación de archivo 606.',
      color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
      badge: 'Fiscal & 606'
    },
    {
      role: 'Supervisor de Área',
      code: 'SUPERVISOR',
      desc: 'Revisión y validación de erogaciones de sus centros de costo antes de ingresar a contabilidad para deducción fiscal.',
      color: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
      badge: 'Aprobaciones'
    },
    {
      role: 'Empleado / Solicitante',
      code: 'EMPLOYEE',
      desc: 'Digitalización y escaneo de comprobantes con cámara o galería móvil, radicación de gastos de caja chica o viáticos.',
      color: 'border-slate-400 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300',
      badge: 'Captura Móvil'
    }
  ];

  const systemSettings = [
    { title: 'Equipo y permisos', description: 'Usuarios, roles y accesos de la organización.', view: 'team', icon: Users },
    { title: 'Categorías y centros de costo', description: 'Clasificación de gastos y presupuestos.', view: 'categories', icon: Layers },
    { title: 'Proveedores y RNC', description: 'Registro y validación de proveedores.', view: 'suppliers', icon: Building2 },
    { title: 'Proyectos y vehículos', description: 'Proyectos, obras y flotilla.', view: 'projects-vehicles', icon: Globe },
    { title: 'Lectura automática', description: 'Configuración de la lectura de comprobantes.', view: 'ai-config', icon: Sparkles },
    { title: 'AllSender ERP', description: 'Conexión y sincronización con el sistema administrativo.', view: 'erp-integration', icon: FileText },
    { title: 'Claves y accesos', description: 'API Keys, webhooks y accesos externos.', view: 'api-keys', icon: Lock },
    { title: 'Pista de auditoría', description: 'Historial de cambios y operaciones.', view: 'audit-logs', icon: ShieldCheck },
    { title: 'Documentación de conexiones', description: 'Guía para conectar otros sistemas.', view: 'api-docs', icon: FileText }
  ] as const;

  const handleSaveOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOrganization || !organizationForm.name.trim() || !organizationForm.rnc.trim()) return;
    await saveOrganization({
      name: organizationForm.name.trim(),
      rnc: organizationForm.rnc.trim(),
      address: organizationForm.address.trim(),
      phone: organizationForm.phone.trim(),
      currency: organizationForm.currency
    });
  };

  const openSystemSetting = (view: string) => {
    setActiveView(view as any);
    navigate(`/company/${view}`);
  };

  return (
    <div id="organization-view" className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Mi Empresa & Sedes
            </h1>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              Multi-Empresa DGII
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organización principal: <strong className="text-slate-700 dark:text-slate-300">{organization?.name || 'AllSender Group'}</strong> (RNC: {organization?.rnc})
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            id="tab-companies"
            onClick={() => setActiveTab('companies')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'companies'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Empresas & Sucursales
          </button>
          <button
            id="tab-roles"
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Matriz de Roles
          </button>
          <button
            id="tab-users"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Equipo ({users.length})
          </button>
          <button
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Configuración del sistema
          </button>
        </div>
      </div>

      {/* TAB 1: EMPRESAS & SUCURSALES */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          {companies.length === 0 ? (
            /* Empty state required */
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900/50 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-800">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Aún no tienes empresas registradas. Crea tu primera empresa para comenzar.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                Configura la razón social, RNC fiscal y sedes de tu empresa para comenzar a emitir comprobantes y procesar con IA.
              </p>
              <button
                id="btn-create-first-company"
                onClick={handleOpenNewCompany}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primera Empresa</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: List of Companies (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Empresas Filiales ({companies.length})
                  </span>
                  <button
                    id="btn-add-company"
                    onClick={handleOpenNewCompany}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Empresa</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {companies.map(comp => {
                    const isSelected = comp.id === selectedCompany?.id;
                    const countBranches = branches.filter(b => b.company_id === comp.id && b.is_active).length;

                    return (
                      <div
                        key={comp.id}
                        id={`company-card-${comp.id}`}
                        onClick={() => {
                          setSelectedCompanyId(comp.id);
                          setCurrentCompany(comp);
                        }}
                        className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {comp.name}
                              </h3>
                              {comp.is_main && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                  Principal
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                              RNC: {formatRnc(comp.rnc)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              title="Editar Empresa"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditCompany(comp);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Desactivar Empresa"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingCompanyId(comp.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate max-w-[200px]">{comp.address || `${comp.municipality}, ${comp.province}`}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {countBranches} {countBranches === 1 ? 'Sede' : 'Sedes'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Company Detail & Branches (7 cols) */}
              {selectedCompany && (
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Company Summary Card */}
                  <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {selectedCompany.tax_regime.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Régimen DGII Activo
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {selectedCompany.name}
                        </h2>
                        {selectedCompany.trade_name && selectedCompany.trade_name !== selectedCompany.name && (
                          <p className="text-xs text-slate-500">Nombre comercial: {selectedCompany.trade_name}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenEditCompany(selectedCompany)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium">RNC Fiscal</span>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {formatRnc(selectedCompany.rnc)}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium">Moneda / País</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {selectedCompany.currency} • RD
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium">Ubicación</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                          {selectedCompany.province}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Branches Section */}
                  <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          Sedes y Sucursales de {selectedCompany.name} ({companyBranches.length})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Centros de costo e imputación territorial para deducción de gastos.
                        </p>
                      </div>

                      <button
                        id="btn-add-branch"
                        onClick={() => handleOpenNewBranch(selectedCompany.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Sede</span>
                      </button>
                    </div>

                    {companyBranches.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                        Esta empresa no tiene sucursales adicionales registradas. Se utiliza la sede principal por defecto.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Código</th>
                              <th className="py-2.5 px-3">Nombre</th>
                              <th className="py-2.5 px-3">Dirección / Provincia</th>
                              <th className="py-2.5 px-3">Encargado</th>
                              <th className="py-2.5 px-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {companyBranches.map(branch => (
                              <tr key={branch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {branch.code}
                                </td>
                                <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                                  {branch.name}
                                </td>
                                <td className="py-3 px-3 text-slate-500">
                                  {branch.address || `${branch.municipality}, ${branch.province}`}
                                </td>
                                <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                  {branch.responsible || 'No asignado'}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleOpenEditBranch(branch)}
                                      className="p-1 rounded text-slate-400 hover:text-blue-600"
                                      title="Editar"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingBranchId(branch.id)}
                                      className="p-1 rounded text-slate-400 hover:text-red-600"
                                      title="Desactivar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MATRIZ DE ROLES */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Matriz de Control y Permisos Basados en Roles (RBAC)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ErogaAI implementa segregación de funciones contables para cumplir con normas de auditoría interna y trazabilidad DGII.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {roleDescriptions.map(r => (
                <div key={r.code} className={`p-4 rounded-xl border ${r.color} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold">{r.role}</h4>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/80">
                        {r.code}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-current/20 flex items-center justify-between text-[10px] font-semibold">
                    <span>Nivel de Acceso:</span>
                    <span>{r.badge}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveView('team')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Gestionar Roles y Matriz RBAC Completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USUARIOS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Usuarios con Acceso a la Organización
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Colaboradores y auditores habilitados para registrar o aprobar gastos.
                </p>
              </div>
              <button
                onClick={() => setActiveView('team')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
              >
                <span>Gestión Completa de Equipo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(u => (
                <div key={u.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={u.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{u.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{u.email} • {u.department || 'Operaciones'}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    Activo
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURACIÓN DEL SISTEMA */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Datos generales de la organización</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Estos datos identifican a la organización en el sistema y en sus reportes.</p>
              </div>
            </div>

            {!canManageOrganization && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Solo un administrador puede modificar estos datos.</span>
              </div>
            )}

            <form onSubmit={handleSaveOrganizationSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre de la organización *</label>
                <input
                  required
                  disabled={!canManageOrganization}
                  value={organizationForm.name}
                  onChange={e => setOrganizationForm({ ...organizationForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">RNC de la organización *</label>
                <input
                  required
                  disabled={!canManageOrganization}
                  value={organizationForm.rnc}
                  onChange={e => setOrganizationForm({ ...organizationForm, rnc: e.target.value })}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
                <input
                  disabled={!canManageOrganization}
                  value={organizationForm.address}
                  onChange={e => setOrganizationForm({ ...organizationForm, address: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <input
                  disabled={!canManageOrganization}
                  value={organizationForm.phone}
                  onChange={e => setOrganizationForm({ ...organizationForm, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Moneda principal</label>
                <select
                  disabled={!canManageOrganization}
                  value={organizationForm.currency}
                  onChange={e => setOrganizationForm({ ...organizationForm, currency: e.target.value as Organization['currency'] })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                >
                  <option value="DOP">DOP - Peso Dominicano (RD$)</option>
                  <option value="USD">USD - Dólar Estadounidense ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                </select>
              </div>
              {canManageOrganization && (
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20">
                    Guardar datos generales
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                Configuración del sistema
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accede desde aquí a todas las opciones disponibles para tu organización.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemSettings.map(setting => {
                const Icon = setting.icon;
                return (
                  <button
                    key={setting.view}
                    type="button"
                    onClick={() => openSystemSetting(setting.view)}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <Icon className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">{setting.title}</span>
                      <span className="block mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{setting.description}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 ml-auto mt-0.5 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Crear / Editar Empresa */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {editingCompany ? 'Editar Empresa Filial' : 'Registrar Nueva Empresa Filial'}
              </h3>
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanySubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Razón Social Oficial (según DGII) *
                  </label>
                  <input
                    type="text"
                    required
                    value={compForm.name}
                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                    placeholder="Ej. Distribuidora Dominicana SRL"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      value={compForm.trade_name}
                      onChange={(e) => setCompForm({ ...compForm, trade_name: e.target.value })}
                      placeholder="Ej. DisDom"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      RNC / Cédula Fiscal *
                    </label>
                    <input
                      type="text"
                      required
                      value={compForm.rnc}
                      onChange={(e) => setCompForm({ ...compForm, rnc: e.target.value })}
                      placeholder="Ej. 131892412 o 00101234567"
                      className={`w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border ${
                        compForm.rnc && !rncValidation.isValid
                          ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                      } text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {compForm.rnc && (
                      <div className="mt-1 text-[11px] flex items-center gap-1">
                        {rncValidation.isValid ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {rncValidation.type === 'CEDULA' ? 'Cédula de Persona Física Válida' : 'RNC Jurídico Válido (DGII)'} ({rncValidation.formatted})
                          </span>
                        ) : (
                          <span className="text-red-500 font-medium">
                            {rncValidation.message || 'Formato de RNC no válido'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Régimen Tributario DGII
                    </label>
                    <select
                      value={compForm.tax_regime}
                      onChange={(e) => setCompForm({ ...compForm, tax_regime: e.target.value as TaxRegimeType })}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="REGIMEN_GENERAL">Régimen General Ordinario (ITBIS 18%)</option>
                      <option value="RST_PERSONAS_FISICAS">RST - Personas Físicas</option>
                      <option value="RST_COMPRAS">RST - Compras / Ventas</option>
                      <option value="ZONA_FRANCA">Zona Franca (Ley 8-90 Exenta)</option>
                      <option value="ORGANISMO_SIN_FINES_LUCRO">ONG / Sin Fines de Lucro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Moneda Base
                    </label>
                    <select
                      value={compForm.currency}
                      onChange={(e) => setCompForm({ ...compForm, currency: e.target.value as any })}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DOP">DOP - Peso Dominicano (RD$)</option>
                      <option value="USD">USD - Dólar Estadounidense ($)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dirección Fiscal
                  </label>
                  <input
                    type="text"
                    value={compForm.address}
                    onChange={(e) => setCompForm({ ...compForm, address: e.target.value })}
                    placeholder="Ej. Av. Winston Churchill #1099, Piantini"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={compForm.province}
                      onChange={(e) => setCompForm({ ...compForm, province: e.target.value })}
                      placeholder="Distrito Nacional"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Municipio / Ciudad
                    </label>
                    <input
                      type="text"
                      value={compForm.municipality}
                      onChange={(e) => setCompForm({ ...compForm, municipality: e.target.value })}
                      placeholder="Santo Domingo"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chk-is-main"
                    checked={compForm.is_main}
                    onChange={(e) => setCompForm({ ...compForm, is_main: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="chk-is-main" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Establecer como empresa principal por defecto de la organización
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  {editingCompany ? 'Guardar Cambios' : 'Registrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Crear / Editar Sucursal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                {editingBranch ? 'Editar Sede / Sucursal' : 'Agregar Sede / Sucursal'}
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranchSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Empresa Vinculada *
                </label>
                <select
                  required
                  value={branchForm.company_id}
                  onChange={(e) => setBranchForm({ ...branchForm, company_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione una empresa...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (RNC: {c.rnc})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de la Sucursal *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    placeholder="Ej. Sede Santiago Los Jardines"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    placeholder="SUC-01"
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dirección Física
                </label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="Ej. Av. 27 de Febrero esq. Metro"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Encargado / Responsable
                </label>
                <input
                  type="text"
                  value={branchForm.responsible}
                  onChange={(e) => setBranchForm({ ...branchForm, responsible: e.target.value })}
                  placeholder="Ej. Lic. Carlos Gómez"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  {editingBranch ? 'Guardar Sucursal' : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMACION DE DESACTIVACION EMPRESA */}
      {deletingCompanyId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ¿Desea desactivar esta empresa filial?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Por requerimientos de auditoría y la DGII, las empresas se <strong>desactivan lógicamente</strong>. Todos los comprobantes y trazabilidad previa se conservarán intactos en la base de datos.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingCompanyId(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await deactivateCompany(deletingCompanyId);
                  setDeletingCompanyId(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20"
              >
                Confirmar Desactivación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACION DE DESACTIVACION SUCURSAL */}
      {deletingBranchId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ¿Desactivar esta sede / sucursal?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                La sucursal quedará inactiva para nuevas erogaciones, preservando los registros existentes.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingBranchId(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await deactivateBranch(deletingBranchId);
                  setDeletingBranchId(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20"
              >
                Desactivar Sede
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
