import { PermissionDefinition, RoleDefinition } from '../src/types.ts';

/**
 * Static permission vocabulary. The mutable role-to-permission matrix is stored
 * in PostgreSQL in roles.permissions; this catalog contains no tenant state.
 */
export const PERMISSIONS: PermissionDefinition[] = [
  { key: 'expenses.view_all', category: 'EXPENSES', category_label: 'Gastos & Comprobantes', name: 'Ver Todos los Gastos', description: 'Visualizar comprobantes de toda la empresa y sedes' },
  { key: 'expenses.create_ocr', category: 'EXPENSES', category_label: 'Gastos & Comprobantes', name: 'Captura OCR con IA', description: 'Escanear facturas y extraer datos fiscales con IA' },
  { key: 'expenses.create_manual', category: 'EXPENSES', category_label: 'Gastos & Comprobantes', name: 'Creación Manual de Gastos', description: 'Registrar gastos manualmente' },
  { key: 'expenses.edit', category: 'EXPENSES', category_label: 'Gastos & Comprobantes', name: 'Editar Comprobantes', description: 'Modificar comprobantes fiscales' },
  { key: 'expenses.delete', category: 'EXPENSES', category_label: 'Gastos & Comprobantes', name: 'Eliminar Comprobantes', description: 'Eliminar comprobantes permitidos' },
  { key: 'approvals.approve_reject', category: 'APPROVALS', category_label: 'Aprobaciones & Flujo', name: 'Aprobar y Rechazar Gastos', description: 'Validar comprobantes para contabilización' },
  { key: 'approvals.request_correction', category: 'APPROVALS', category_label: 'Aprobaciones & Flujo', name: 'Solicitar Correcciones', description: 'Solicitar correcciones a comprobantes' },
  { key: 'approvals.override_budget', category: 'APPROVALS', category_label: 'Aprobaciones & Flujo', name: 'Aprobación Excedente Presupuesto', description: 'Autorizar gastos fuera de presupuesto' },
  { key: 'fiscal.classify_ncf', category: 'DGII_FISCAL', category_label: 'Fiscal DGII & NCF', name: 'Reclasificación Fiscal & NCF', description: 'Modificar clasificación fiscal y NCF' },
  { key: 'fiscal.export_606', category: 'DGII_FISCAL', category_label: 'Fiscal DGII & NCF', name: 'Generar y Exportar Formato 606', description: 'Generar reportes fiscales DGII 606' },
  { key: 'fiscal.retentions', category: 'DGII_FISCAL', category_label: 'Fiscal DGII & NCF', name: 'Gestión de Retenciones ITBIS/ISR', description: 'Gestionar retenciones tributarias' },
  { key: 'erp.sync_expenses', category: 'ERP', category_label: 'Integración ERP', name: 'Sincronizar con AllSender ERP', description: 'Sincronizar comprobantes aprobados con ERP' },
  { key: 'erp.configure', category: 'ERP', category_label: 'Integración ERP', name: 'Parametrizar Conector ERP', description: 'Configurar el conector ERP' },
  { key: 'master.suppliers', category: 'MASTER_DATA', category_label: 'Catálogos & Flotilla', name: 'Gestión de Proveedores & RNC', description: 'Gestionar proveedores y RNC' },
  { key: 'master.projects', category: 'MASTER_DATA', category_label: 'Catálogos & Flotilla', name: 'Gestión de Proyectos & Obras', description: 'Gestionar proyectos y presupuestos' },
  { key: 'master.vehicles', category: 'MASTER_DATA', category_label: 'Catálogos & Flotilla', name: 'Control de Flotilla Vehicular', description: 'Gestionar vehículos y combustible' },
  { key: 'master.cost_centers', category: 'MASTER_DATA', category_label: 'Catálogos & Flotilla', name: 'Centros de Costos & Presupuestos', description: 'Gestionar centros de costos' },
  { key: 'company.manage', category: 'ORGANIZATION', category_label: 'Mi Empresa & Sedes', name: 'Administrar Empresa y Sucursales', description: 'Gestionar empresas, RNCs y sedes' },
  { key: 'team.manage_members', category: 'TEAM_RBAC', category_label: 'Gestión de Equipo & RBAC', name: 'Invitar y Gestionar Colaboradores', description: 'Gestionar usuarios y accesos' },
  { key: 'team.manage_roles', category: 'TEAM_RBAC', category_label: 'Gestión de Equipo & RBAC', name: 'Administrar Roles y Matriz RBAC', description: 'Gestionar roles y permisos' },
  { key: 'apikeys.manage', category: 'API_KEYS', category_label: 'Seguridad & Desarrolladores', name: 'Gestión de API Keys y Webhooks', description: 'Gestionar API keys y webhooks' },
  { key: 'audit.view', category: 'AUDIT', category_label: 'Auditoría & Trazabilidad', name: 'Visualizar Pista de Auditoría', description: 'Consultar trazabilidad y auditoría' }
];

const allPermissionKeys = () => PERMISSIONS.map(permission => permission.key);

export function defaultRolesForOrg(orgId: string): Array<RoleDefinition & { code: string }> {
  const now = new Date().toISOString();
  const role = (code: string, name: string, description: string, color: string, permissions: string[]): RoleDefinition & { code: string } => ({
    id: `${orgId}::${code}`,
    code,
    organization_id: orgId,
    name,
    description,
    is_system: true,
    color,
    permissions,
    created_at: now,
    updated_at: now
  });

  return [
    role('ADMIN', 'Administrador General', 'Acceso total a la organización.', 'slate', allPermissionKeys()),
    role('ACCOUNTANT', 'Contabilidad & DGII', 'Gestión tributaria, comprobantes, DGII y ERP.', 'emerald', [
      'expenses.view_all', 'expenses.create_ocr', 'expenses.create_manual', 'expenses.edit', 'expenses.delete',
      'approvals.approve_reject', 'approvals.request_correction', 'fiscal.classify_ncf', 'fiscal.export_606',
      'fiscal.retentions', 'erp.sync_expenses', 'master.suppliers', 'master.projects', 'master.vehicles',
      'master.cost_centers', 'audit.view'
    ]),
    role('SUPERVISOR', 'Supervisor de Área', 'Revisión y aprobación de comprobantes.', 'amber', [
      'expenses.view_all', 'expenses.create_ocr', 'expenses.create_manual', 'expenses.edit',
      'approvals.approve_reject', 'approvals.request_correction', 'approvals.override_budget',
      'master.suppliers', 'master.projects', 'master.vehicles', 'master.cost_centers'
    ]),
    role('EMPLOYEE', 'Empleado / Operativo', 'Captura y edición de sus comprobantes.', 'blue', [
      'expenses.create_ocr', 'expenses.create_manual', 'expenses.edit'
    ])
  ];
}
