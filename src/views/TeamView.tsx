import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Briefcase, 
  User as UserIcon, 
  Plus, 
  Check, 
  Mail, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Shield, 
  X, 
  Lock, 
  UserPlus,
  Sliders,
  RotateCcw,
  Save,
  Palette,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  Copy
} from 'lucide-react';
import { User, RoleDefinition, PermissionDefinition, RoleType } from '../types.ts';

export const TeamView: React.FC = () => {
  const { 
    organization, 
    currentCompany,
    users, 
    currentUser, 
    roles,
    permissionsCatalog,
    isLoadingRoles,
    saveUser, 
    deactivateUser, 
    switchCurrentUser,
    setUserRole,
    saveRole,
    deleteRole,
    updateRbacMatrix,
    resetRbacMatrix
  } = useApp();

  const [activeTab, setActiveTab] = useState<'members' | 'rbac-matrix'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Matrix local state for batch editing
  const [localMatrix, setLocalMatrix] = useState<Record<string, string[]>>({});
  const [hasUnsavedMatrixChanges, setHasUnsavedMatrixChanges] = useState<boolean>(false);
  const [isSavingMatrix, setIsSavingMatrix] = useState<boolean>(false);

  // Sync local matrix with store roles
  useEffect(() => {
    if (roles && roles.length > 0) {
      const map: Record<string, string[]> = {};
      roles.forEach(r => {
        map[r.id] = [...(r.permissions || [])];
      });
      setLocalMatrix(map);
      setHasUnsavedMatrixChanges(false);
    }
  }, [roles]);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleDefinition> | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // User Form state
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'EMPLOYEE',
    department: 'Operaciones',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Role Form state
  const [roleFormData, setRoleFormData] = useState<{
    name: string;
    description: string;
    color: string;
    permissions: string[];
  }>({
    name: '',
    description: '',
    color: 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    permissions: []
  });
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  const availableColors = [
    { label: 'Plata / Grafito', class: 'border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
    { label: 'Azul Corporativo', class: 'border-blue-500 bg-blue-50/60 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
    { label: 'Esmeralda Fiscal', class: 'border-emerald-500 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { label: 'Ámbar Supervisión', class: 'border-amber-500 bg-amber-50/60 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    { label: 'Índigo Operativo', class: 'border-indigo-500 bg-indigo-50/60 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
    { label: 'Púrpura Auditoría', class: 'border-purple-500 bg-purple-50/60 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
    { label: 'Rosa / Coral', class: 'border-rose-500 bg-rose-50/60 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
    { label: 'Cian / Tecnológico', class: 'border-cyan-500 bg-cyan-50/60 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' }
  ];

  // Grouped permissions by category
  const categories = useMemo(() => {
    const map = new Map<string, { label: string; items: PermissionDefinition[] }>();
    (permissionsCatalog || []).forEach(p => {
      if (!map.has(p.category)) {
        map.set(p.category, { label: p.category_label, items: [] });
      }
      map.get(p.category)!.items.push(p);
    });
    return Array.from(map.entries()).map(([key, val]) => ({
      category: key,
      label: val.label,
      items: val.items
    }));
  }, [permissionsCatalog]);

  // Open modal for new user
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      role: roles[0]?.id || 'EMPLOYEE',
      department: 'Operaciones',
      status: 'ACTIVE'
    });
    setUserFormError(null);
    setIsUserModalOpen(true);
  };

  // Open modal for editing user
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || 'Operaciones',
      status: user.status || 'ACTIVE'
    });
    setUserFormError(null);
    setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);

    if (!userFormData.name.trim()) {
      setUserFormError('Por favor ingresa el nombre completo del colaborador.');
      return;
    }

    if (!userFormData.email.trim()) {
      setUserFormError('Por favor ingresa un correo electrónico corporativo.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userFormData.email)) {
      setUserFormError('El formato del correo electrónico no es válido.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const payload: Partial<User> = {
        ...(editingUser?.id ? { id: editingUser.id } : {}),
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        role: userFormData.role as any,
        department: userFormData.department.trim(),
        status: userFormData.status,
        is_active: userFormData.status === 'ACTIVE'
      };

      const result = await saveUser(payload);
      if (result.error) {
        setUserFormError(result.error);
      } else {
        setIsUserModalOpen(false);
      }
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleConfirmDeactivateUser = async () => {
    if (!deactivatingUserId) return;
    await deactivateUser(deactivatingUserId);
    setDeactivatingUserId(null);
  };

  // Open modal for new role
  const handleOpenNewRole = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
      color: availableColors[4].class,
      permissions: ['expenses.create_ocr', 'expenses.create_manual', 'expenses.edit']
    });
    setRoleFormError(null);
    setIsRoleModalOpen(true);
  };

  // Open modal for edit role
  const handleOpenEditRole = (role: RoleDefinition) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || '',
      color: role.color || availableColors[0].class,
      permissions: [...(localMatrix[role.id] || role.permissions || [])]
    });
    setRoleFormError(null);
    setIsRoleModalOpen(true);
  };

  const handleSaveRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleFormError(null);

    if (!roleFormData.name.trim()) {
      setRoleFormError('Por favor ingresa un nombre para el rol.');
      return;
    }

    setIsSubmittingRole(true);
    try {
      const payload: Partial<RoleDefinition> = {
        ...(editingRole?.id ? { id: editingRole.id } : {}),
        name: roleFormData.name.trim(),
        description: roleFormData.description.trim(),
        color: roleFormData.color,
        permissions: roleFormData.permissions
      };

      const res = await saveRole(payload);
      if (res.error) {
        setRoleFormError(res.error);
      } else {
        setIsRoleModalOpen(false);
      }
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!deletingRoleId) return;
    await deleteRole(deletingRoleId);
    setDeletingRoleId(null);
  };

  // Toggle single permission in local matrix
  const handleTogglePermission = (roleId: string, permKey: string) => {
    if (roleId === 'ADMIN') return; // Admin always has full access

    setLocalMatrix(prev => {
      const currentList = prev[roleId] || [];
      const has = currentList.includes(permKey);
      const nextList = has 
        ? currentList.filter(k => k !== permKey) 
        : [...currentList, permKey];

      return {
        ...prev,
        [roleId]: nextList
      };
    });
    setHasUnsavedMatrixChanges(true);
  };

  // Bulk toggle category permissions for a role
  const handleToggleCategoryForRole = (roleId: string, categoryKeys: string[], shouldGrant: boolean) => {
    if (roleId === 'ADMIN') return;

    setLocalMatrix(prev => {
      const currentList = prev[roleId] || [];
      let nextList: string[];
      if (shouldGrant) {
        nextList = Array.from(new Set([...currentList, ...categoryKeys]));
      } else {
        nextList = currentList.filter(k => !categoryKeys.includes(k));
      }
      return {
        ...prev,
        [roleId]: nextList
      };
    });
    setHasUnsavedMatrixChanges(true);
  };

  // Save full matrix batch
  const handleSaveMatrix = async () => {
    setIsSavingMatrix(true);
    try {
      const updates = Object.entries(localMatrix).map(([roleId, perms]) => ({
        roleId,
        permissions: perms
      }));

      const success = await updateRbacMatrix(updates);
      if (success) {
        setHasUnsavedMatrixChanges(false);
      }
    } finally {
      setIsSavingMatrix(false);
    }
  };

  // Revert matrix changes
  const handleDiscardMatrixChanges = () => {
    const map: Record<string, string[]> = {};
    roles.forEach(r => {
      map[r.id] = [...(r.permissions || [])];
    });
    setLocalMatrix(map);
    setHasUnsavedMatrixChanges(false);
  };

  // Confirm Reset matrix to default
  const handleConfirmResetMatrix = async () => {
    await resetRbacMatrix();
    setIsResetConfirmOpen(false);
  };

  // Quick template copy in Role form
  const handleCopyPermissionsFrom = (sourceRoleId: string) => {
    const source = roles.find(r => r.id === sourceRoleId);
    if (source) {
      setRoleFormData(prev => ({
        ...prev,
        permissions: [...(source.permissions || [])]
      }));
    }
  };

  // Dynamic role badge styling
  const renderRoleBadge = (roleKeyOrId: string) => {
    const foundRole = roles.find(r => r.id === roleKeyOrId || r.name.toLowerCase() === roleKeyOrId.toLowerCase());
    const roleName = foundRole?.name || roleKeyOrId;
    const colorClass = foundRole?.color || 'border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs ${colorClass}`}>
        {foundRole?.id === 'ADMIN' ? (
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        ) : foundRole?.id === 'ACCOUNTANT' ? (
          <Briefcase className="w-3.5 h-3.5 shrink-0" />
        ) : foundRole?.id === 'SUPERVISOR' ? (
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
        ) : foundRole?.is_system ? (
          <UserIcon className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Shield className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
        )}
        <span>{roleName}</span>
      </span>
    );
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.is_active !== false : u.is_active === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div id="team-management-view" className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Active User Simulation Alert Banner */}
      {currentUser && currentUser.role !== 'ADMIN' && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Modo Simulación Activo: Operando como <span className="underline">{currentUser.name}</span> ({currentUser.role})
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                La interfaz y permisos de visualización están adaptados al rol asignado a este colaborador en su entorno SaaS.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUserRole('ADMIN')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            Restablecer a Administrador
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {organization?.name || 'Empresa'}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Entorno SaaS Autónomo
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-800 dark:text-slate-200" />
            Gestión de Equipo & Matriz de Permisos RBAC
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Crea roles a medida, modifica permisos granulares por módulo y administra los colaboradores de tu empresa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleOpenNewRole}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>Crear Rol</span>
          </button>

          <button
            onClick={handleOpenNewUser}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white dark:from-slate-100 dark:to-slate-200 dark:text-slate-900 shadow-md shadow-slate-900/10 active:scale-98 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invitar Colaborador</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Miembros del Equipo ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rbac-matrix')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'rbac-matrix'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Matriz de Permisos por Rol ({roles.length} roles)</span>
          </button>
        </div>

        {activeTab === 'rbac-matrix' && hasUnsavedMatrixChanges && (
          <div className="flex items-center gap-2 pb-2">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Hay cambios sin guardar
            </span>
            <button
              onClick={handleDiscardMatrixChanges}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Descartar
            </button>
            <button
              onClick={handleSaveMatrix}
              disabled={isSavingMatrix}
              className="px-3.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingMatrix ? 'Guardando...' : 'Guardar Matriz'}</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: MEMBERS LIST */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o departamento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                aria-label="Filtrar colaboradores por rol"
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">Todos los Roles ({roles.length})</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.is_system ? '(Sistema)' : '(Personalizado)'}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                aria-label="Filtrar colaboradores por estado de actividad"
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Correo Electrónico</th>
                    <th className="py-3 px-3">Departamento</th>
                    <th className="py-3 px-3">Rol Asignado</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">No se encontraron colaboradores con estos filtros.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Prueba ajustando el término de búsqueda o agrega un nuevo colaborador.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const isCurrent = currentUser?.id === user.id;
                      const isActive = user.is_active !== false && user.status !== 'INACTIVE';

                      return (
                        <tr 
                          key={user.id} 
                          className={`hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors ${
                            isCurrent ? 'bg-slate-50/80 dark:bg-slate-800/40' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={user.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                      Tú (Sesión Actual)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block">{currentCompany?.name || 'Sede Principal'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {user.email}
                          </td>

                          <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                            {user.department || 'Operaciones'}
                          </td>

                          <td className="py-3.5 px-3">
                            {renderRoleBadge(user.role)}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                <XCircle className="w-3 h-3" /> Inactivo
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Switch Simulation */}
                              {!isCurrent && (
                                <button
                                  onClick={() => switchCurrentUser(user)}
                                  title={`Simular sesión como ${user.name}`}
                                  className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Shield className="w-3 h-3 text-slate-400" />
                                  <span>Simular</span>
                                </button>
                              )}

                              {/* Edit User */}
                              <button
                                onClick={() => handleOpenEditUser(user)}
                                title="Editar colaborador"
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Deactivate User */}
                              {!isCurrent && isActive && (
                                <button
                                  onClick={() => setDeactivatingUserId(user.id)}
                                  title="Desactivar acceso"
                                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RBAC MATRIX & ROLES MANAGEMENT */}
      {activeTab === 'rbac-matrix' && (
        <div className="space-y-6">
          
          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {roles.map(role => {
              const assignedUsersCount = users.filter(u => u.role === role.id || u.role === role.name).length;
              const permissionsCount = (localMatrix[role.id] || role.permissions || []).length;
              const isSystem = Boolean(role.is_system);

              return (
                <div 
                  key={role.id} 
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {renderRoleBadge(role.id)}
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditRole(role)}
                          title="Editar rol y descripción"
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {!isSystem && (
                          <button
                            onClick={() => setDeletingRoleId(role.id)}
                            title="Eliminar rol personalizado"
                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {role.description || 'Sin descripción asignada.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      {permissionsCount} / {permissionsCatalog.length} permisos
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {assignedUsersCount} {assignedUsersCount === 1 ? 'miembro' : 'miembros'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matrix Header Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Matriz de Control de Acceso Granular por Rol
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Haz clic en cualquier casilla para conceder o revocar permisos específicos en tu entorno.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                aria-label="Filtrar permisos por módulo"
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="ALL">Todos los Módulos ({categories.length})</option>
                {categories.map(c => (
                  <option key={c.category} value={c.category}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Reset to defaults button */}
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Restablecer roles y permisos predeterminados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              {/* Save matrix button */}
              {hasUnsavedMatrixChanges && (
                <button
                  onClick={handleSaveMatrix}
                  disabled={isSavingMatrix}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingMatrix ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 w-2/5 min-w-[280px]">Permiso Funcional / Operación</th>
                    {roles.map(role => (
                      <th key={role.id} className="py-3 px-3 text-center min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>{role.name}</span>
                          {role.id === 'ADMIN' ? (
                            <span className="text-[9px] font-normal text-slate-400 lowercase">(fijo total)</span>
                          ) : (
                            <span className="text-[9px] font-normal text-slate-400 lowercase">(editable)</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categories
                    .filter(cat => selectedCategoryFilter === 'ALL' || cat.category === selectedCategoryFilter)
                    .map(cat => {
                      const categoryPermKeys = cat.items.map(i => i.key);

                      return (
                        <React.Fragment key={cat.category}>
                          {/* Category Header Row */}
                          <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-bold">
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 flex items-center justify-between">
                              <span className="text-xs uppercase tracking-wider">{cat.label}</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                {cat.items.length} permisos
                              </span>
                            </td>

                            {roles.map(role => {
                              const rolePerms = localMatrix[role.id] || role.permissions || [];
                              const allGranted = categoryPermKeys.every(k => rolePerms.includes(k));
                              const someGranted = categoryPermKeys.some(k => rolePerms.includes(k));

                              if (role.id === 'ADMIN') {
                                return (
                                  <td key={role.id} className="py-2.5 px-3 text-center text-slate-400 text-[10px]">
                                    Total
                                  </td>
                                );
                              }

                              return (
                                <td key={role.id} className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => handleToggleCategoryForRole(role.id, categoryPermKeys, !allGranted)}
                                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                  >
                                    {allGranted ? 'Desmarcar todos' : 'Marcar todos'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>

                          {/* Category Items */}
                          {cat.items.map(perm => (
                            <tr key={perm.key} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {perm.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                  {perm.description}
                                </div>
                              </td>

                              {roles.map(role => {
                                const isRoleAdmin = role.id === 'ADMIN';
                                const rolePerms = localMatrix[role.id] || role.permissions || [];
                                const isGranted = isRoleAdmin || rolePerms.includes(perm.key);

                                return (
                                  <td key={role.id} className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      disabled={isRoleAdmin}
                                      onClick={() => handleTogglePermission(role.id, perm.key)}
                                      className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-all ${
                                        isRoleAdmin
                                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                                          : isGranted
                                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900 cursor-pointer shadow-xs active:scale-90'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-90'
                                      }`}
                                      title={
                                        isRoleAdmin
                                          ? 'El Administrador posee todos los permisos de forma inherente'
                                          : isGranted
                                          ? `Permiso concedido para ${role.name}. Clic para revocar.`
                                          : `Permiso denegado para ${role.name}. Clic para conceder.`
                                      }
                                    >
                                      {isGranted ? (
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                      ) : (
                                        <X className="w-4 h-4 stroke-[2]" />
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Invitar / Editar Colaborador */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                {editingUser ? 'Editar Miembro del Equipo' : 'Invitar Nuevo Colaborador'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-4">
              {userFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lic. Carlos Gómez"
                    value={userFormData.name}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Correo Electrónico Corporativo *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="cgomez@miempresa.com.do"
                    value={userFormData.email}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rol Asignado *
                    </label>
                    <select
                      value={userFormData.role}
                      onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.is_system ? '(Sistema)' : '(Personalizado)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Departamento
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Contabilidad, Ventas..."
                      value={userFormData.department}
                      onChange={e => setUserFormData({ ...userFormData, department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estado de Acceso
                  </label>
                  <select
                    value={userFormData.status}
                    onChange={e => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="ACTIVE">Activo - Permite inicio de sesión y uso del sistema</option>
                    <option value="INACTIVE">Inactivo - Bloquear acceso a la plataforma</option>
                  </select>
                </div>
              </div>

              {/* Informative hint about the selected role */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <span className="font-bold block text-slate-800 dark:text-slate-200">
                  Permisos del Rol ({roles.find(r => r.id === userFormData.role)?.name || userFormData.role}):
                </span>
                <p>
                  {roles.find(r => r.id === userFormData.role)?.description || 'Acceso configurable desde la matriz RBAC.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUser ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Confirmar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Crear / Editar Rol Personalizado */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                {editingRole ? `Editar Rol: ${editingRole.name}` : 'Crear Nuevo Rol Personalizado'}
              </h3>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleSubmit} className="space-y-4">
              {roleFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{roleFormError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Rol *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Auditor Externo, Asistente de Compras, Tesorero..."
                    value={roleFormData.name}
                    onChange={e => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Descripción / Propósito del Rol
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe las responsabilidades y alcance de este rol..."
                    value={roleFormData.description}
                    onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    Color de Identificación
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableColors.map(c => (
                      <button
                        type="button"
                        key={c.class}
                        onClick={() => setRoleFormData({ ...roleFormData, color: c.class })}
                        className={`p-2 rounded-xl text-left border text-[11px] font-bold transition-all cursor-pointer ${c.class} ${
                          roleFormData.color === c.class ? 'ring-2 ring-slate-900 dark:ring-white scale-102' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template picker for initial permissions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copiar Permisos de Plantilla (Opcional)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {roles.map(r => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => handleCopyPermissionsFrom(r.id)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Copiar de {r.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRoleFormData({ ...roleFormData, permissions: [] })}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Limpiar todos
                    </button>
                  </div>
                </div>

                {/* Direct quick permission selector inside role modal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Permisos Asignados ({roleFormData.permissions.length} seleccionados)
                  </label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60 max-h-48 overflow-y-auto space-y-3 divide-y divide-slate-200 dark:divide-slate-700">
                    {categories.map(cat => (
                      <div key={cat.category} className="pt-2 first:pt-0 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          {cat.label}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {cat.items.map(p => {
                            const isChecked = roleFormData.permissions.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setRoleFormData({
                                        ...roleFormData,
                                        permissions: [...roleFormData.permissions, p.key]
                                      });
                                    } else {
                                      setRoleFormData({
                                        ...roleFormData,
                                        permissions: roleFormData.permissions.filter(k => k !== p.key)
                                      });
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
                                />
                                <span className="truncate" title={p.description}>{p.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRole ? 'Guardando...' : editingRole ? 'Actualizar Rol' : 'Guardar Rol Personalizado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Role */}
      {deletingRoleId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ¿Eliminar rol personalizado?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta acción eliminará la definición del rol para tu organización. Asegúrate de reasignar a cualquier colaborador con este rol previamente.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingRoleId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteRole}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Sí, Eliminar Rol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset RBAC Matrix */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ¿Restablecer Matriz RBAC a Valores Predeterminados?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se restaurarán las asignaciones de permisos originales para Administrador, Contabilidad DGII, Supervisor y Empleado. Los roles personalizados que hayas creado se conservarán.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmResetMatrix}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Sí, Restablecer Matriz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Deactivate User */}
      {deactivatingUserId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ¿Desactivar acceso a este colaborador?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                El usuario ya no podrá iniciar sesión ni cargar comprobantes. Los comprobantes previamente cargados se mantendrán intactos para fines de auditoría DGII.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeactivatingUserId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeactivateUser}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Sí, Desactivar Acceso
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
