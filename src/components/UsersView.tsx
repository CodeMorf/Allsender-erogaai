import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Briefcase, 
  User as UserIcon, 
  Plus, 
  Check, 
  Mail, 
  Building,
  Key
} from 'lucide-react';
import { User, RoleType, Organization } from '../types.ts';

interface UsersViewProps {
  currentOrg: Organization;
  users: User[];
  currentUser: User;
  onSwitchUser: (user: User) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  currentOrg,
  users,
  currentUser,
  onSwitchUser
}) => {
  const getRoleBadge = (role: RoleType | string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"><ShieldCheck className="w-3.5 h-3.5" /> Administrador</span>;
      case 'ACCOUNTANT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><Briefcase className="w-3.5 h-3.5" /> Contable</span>;
      case 'SUPERVISOR':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><UserCheck className="w-3.5 h-3.5" /> Supervisor</span>;
      case 'EMPLOYEE':
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><UserIcon className="w-3.5 h-3.5" /> Empleado</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Usuarios & Matriz de Permisos (RBAC)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Control de accesos y roles para captura, revisión contable y administración de {currentOrg.name}.
          </p>
        </div>

        <button
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-700/20"
        >
          <Plus className="w-4 h-4" />
          <span>Invitar Usuario</span>
        </button>
      </div>

      {/* Users List Table */}
      <div className="all-card rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-3">Departamento</th>
                <th className="py-3 px-3">Rol Asignado</th>
                <th className="py-3 px-4 text-right">Simulación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {u.name}
                          {u.id === currentUser.id && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                              Actual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    {u.email}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {u.department}
                  </td>
                  <td className="py-3 px-3">
                    {getRoleBadge(u.role)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => onSwitchUser(u)}
                        className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                      >
                        Probar Rol
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Matrix Guide Card */}
      <div className="all-card rounded-2xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Matriz de Privilegios por Rol
        </h2>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Acción / Módulo</th>
                <th className="py-2.5 px-3 text-center">Administrador</th>
                <th className="py-2.5 px-3 text-center">Contable</th>
                <th className="py-2.5 px-3 text-center">Supervisor</th>
                <th className="py-2.5 px-3 text-center">Empleado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">Tomar fotos de comprobantes</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">Aprobar / Rechazar Comprobantes</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300 dark:text-slate-600">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">Exportar Formato DGII 606 & Sync ERP</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300 dark:text-slate-600">-</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">Configurar Modelos de IA & API Keys</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold"><Check className="w-4 h-4 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center text-slate-300 dark:text-slate-600">-</td>
                <td className="py-2.5 px-3 text-center text-slate-300 dark:text-slate-600">-</td>
                <td className="py-2.5 px-3 text-center text-slate-300 dark:text-slate-600">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
