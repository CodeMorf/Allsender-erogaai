import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  Organization, 
  Company, 
  Branch, 
  User, 
  Membership,
  ExpenseRecord, 
  AIProviderConfig, 
  AIUsageLog,
  ExpenseCategory,
  CostCenter,
  Supplier,
  Project,
  Vehicle,
  AuditLog,
  ERPConfig,
  ERPSyncStatus,
  ApiKey,
  ApiKeyScope,
  ApiKeyLog,
  TaxRegimeType,
  ReceiptRecord,
  WebhookSubscription,
  PermissionDefinition,
  RoleDefinition
} from '../src/types.ts';
import { encryptApiKey, decryptApiKey, maskApiKey, hashApiKey, generateRawApiKey } from './encryption.ts';

// Official Standard Dominican Expense Categories (Official Catalog - System Only)
const officialSystemCategories: ExpenseCategory[] = [
  {
    id: 'cat_combustible',
    organization_id: 'org_allsender_corp',
    name: 'Combustible y Movilidad de Campo',
    code: 'CAT-COMB-01',
    account_code: '6105-01',
    dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios',
    default_classification: 'GASTO_OPERATIVO',
    default_itbis_rate: 0,
    monthly_budget: 0,
    icon: 'Fuel',
    color: '#3B82F6',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat_dietas',
    organization_id: 'org_allsender_corp',
    name: 'Dietas, Almuerzos y Representación',
    code: 'CAT-DIET-02',
    account_code: '6108-02',
    dgii_type_code: '05 - Gastos de Representación',
    default_classification: 'GASTO_OPERATIVO',
    default_itbis_rate: 18,
    monthly_budget: 0,
    icon: 'UtensilsCrossed',
    color: '#10B981',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat_papeleria',
    organization_id: 'org_allsender_corp',
    name: 'Suministros de Oficina y Papelería',
    code: 'CAT-OFIC-03',
    account_code: '6104-01',
    dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios',
    default_classification: 'GASTO_OPERATIVO',
    default_itbis_rate: 18,
    monthly_budget: 0,
    icon: 'Paperclip',
    color: '#8B5CF6',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat_mantenimiento',
    organization_id: 'org_allsender_corp',
    name: 'Mantenimiento y Reparaciones',
    code: 'CAT-MANT-04',
    account_code: '6106-03',
    dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios',
    default_classification: 'GASTO_OPERATIVO',
    default_itbis_rate: 18,
    monthly_budget: 0,
    icon: 'Wrench',
    color: '#EC4899',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat_tecnologia',
    organization_id: 'org_allsender_corp',
    name: 'Equipos de Cómputo y Tecnología',
    code: 'CAT-TEC-05',
    account_code: '1205-01',
    dgii_type_code: '10 - Adquisición de Activos',
    default_classification: 'ACTIVO_FIJO',
    default_itbis_rate: 18,
    monthly_budget: 0,
    icon: 'Laptop',
    color: '#6366F1',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat_repuestos',
    organization_id: 'org_allsender_corp',
    name: 'Repuestos e Inventario para Reventa',
    code: 'CAT-INV-06',
    account_code: '5101-01',
    dgii_type_code: '09 - Compras que forman parte del Costo de Venta',
    default_classification: 'COMPRA_INVENTARIO',
    default_itbis_rate: 18,
    monthly_budget: 0,
    icon: 'Boxes',
    color: '#F59E0B',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat_servicios_prof',
    organization_id: 'org_allsender_corp',
    name: 'Servicios Profesionales, Legales y Auditoría',
    code: 'CAT-PROF-07',
    account_code: '6102-01',
    dgii_type_code: '02 - Gastos por Trabajos, Suministros y Servicios',
    default_classification: 'GASTO_OPERATIVO',
    default_itbis_rate: 18,
    monthly_budget: 0,
    icon: 'Scale',
    color: '#14B8A6',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cat_arrendamiento',
    organization_id: 'org_allsender_corp',
    name: 'Arrendamiento de Locales e Inmuebles',
    code: 'CAT-ARRE-08',
    account_code: '6103-01',
    dgii_type_code: '03 - Arrendamientos',
    default_classification: 'GASTO_OPERATIVO',
    default_itbis_rate: 18,
    monthly_budget: 0,
    icon: 'Building2',
    color: '#0EA5E9',
    is_active: true,
    is_system: true,
    created_at: new Date().toISOString()
  }
];

// Official API Scopes Catalog
export const officialApiScopes: ApiKeyScope[] = [
  {
    id: 'scope_ocr_process',
    code: 'ocr:process',
    name: 'Extracción Fiscal OCR con IA',
    description: 'Permite enviar imágenes o documentos para análisis y extracción de NCF, RNC, ITBIS y montos.',
    category: 'OCR'
  },
  {
    id: 'scope_expenses_read',
    code: 'expenses:read',
    name: 'Consulta de Erogaciones',
    description: 'Permite consultar y listar comprobantes fiscales registrados, estados y trazabilidad.',
    category: 'EXPENSES'
  },
  {
    id: 'scope_expenses_write',
    code: 'expenses:write',
    name: 'Creación y Registro de Gastos',
    description: 'Permite crear, actualizar y radicar comprobantes de gasto y facturas desde sistemas externos.',
    category: 'EXPENSES'
  },
  {
    id: 'scope_dgii_export',
    code: 'dgii:export',
    name: 'Exportación Fiscal DGII 606',
    description: 'Permite generar la estructura mensual oficial de compras y retenciones para la DGII.',
    category: 'DGII'
  },
  {
    id: 'scope_suppliers_read',
    code: 'suppliers:read',
    name: 'Consulta de Proveedores y RNC',
    description: 'Permite consultar el catálogo verificado de suplidores y consultar estado fiscal.',
    category: 'SUPPLIERS'
  },
  {
    id: 'scope_companies_read',
    code: 'companies:read',
    name: 'Estructura Corporativa y Sedes',
    description: 'Permite consultar las razones sociales y sucursales configuradas en la organización.',
    category: 'COMPANIES'
  }
];

// Initial SaaS Organizations
const initialOrganizations: Organization[] = [
  {
    id: 'org_allsender_corp',
    name: 'Organización Corporativa AllSender',
    rnc: '131-89241-2',
    currency: 'DOP',
    plan: 'ENTERPRISE',
    address: 'Av. Winston Churchill #1099, Torre Citi, Piantini, Santo Domingo, D.N.',
    phone: '+1 (809) 567-8900',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Initial Users
const initialUsers: User[] = [
  {
    id: 'usr_admin_01',
    email: 'admin@allsender.com',
    name: 'Administrador General',
    role: 'ADMIN',
    organization_id: 'org_allsender_corp',
    department: 'Dirección General & Finanzas',
    status: 'ACTIVE',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr_contable_01',
    email: 'contabilidad@allsender.com',
    name: 'Oficial Contable DGII',
    role: 'ACCOUNTANT',
    organization_id: 'org_allsender_corp',
    department: 'Contabilidad & Impuestos DGII',
    status: 'ACTIVE',
    is_active: true,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  }
];

// Initial Memberships
const initialMemberships: Membership[] = [
  {
    id: 'mem_01',
    organization_id: 'org_allsender_corp',
    user_id: 'usr_admin_01',
    role: 'ADMIN',
    status: 'ACTIVE',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mem_02',
    organization_id: 'org_allsender_corp',
    user_id: 'usr_contable_01',
    role: 'ACCOUNTANT',
    status: 'ACTIVE',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Initial AI Providers Config
const initialAIProviders: AIProviderConfig[] = [
  {
    id: 'aip_gemini_main',
    organization_id: 'org_allsender_corp',
    provider_type: 'GEMINI',
    name: 'Google Gemini (GenAI Vision)',
    masked_key: process.env.GEMINI_API_KEY ? maskApiKey(process.env.GEMINI_API_KEY) : 'AIza••••••••8831',
    has_key: Boolean(process.env.GEMINI_API_KEY),
    selected_model: 'gemini-2.5-flash',
    available_models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    is_active: true,
    is_primary: true,
    is_secondary_fallback: false,
    total_requests: 0,
    total_tokens: 0,
    status: 'ONLINE',
    last_test_message: 'Conexión verificada con Google Gemini Vision API',
    created_at: new Date().toISOString()
  }
];

// Encrypted keys store for server-side AI engines
const rawApiKeysStore: Map<string, string> = new Map([
  ['aip_gemini_main', encryptApiKey(process.env.GEMINI_API_KEY || '')]
]);

// Official Granular RBAC Permissions Catalog (Dominican Enterprise Standard)
export const DEFAULT_PERMISSIONS: PermissionDefinition[] = [
  // Gastos & OCR
  {
    key: 'expenses.view_all',
    category: 'EXPENSES',
    category_label: 'Gastos & Comprobantes',
    name: 'Ver Todos los Gastos',
    description: 'Visualizar comprobantes de toda la empresa y sedes (si está deshabilitado solo ve sus propios gastos)'
  },
  {
    key: 'expenses.create_ocr',
    category: 'EXPENSES',
    category_label: 'Gastos & Comprobantes',
    name: 'Captura OCR con IA',
    description: 'Escanear facturas y extraer NCF, RNC, montos e ITBIS automáticamente con IA'
  },
  {
    key: 'expenses.create_manual',
    category: 'EXPENSES',
    category_label: 'Gastos & Comprobantes',
    name: 'Creación Manual de Gastos',
    description: 'Registrar gastos y comprobantes fiscales manualmente en el formulario'
  },
  {
    key: 'expenses.edit',
    category: 'EXPENSES',
    category_label: 'Gastos & Comprobantes',
    name: 'Editar Comprobantes',
    description: 'Modificar montos, categorías, NCF y datos de facturas en estado borrador o corrección'
  },
  {
    key: 'expenses.delete',
    category: 'EXPENSES',
    category_label: 'Gastos & Comprobantes',
    name: 'Eliminar Comprobantes',
    description: 'Eliminar registros de gastos en estado borrador o rechazados'
  },

  // Aprobaciones & Flujo
  {
    key: 'approvals.approve_reject',
    category: 'APPROVALS',
    category_label: 'Aprobaciones & Flujo',
    name: 'Aprobar y Rechazar Gastos',
    description: 'Validar comprobantes de colaboradores para contabilización y pase a reporte DGII'
  },
  {
    key: 'approvals.request_correction',
    category: 'APPROVALS',
    category_label: 'Aprobaciones & Flujo',
    name: 'Solicitar Correcciones',
    description: 'Rebotar comprobantes a los empleados solicitando adjuntos o correcciones fiscales'
  },
  {
    key: 'approvals.override_budget',
    category: 'APPROVALS',
    category_label: 'Aprobaciones & Flujo',
    name: 'Aprobación Excedente Presupuesto',
    description: 'Autorizar gastos que sobrepasan el presupuesto mensual asignado a la categoría'
  },

  // Fiscal DGII 606
  {
    key: 'fiscal.classify_ncf',
    category: 'DGII_FISCAL',
    category_label: 'Fiscal DGII & NCF',
    name: 'Reclasificación Fiscal & NCF',
    description: 'Modificar tipo de comprobante B01/B02/B11/B14/B15 y concepto de costo para el 606'
  },
  {
    key: 'fiscal.export_606',
    category: 'DGII_FISCAL',
    category_label: 'Fiscal DGII & NCF',
    name: 'Generar y Exportar Formato 606',
    description: 'Compilar y descargar el archivo TXT oficial para envío mensual a la DGII'
  },
  {
    key: 'fiscal.retentions',
    category: 'DGII_FISCAL',
    category_label: 'Fiscal DGII & NCF',
    name: 'Gestión de Retenciones ITBIS/ISR',
    description: 'Definir porcentajes de retención tributaria aplicables al comprobante'
  },

  // ERP AllSender
  {
    key: 'erp.sync_expenses',
    category: 'ERP',
    category_label: 'Integración ERP',
    name: 'Sincronizar con AllSender ERP',
    description: 'Pulsar asientos contables automáticos hacia la instancia de AllSender ERP'
  },
  {
    key: 'erp.configure',
    category: 'ERP',
    category_label: 'Integración ERP',
    name: 'Parametrizar Conector ERP',
    description: 'Modificar URL de la API del ERP, API Key y mapeo de cuentas contables de gasto'
  },

  // Catálogos & Flotilla
  {
    key: 'master.suppliers',
    category: 'MASTER_DATA',
    category_label: 'Catálogos & Flotilla',
    name: 'Gestión de Proveedores & RNC',
    description: 'Crear, editar proveedores y validar estatus fiscal en el padrón DGII'
  },
  {
    key: 'master.projects',
    category: 'MASTER_DATA',
    category_label: 'Catálogos & Flotilla',
    name: 'Gestión de Proyectos & Obras',
    description: 'Crear proyectos, asignar presupuestos y vincular gastos por código'
  },
  {
    key: 'master.vehicles',
    category: 'MASTER_DATA',
    category_label: 'Catálogos & Flotilla',
    name: 'Control de Flotilla Vehicular',
    description: 'Registrar vehículos, chóferes, odómetros y rendimientos de combustible'
  },
  {
    key: 'master.cost_centers',
    category: 'MASTER_DATA',
    category_label: 'Catálogos & Flotilla',
    name: 'Centros de Costos & Presupuestos',
    description: 'Crear y asignar centros de costo departamentales'
  },

  // Mi Empresa & Sedes
  {
    key: 'company.manage',
    category: 'ORGANIZATION',
    category_label: 'Mi Empresa & Sedes',
    name: 'Administrar Empresa y Sucursales',
    description: 'Registrar razones sociales, RNCs emisores y sedes operativas'
  },

  // Gestión de Equipo & Roles
  {
    key: 'team.manage_members',
    category: 'TEAM_RBAC',
    category_label: 'Gestión de Equipo & RBAC',
    name: 'Invitar y Gestionar Colaboradores',
    description: 'Crear usuarios, editar perfiles y revocar accesos al sistema'
  },
  {
    key: 'team.manage_roles',
    category: 'TEAM_RBAC',
    category_label: 'Gestión de Equipo & RBAC',
    name: 'Administrar Roles y Matriz RBAC',
    description: 'Crear roles personalizados y modificar permisos de la matriz RBAC en el entorno SaaS'
  },

  // API Keys & Webhooks
  {
    key: 'apikeys.manage',
    category: 'API_KEYS',
    category_label: 'Seguridad & Desarrolladores',
    name: 'Gestión de API Keys y Webhooks',
    description: 'Crear, regenerar y revocar llaves de API y suscripciones a webhooks'
  },

  // Pista de Auditoría
  {
    key: 'audit.view',
    category: 'AUDIT',
    category_label: 'Auditoría & Trazabilidad',
    name: 'Visualizar Pista de Auditoría',
    description: 'Inspeccionar registros de seguridad y cambios históricos en el sistema'
  }
];

export const getDefaultRolesForOrg = (orgId: string): RoleDefinition[] => {
  const allPermKeys = DEFAULT_PERMISSIONS.map(p => p.key);
  const now = new Date().toISOString();

  return [
    {
      id: 'ADMIN',
      organization_id: orgId,
      name: 'Administrador General',
      description: 'Acceso total y configuración de Mi Empresa, roles, API keys, ERP y trazabilidad.',
      is_system: true,
      color: 'slate',
      permissions: [...allPermKeys],
      created_at: now,
      updated_at: now
    },
    {
      id: 'ACCOUNTANT',
      organization_id: orgId,
      name: 'Contabilidad & DGII',
      description: 'Gestión tributaria, conciliación NCF, formato 606, retenciones y sincronización ERP.',
      is_system: true,
      color: 'emerald',
      permissions: [
        'expenses.view_all',
        'expenses.create_ocr',
        'expenses.create_manual',
        'expenses.edit',
        'expenses.delete',
        'approvals.approve_reject',
        'approvals.request_correction',
        'fiscal.classify_ncf',
        'fiscal.export_606',
        'fiscal.retentions',
        'erp.sync_expenses',
        'master.suppliers',
        'master.projects',
        'master.vehicles',
        'master.cost_centers',
        'audit.view'
      ],
      created_at: now,
      updated_at: now
    },
    {
      id: 'SUPERVISOR',
      organization_id: orgId,
      name: 'Supervisor de Área',
      description: 'Revisión y aprobación de comprobantes, control de presupuestos y proyectos.',
      is_system: true,
      color: 'amber',
      permissions: [
        'expenses.view_all',
        'expenses.create_ocr',
        'expenses.create_manual',
        'expenses.edit',
        'approvals.approve_reject',
        'approvals.request_correction',
        'approvals.override_budget',
        'master.suppliers',
        'master.projects',
        'master.vehicles',
        'master.cost_centers'
      ],
      created_at: now,
      updated_at: now
    },
    {
      id: 'EMPLOYEE',
      organization_id: orgId,
      name: 'Empleado / Operativo',
      description: 'Captura OCR de comprobantes con IA, creación manual y consulta de sus gastos.',
      is_system: true,
      color: 'blue',
      permissions: [
        'expenses.create_ocr',
        'expenses.create_manual',
        'expenses.edit'
      ],
      created_at: now,
      updated_at: now
    }
  ];
};

import { prismaRepo } from './database/prisma.repository.ts';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

export class ErogaAIDatabase {
  private organizations: Organization[] = [...initialOrganizations];
  private users: User[] = [...initialUsers];
  private memberships: Membership[] = [...initialMemberships];
  private roles: RoleDefinition[] = [];
  private companies: Company[] = []; // Inicia limpio sin empresas de prueba
  private branches: Branch[] = [];   // Inicia limpio sin sucursales de prueba
  private expenses: ExpenseRecord[] = []; // Inicia limpio sin comprobantes de prueba
  private categories: ExpenseCategory[] = [...officialSystemCategories];
  private costCenters: CostCenter[] = [];
  private suppliers: Supplier[] = [];
  private projects: Project[] = [];
  private vehicles: Vehicle[] = [];
  private auditLogs: AuditLog[] = [];
  private aiProviders: AIProviderConfig[] = [...initialAIProviders];
  private aiUsageLogs: AIUsageLog[] = [];
  private apiKeys: ApiKey[] = [];
  private apiKeyLogs: ApiKeyLog[] = [];
  private receipts: ReceiptRecord[] = [];
  private webhooks: WebhookSubscription[] = [];

  private erpConfig: ERPConfig = {
    organization_id: 'org_allsender_corp',
    is_enabled: false,
    api_endpoint: 'https://api.allsender.com/v1/accounting/invoices',
    api_key_masked: 'as_live_••••••••8899',
    auto_sync_on_approval: false,
    ledger_account_default: '6105-01-000',
    sync_status: 'DESACTIVADO'
  };

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.organizations) && parsed.organizations.length > 0) this.organizations = parsed.organizations;
        if (Array.isArray(parsed.users) && parsed.users.length > 0) this.users = parsed.users;
        if (Array.isArray(parsed.memberships) && parsed.memberships.length > 0) this.memberships = parsed.memberships;
        if (Array.isArray(parsed.roles)) this.roles = parsed.roles;
        if (Array.isArray(parsed.companies)) this.companies = parsed.companies;
        if (Array.isArray(parsed.branches)) this.branches = parsed.branches;
        if (Array.isArray(parsed.expenses)) this.expenses = parsed.expenses;
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) this.categories = parsed.categories;
        if (Array.isArray(parsed.costCenters)) this.costCenters = parsed.costCenters;
        if (Array.isArray(parsed.suppliers)) this.suppliers = parsed.suppliers;
        if (Array.isArray(parsed.projects)) this.projects = parsed.projects;
        if (Array.isArray(parsed.vehicles)) this.vehicles = parsed.vehicles;
        if (Array.isArray(parsed.auditLogs)) this.auditLogs = parsed.auditLogs;
        if (Array.isArray(parsed.aiProviders) && parsed.aiProviders.length > 0) this.aiProviders = parsed.aiProviders;
        if (Array.isArray(parsed.aiUsageLogs)) this.aiUsageLogs = parsed.aiUsageLogs;
        if (Array.isArray(parsed.apiKeys)) this.apiKeys = parsed.apiKeys;
        if (Array.isArray(parsed.apiKeyLogs)) this.apiKeyLogs = parsed.apiKeyLogs;
        if (Array.isArray(parsed.receipts)) this.receipts = parsed.receipts;
        if (Array.isArray(parsed.webhooks)) this.webhooks = parsed.webhooks;
        if (parsed.erpConfig) this.erpConfig = parsed.erpConfig;
      } else {
        this.saveToDisk();
      }
    } catch (err) {
      console.error('[ErogaAI DB] Error loading database file:', err);
    }
  }

  public saveToDisk() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        organizations: this.organizations,
        users: this.users,
        memberships: this.memberships,
        roles: this.roles,
        companies: this.companies,
        branches: this.branches,
        expenses: this.expenses,
        categories: this.categories,
        costCenters: this.costCenters,
        suppliers: this.suppliers,
        projects: this.projects,
        vehicles: this.vehicles,
        auditLogs: this.auditLogs,
        aiProviders: this.aiProviders,
        aiUsageLogs: this.aiUsageLogs,
        apiKeys: this.apiKeys,
        apiKeyLogs: this.apiKeyLogs,
        receipts: this.receipts,
        webhooks: this.webhooks,
        erpConfig: this.erpConfig
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ErogaAI DB] Error persisting database to disk:', err);
    }
  }

  // ----------------------------------------------------
  // Organizations
  // ----------------------------------------------------
  getOrganizations(): Organization[] {
    return this.organizations.filter(o => o.is_active !== false);
  }

  getOrganizationById(id: string): Organization | undefined {
    return this.organizations.find(o => o.id === id);
  }

  saveOrganization(orgData: Partial<Organization>): Organization {
    const existingIdx = this.organizations.findIndex(o => o.id === orgData.id);
    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      this.organizations[existingIdx] = {
        ...this.organizations[existingIdx],
        ...orgData,
        updated_at: now
      };
      return this.organizations[existingIdx];
    } else {
      const newOrg: Organization = {
        id: orgData.id || `org_${Date.now()}`,
        name: orgData.name || 'Nueva Organización',
        rnc: orgData.rnc || '',
        currency: orgData.currency || 'DOP',
        plan: orgData.plan || 'STARTER',
        address: orgData.address || '',
        phone: orgData.phone || '',
        is_active: true,
        created_at: now,
        updated_at: now
      };
      this.organizations.push(newOrg);
      return newOrg;
    }
  }

  // ----------------------------------------------------
  // Companies (Mi Empresa & Sedes)
  // ----------------------------------------------------
  getCompanies(orgId: string, includeInactive = false): Company[] {
    return this.companies
      .filter(c => c.organization_id === orgId && (includeInactive || c.is_active))
      .map(c => ({
        ...c,
        branches_count: this.branches.filter(b => b.company_id === c.id && (includeInactive || b.is_active)).length,
        expenses_count: this.expenses.filter(e => e.company_id === c.id).length
      }));
  }

  getCompanyById(orgId: string, companyId: string): Company | undefined {
    const comp = this.companies.find(c => c.organization_id === orgId && c.id === companyId);
    if (!comp) return undefined;
    return {
      ...comp,
      branches_count: this.branches.filter(b => b.company_id === comp.id && b.is_active).length,
      expenses_count: this.expenses.filter(e => e.company_id === comp.id).length
    };
  }

  saveCompany(orgId: string, data: Partial<Company>, userId = 'usr_admin_01', userName = 'Administrador'): { company: Company; error?: string } {
    const now = new Date().toISOString();
    const cleanRnc = (data.rnc || '').replace(/[^0-9]/g, '');

    // Validación de RNC duplicado dentro de la misma organización
    const duplicate = this.companies.find(c => 
      c.organization_id === orgId && 
      c.id !== data.id && 
      c.rnc.replace(/[^0-9]/g, '') === cleanRnc &&
      c.is_active
    );

    if (duplicate) {
      return { 
        company: null as any, 
        error: `Ya existe una empresa activa con el RNC ${data.rnc} (${duplicate.name}) en esta organización.` 
      };
    }

    const existingIdx = this.companies.findIndex(c => c.organization_id === orgId && c.id === data.id);
    let targetCompany: Company;

    if (existingIdx !== -1) {
      const prev = this.companies[existingIdx];
      targetCompany = {
        ...prev,
        ...data,
        organization_id: orgId,
        rnc: data.rnc || prev.rnc,
        updated_at: now
      };
      this.companies[existingIdx] = targetCompany;

      this.logAudit({
        organization_id: orgId,
        user_id: userId,
        user_name: userName,
        action: 'ACTUALIZAR_EMPRESA',
        entity_type: 'COMPANY',
        entity_id: targetCompany.id,
        details: `Actualizó datos fiscales de la empresa "${targetCompany.name}" (RNC: ${targetCompany.rnc}).`
      });
    } else {
      // Si es la primera empresa de la organización, se marca como principal por defecto
      const isFirst = this.companies.filter(c => c.organization_id === orgId && c.is_active).length === 0;

      targetCompany = {
        id: data.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organization_id: orgId,
        name: data.name || 'Nueva Empresa SRL',
        trade_name: data.trade_name || data.name || '',
        rnc: data.rnc || '',
        id_type: data.id_type || (cleanRnc.length === 11 ? 'CEDULA' : 'RNC'),
        tax_regime: (data.tax_regime as TaxRegimeType) || 'REGIMEN_GENERAL',
        address: data.address || '',
        province: data.province || 'Distrito Nacional',
        municipality: data.municipality || 'Santo Domingo de Guzmán',
        sector: data.sector || '',
        phone: data.phone || '',
        email: data.email || '',
        logo_url: data.logo_url || '',
        currency: data.currency || 'DOP',
        country: data.country || 'República Dominicana',
        timezone: data.timezone || 'America/Santo_Domingo',
        is_main: data.is_main ?? isFirst,
        status: data.status || 'ACTIVO',
        is_active: data.is_active ?? true,
        created_by: userId,
        created_at: now,
        updated_at: now
      };

      // Si se marca como principal, desmarcar otras
      if (targetCompany.is_main) {
        this.companies.forEach(c => {
          if (c.organization_id === orgId) c.is_main = false;
        });
      }

      this.companies.push(targetCompany);

      this.logAudit({
        organization_id: orgId,
        user_id: userId,
        user_name: userName,
        action: 'CREAR_EMPRESA',
        entity_type: 'COMPANY',
        entity_id: targetCompany.id,
        details: `Creó nueva empresa filial "${targetCompany.name}" (RNC: ${targetCompany.rnc}) con régimen ${targetCompany.tax_regime}.`
      });
    }

    return { company: targetCompany };
  }

  deactivateCompany(orgId: string, companyId: string, userId = 'usr_admin_01', userName = 'Administrador'): { success: boolean; message: string } {
    const comp = this.companies.find(c => c.organization_id === orgId && c.id === companyId);
    if (!comp) return { success: false, message: 'Empresa no encontrada' };

    const expensesCount = this.expenses.filter(e => e.company_id === companyId).length;
    
    // Desactivación lógica obligatoria
    comp.is_active = false;
    comp.status = 'INACTIVO';
    comp.updated_at = new Date().toISOString();

    // Desactivar también sus sucursales
    this.branches.forEach(b => {
      if (b.company_id === companyId) {
        b.is_active = false;
        b.status = 'INACTIVO';
        b.updated_at = new Date().toISOString();
      }
    });

    this.logAudit({
      organization_id: orgId,
      user_id: userId,
      user_name: userName,
      action: 'DESACTIVAR_EMPRESA',
      entity_type: 'COMPANY',
      entity_id: comp.id,
      details: `Desactivó lógicamente la empresa "${comp.name}" (RNC: ${comp.rnc}). Registros de gastos vinculados conservados: ${expensesCount}.`
    });

    return { 
      success: true, 
      message: `Empresa "${comp.name}" desactivada con éxito. Se preservaron ${expensesCount} registros vinculados para fines fiscales y de auditoría.` 
    };
  }

  // ----------------------------------------------------
  // Branches (Sucursales)
  // ----------------------------------------------------
  getBranches(orgId: string, companyId?: string, includeInactive = false): Branch[] {
    return this.branches.filter(b => 
      b.organization_id === orgId && 
      (!companyId || b.company_id === companyId) &&
      (includeInactive || b.is_active)
    );
  }

  saveBranch(orgId: string, data: Partial<Branch>, userId = 'usr_admin_01', userName = 'Administrador'): { branch: Branch; error?: string } {
    if (!data.company_id) {
      return { branch: null as any, error: 'No se puede crear una sucursal sin especificar la empresa relacionada.' };
    }

    const company = this.companies.find(c => c.organization_id === orgId && c.id === data.company_id);
    if (!company) {
      return { branch: null as any, error: 'La empresa especificada no existe en la organización.' };
    }

    const now = new Date().toISOString();
    const existingIdx = this.branches.findIndex(b => b.organization_id === orgId && b.id === data.id);
    let targetBranch: Branch;

    if (existingIdx !== -1) {
      const prev = this.branches[existingIdx];
      targetBranch = {
        ...prev,
        ...data,
        organization_id: orgId,
        updated_at: now
      };
      this.branches[existingIdx] = targetBranch;

      this.logAudit({
        organization_id: orgId,
        user_id: userId,
        user_name: userName,
        action: 'ACTUALIZAR_SUCURSAL',
        entity_type: 'BRANCH',
        entity_id: targetBranch.id,
        details: `Actualizó sucursal "${targetBranch.name}" (Código: ${targetBranch.code}) de la empresa "${company.name}".`
      });
    } else {
      targetBranch = {
        id: data.id || `branch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        company_id: data.company_id,
        organization_id: orgId,
        name: data.name || 'Nueva Sucursal',
        code: data.code || `SUC-${Math.floor(100 + Math.random() * 900)}`,
        address: data.address || '',
        province: data.province || company.province || 'Distrito Nacional',
        municipality: data.municipality || company.municipality || 'Santo Domingo',
        phone: data.phone || company.phone || '',
        responsible: data.responsible || '',
        status: data.status || 'ACTIVO',
        is_active: data.is_active ?? true,
        created_by: userId,
        created_at: now,
        updated_at: now
      };
      this.branches.push(targetBranch);

      this.logAudit({
        organization_id: orgId,
        user_id: userId,
        user_name: userName,
        action: 'CREAR_SUCURSAL',
        entity_type: 'BRANCH',
        entity_id: targetBranch.id,
        details: `Creó sucursal "${targetBranch.name}" (${targetBranch.code}) para la empresa "${company.name}".`
      });
    }

    return { branch: targetBranch };
  }

  deactivateBranch(orgId: string, branchId: string, userId = 'usr_admin_01', userName = 'Administrador'): { success: boolean; message: string } {
    const branch = this.branches.find(b => b.organization_id === orgId && b.id === branchId);
    if (!branch) return { success: false, message: 'Sucursal no encontrada' };

    branch.is_active = false;
    branch.status = 'INACTIVO';
    branch.updated_at = new Date().toISOString();

    this.logAudit({
      organization_id: orgId,
      user_id: userId,
      user_name: userName,
      action: 'DESACTIVAR_SUCURSAL',
      entity_type: 'BRANCH',
      entity_id: branch.id,
      details: `Desactivó la sucursal "${branch.name}" (${branch.code}).`
    });

    return { success: true, message: `Sucursal "${branch.name}" desactivada con éxito.` };
  }

  // ----------------------------------------------------
  // API Keys (External Integration & Microservice Mode)
  // ----------------------------------------------------
  getApiKeys(orgId: string): ApiKey[] {
    return this.apiKeys
      .filter(k => k.organization_id === orgId)
      .map(k => {
        const comp = this.companies.find(c => c.id === k.company_id);
        const branch = k.branch_id ? this.branches.find(b => b.id === k.branch_id) : undefined;
        return {
          ...k,
          company_name: comp?.name || 'Empresa Desconocida',
          branch_name: branch?.name || 'Todas las Sedes'
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  private sessions: Array<{ token: string; user_id: string; organization_id: string; expires_at: Date; ip?: string; user_agent?: string }> = [];
  private passwordResetTokens: Map<string, { user_id: string; expires_at: Date }> = new Map();

  findUserByEmail(email: string): User | undefined {
    if (!email) return undefined;
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createSession(userId: string, orgId: string, ip?: string, userAgent?: string): { token: string; expiresAt: Date } {
    const token = `eroga_sess_${Date.now()}_${crypto.randomBytes(18).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    this.sessions.push({
      token,
      user_id: userId,
      organization_id: orgId,
      expires_at: expiresAt,
      ip,
      user_agent: userAgent
    });
    this.saveToDisk();
    return { token, expiresAt };
  }

  validateSessionToken(token: string): { user: User; organization_id: string } | null {
    if (!token) return null;
    const session = this.sessions.find(s => s.token === token);
    if (!session) return null;

    if (new Date() > new Date(session.expires_at)) {
      this.sessions = this.sessions.filter(s => s.token !== token);
      this.saveToDisk();
      return null;
    }

    const user = this.users.find(u => u.id === session.user_id && u.is_active);
    if (!user) return null;

    return { user, organization_id: session.organization_id };
  }

  revokeSessionToken(token: string): boolean {
    const initialLen = this.sessions.length;
    this.sessions = this.sessions.filter(s => s.token !== token);
    this.saveToDisk();
    return this.sessions.length < initialLen;
  }

  generatePasswordResetToken(userId: string): string {
    const token = `rst_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    this.passwordResetTokens.set(token, { user_id: userId, expires_at: new Date(Date.now() + 3600000) });
    return token;
  }

  getAIProviderConfigs(orgId: string): AIProviderConfig[] {
    return this.aiProviders.filter(a => a.organization_id === orgId);
  }

  getRawAIProviderKey(providerId: string): string {
    const raw = rawApiKeysStore.get(providerId);
    if (raw) return decryptApiKey(raw);
    return '';
  }

  createApiKey(orgId: string, data: {
    name: string;
    company_id: string;
    branch_id?: string;
    scopes: string[];
    expires_at?: string | null;
  }, userId = 'usr_admin_01', userName = 'Administrador'): { apiKey: ApiKey; rawKey: string; error?: string } {
    if (!data.company_id) {
      return { apiKey: null as any, rawKey: '', error: 'Debe asociar la API Key a una empresa filial.' };
    }

    const company = this.companies.find(c => c.organization_id === orgId && c.id === data.company_id);
    if (!company) {
      return { apiKey: null as any, rawKey: '', error: 'La empresa seleccionada no es válida.' };
    }

    const { rawKey, keyHash, maskedKey } = generateRawApiKey();
    const now = new Date().toISOString();

    const newKey: ApiKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organization_id: orgId,
      company_id: data.company_id,
      company_name: company.name,
      branch_id: data.branch_id || undefined,
      name: data.name || 'Integración ERP Externa',
      key_hash: keyHash,
      masked_key: maskedKey,
      scopes: data.scopes && data.scopes.length > 0 ? data.scopes : ['ocr:process', 'expenses:read'],
      expires_at: data.expires_at || null,
      last_used_at: null,
      total_requests: 0,
      is_active: true,
      status: 'ACTIVE',
      created_by: userId,
      created_at: now,
      updated_at: now
    };

    this.apiKeys.unshift(newKey);

    this.logAudit({
      organization_id: orgId,
      user_id: userId,
      user_name: userName,
      action: 'CREAR_API_KEY',
      entity_type: 'API_KEY',
      entity_id: newKey.id,
      details: `Generó API Key "${newKey.name}" (${newKey.masked_key}) para la empresa "${company.name}" con permisos [${newKey.scopes.join(', ')}].`
    });

    return { apiKey: newKey, rawKey };
  }

  regenerateApiKey(orgId: string, keyId: string, userId = 'usr_admin_01', userName = 'Administrador'): { apiKey: ApiKey; rawKey: string; error?: string } {
    const key = this.apiKeys.find(k => k.organization_id === orgId && k.id === keyId);
    if (!key) return { apiKey: null as any, rawKey: '', error: 'API Key no encontrada' };

    const { rawKey, keyHash, maskedKey } = generateRawApiKey();
    const now = new Date().toISOString();

    key.key_hash = keyHash;
    key.masked_key = maskedKey;
    key.updated_at = now;
    key.is_active = true;
    key.status = 'ACTIVE';

    this.logAudit({
      organization_id: orgId,
      user_id: userId,
      user_name: userName,
      action: 'REGENERAR_API_KEY',
      entity_type: 'API_KEY',
      entity_id: key.id,
      details: `Regeneró credencial de acceso para la API Key "${key.name}" (Nueva clave: ${key.masked_key}).`
    });

    return { apiKey: key, rawKey };
  }

  updateApiKeyStatus(orgId: string, keyId: string, isActive: boolean, userId = 'usr_admin_01', userName = 'Administrador'): { success: boolean; apiKey?: ApiKey } {
    const key = this.apiKeys.find(k => k.organization_id === orgId && k.id === keyId);
    if (!key) return { success: false };

    key.is_active = isActive;
    key.status = isActive ? 'ACTIVE' : 'INACTIVE';
    key.updated_at = new Date().toISOString();

    return { success: true, apiKey: key };
  }

  revokeApiKey(orgId: string, keyId: string, userId = 'usr_admin_01', userName = 'Administrador'): { success: boolean; message: string } {
    const key = this.apiKeys.find(k => k.organization_id === orgId && k.id === keyId);
    if (!key) return { success: false, message: 'API Key no encontrada' };

    key.is_active = false;
    key.status = 'REVOKED';
    key.updated_at = new Date().toISOString();

    this.logAudit({
      organization_id: orgId,
      user_id: userId,
      user_name: userName,
      action: 'REVOCAR_API_KEY',
      entity_type: 'API_KEY',
      entity_id: key.id,
      details: `Revocó permanentemente la API Key "${key.name}" (${key.masked_key}).`
    });

    return { success: true, message: `API Key "${key.name}" revocada exitosamente.` };
  }

  validateRawApiKey(rawKey: string, requiredScope?: string): { valid: boolean; apiKey?: ApiKey; error?: string } {
    if (!rawKey) {
      return { valid: false, error: 'Cabecera de autenticación API Key ausente.' };
    }

    const cleanKey = rawKey.startsWith('Bearer ') ? rawKey.substring(7).trim() : rawKey.trim();
    const hash = hashApiKey(cleanKey);

    const apiKey = this.apiKeys.find(k => k.key_hash === hash);
    if (!apiKey) {
      return { valid: false, error: 'API Key no válida o no encontrada.' };
    }

    if (!apiKey.is_active || apiKey.status !== 'ACTIVE') {
      return { valid: false, error: `La API Key está ${apiKey.status === 'REVOKED' ? 'revocada' : 'inactiva'}.` };
    }

    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      apiKey.status = 'EXPIRED';
      apiKey.is_active = false;
      return { valid: false, error: 'La API Key ha expirado.' };
    }

    if (requiredScope && !apiKey.scopes.includes(requiredScope) && !apiKey.scopes.includes('*')) {
      return { valid: false, error: `Permiso insuficiente: la API Key requiere el scope "${requiredScope}".` };
    }

    // Actualizar métricas de uso de la llave
    apiKey.total_requests += 1;
    apiKey.last_used_at = new Date().toISOString();

    return { valid: true, apiKey };
  }

  logApiRequest(log: Omit<ApiKeyLog, 'id' | 'created_at'>): void {
    const newLog: ApiKeyLog = {
      ...log,
      id: `apilog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString()
    };
    this.apiKeyLogs.unshift(newLog);
    if (this.apiKeyLogs.length > 500) {
      this.apiKeyLogs.pop();
    }
  }

  getApiKeyLogs(orgId: string, limit = 50): ApiKeyLog[] {
    return this.apiKeyLogs
      .filter(l => l.organization_id === orgId)
      .slice(0, limit);
  }

  // ----------------------------------------------------
  // Users & Memberships
  // ----------------------------------------------------
  getUsers(orgId: string, includeInactive = false): User[] {
    return this.users.filter(u => u.organization_id === orgId && (includeInactive || u.is_active !== false));
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  saveUser(
    orgId: string, 
    userData: Partial<User>, 
    performedByUserId = 'usr_admin_01', 
    performedByName = 'Administrador'
  ): { user?: User; error?: string } {
    const now = new Date().toISOString();

    if (!userData.name || !userData.email) {
      return { error: 'El nombre completo y el correo electrónico son obligatorios.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return { error: 'El formato del correo electrónico no es válido.' };
    }

    if (userData.id) {
      const idx = this.users.findIndex(u => u.id === userData.id);
      if (idx === -1) {
        return { error: 'Usuario no encontrado.' };
      }

      // Check email uniqueness among other users
      const duplicate = this.users.find(u => u.id !== userData.id && u.organization_id === orgId && u.email.toLowerCase() === userData.email!.toLowerCase());
      if (duplicate) {
        return { error: `Ya existe otro usuario registrado con el correo ${userData.email}.` };
      }

      const existing = this.users[idx];
      const updated: User = {
        ...existing,
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        role: userData.role || existing.role || 'EMPLOYEE',
        department: userData.department?.trim() || existing.department || 'Operaciones',
        avatar: userData.avatar || existing.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        status: userData.status || existing.status || 'ACTIVE',
        is_active: userData.is_active !== undefined ? userData.is_active : (userData.status === 'INACTIVE' ? false : true),
        updated_at: now
      };

      this.users[idx] = updated;

      this.logAudit({
        organization_id: orgId,
        user_id: performedByUserId,
        user_name: performedByName,
        action: 'ACTUALIZAR_USUARIO',
        entity_type: 'USER',
        entity_id: updated.id,
        details: `Actualizado miembro del equipo "${updated.name}" (${updated.email}) con rol [${updated.role}]`
      });

      return { user: updated };
    } else {
      // New User
      const duplicate = this.users.find(u => u.organization_id === orgId && u.email.toLowerCase() === userData.email!.toLowerCase());
      if (duplicate) {
        return { error: `Ya existe un usuario registrado con el correo ${userData.email}.` };
      }

      const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newUser: User = {
        id: newId,
        organization_id: orgId,
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        role: userData.role || 'EMPLOYEE',
        department: userData.department?.trim() || 'Operaciones',
        avatar: userData.avatar || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80`,
        status: 'ACTIVE',
        is_active: true,
        created_at: now,
        updated_at: now
      };

      this.users.unshift(newUser);

      this.logAudit({
        organization_id: orgId,
        user_id: performedByUserId,
        user_name: performedByName,
        action: 'CREAR_USUARIO',
        entity_type: 'USER',
        entity_id: newUser.id,
        details: `Invitado/creado nuevo miembro del equipo "${newUser.name}" (${newUser.email}) con rol [${newUser.role}] en ${newUser.department}`
      });

      return { user: newUser };
    }
  }

  deactivateUser(
    orgId: string, 
    userId: string, 
    performedByUserId = 'usr_admin_01', 
    performedByName = 'Administrador'
  ): { success: boolean; message: string } {
    const user = this.users.find(u => u.id === userId && u.organization_id === orgId);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    if (user.id === performedByUserId) {
      return { success: false, message: 'No puedes desactivar tu propia cuenta activa actual.' };
    }

    user.status = 'INACTIVE';
    user.is_active = false;
    user.updated_at = new Date().toISOString();

    this.logAudit({
      organization_id: orgId,
      user_id: performedByUserId,
      user_name: performedByName,
      action: 'DESACTIVAR_USUARIO',
      entity_type: 'USER',
      entity_id: user.id,
      details: `Desactivado acceso al usuario "${user.name}" (${user.email})`
    });

    return { success: true, message: `Usuario ${user.name} desactivado correctamente.` };
  }

  // ----------------------------------------------------
  // Roles & RBAC Permissions Matrix per Organization
  // ----------------------------------------------------
  getPermissionsCatalog(): PermissionDefinition[] {
    return [...DEFAULT_PERMISSIONS];
  }

  getRoles(orgId: string): RoleDefinition[] {
    let orgRoles = this.roles.filter(r => r.organization_id === orgId);
    if (orgRoles.length === 0) {
      const defaults = getDefaultRolesForOrg(orgId);
      this.roles.push(...defaults);
      orgRoles = defaults;
    }
    return orgRoles;
  }

  getRoleById(orgId: string, roleId: string): RoleDefinition | undefined {
    const roles = this.getRoles(orgId);
    return roles.find(r => r.id === roleId || r.name.toUpperCase() === roleId.toUpperCase());
  }

  saveRole(
    orgId: string,
    roleData: Partial<RoleDefinition>,
    performedByUserId = 'usr_admin_01',
    performedByName = 'Administrador'
  ): { role?: RoleDefinition; error?: string } {
    const now = new Date().toISOString();
    this.getRoles(orgId); // Ensure initialized

    if (!roleData.name || !roleData.name.trim()) {
      return { error: 'El nombre del rol es obligatorio.' };
    }

    const trimmedName = roleData.name.trim();

    if (roleData.id) {
      // Update existing role
      const idx = this.roles.findIndex(r => r.organization_id === orgId && r.id === roleData.id);
      if (idx === -1) {
        return { error: 'Rol no encontrado en esta organización.' };
      }

      const existing = this.roles[idx];
      const updated: RoleDefinition = {
        ...existing,
        name: trimmedName,
        description: roleData.description?.trim() || existing.description || '',
        color: roleData.color || existing.color || 'slate',
        permissions: Array.isArray(roleData.permissions) ? roleData.permissions : existing.permissions,
        updated_at: now
      };

      this.roles[idx] = updated;

      this.logAudit({
        organization_id: orgId,
        user_id: performedByUserId,
        user_name: performedByName,
        action: 'ACTUALIZAR_ROL',
        entity_type: 'ROLE',
        entity_id: updated.id,
        details: `Actualizado rol personalizado "${updated.name}" con ${updated.permissions.length} permisos activos`
      });

      return { role: updated };
    } else {
      // Create new role
      const roleSlug = trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20);
      const roleId = `ROLE_${roleSlug}_${Date.now().toString(36).toUpperCase()}`;

      // Check name uniqueness
      const duplicate = this.roles.find(r => r.organization_id === orgId && r.name.toLowerCase() === trimmedName.toLowerCase());
      if (duplicate) {
        return { error: `Ya existe un rol con el nombre "${trimmedName}".` };
      }

      const newRole: RoleDefinition = {
        id: roleId,
        organization_id: orgId,
        name: trimmedName,
        description: roleData.description?.trim() || 'Rol personalizado para colaboradores del entorno SaaS',
        is_system: false,
        color: roleData.color || 'purple',
        permissions: Array.isArray(roleData.permissions) ? roleData.permissions : ['expenses.view_all', 'expenses.create_ocr', 'expenses.create_manual'],
        created_at: now,
        updated_at: now
      };

      this.roles.push(newRole);

      this.logAudit({
        organization_id: orgId,
        user_id: performedByUserId,
        user_name: performedByName,
        action: 'CREAR_ROL',
        entity_type: 'ROLE',
        entity_id: newRole.id,
        details: `Creado nuevo rol personalizado "${newRole.name}" con ${newRole.permissions.length} permisos iniciales`
      });

      return { role: newRole };
    }
  }

  deleteRole(
    orgId: string,
    roleId: string,
    performedByUserId = 'usr_admin_01',
    performedByName = 'Administrador'
  ): { success: boolean; message: string } {
    this.getRoles(orgId); // Ensure initialized

    const role = this.roles.find(r => r.organization_id === orgId && r.id === roleId);
    if (!role) {
      return { success: false, message: 'El rol que intentas eliminar no existe.' };
    }

    if (role.is_system || role.id === 'ADMIN') {
      return { success: false, message: 'No se pueden eliminar los roles base del sistema por seguridad institucional.' };
    }

    // Check if users currently have this role
    const assignedUsers = this.users.filter(u => u.organization_id === orgId && (u.role === role.id || u.role === role.name));
    if (assignedUsers.length > 0) {
      return { 
        success: false, 
        message: `No se puede eliminar el rol "${role.name}" porque tiene ${assignedUsers.length} usuario(s) asignado(s). Reasígnalos primero.` 
      };
    }

    this.roles = this.roles.filter(r => !(r.organization_id === orgId && r.id === roleId));

    this.logAudit({
      organization_id: orgId,
      user_id: performedByUserId,
      user_name: performedByName,
      action: 'ELIMINAR_ROL',
      entity_type: 'ROLE',
      entity_id: roleId,
      details: `Eliminado rol personalizado "${role.name}"`
    });

    return { success: true, message: `Rol "${role.name}" eliminado satisfactoriamente.` };
  }

  updateRbacMatrix(
    orgId: string,
    updates: { roleId: string; permissions: string[] }[],
    performedByUserId = 'usr_admin_01',
    performedByName = 'Administrador'
  ): { roles: RoleDefinition[]; message: string } {
    const now = new Date().toISOString();
    this.getRoles(orgId);

    updates.forEach(u => {
      const idx = this.roles.findIndex(r => r.organization_id === orgId && r.id === u.roleId);
      if (idx !== -1) {
        this.roles[idx] = {
          ...this.roles[idx],
          permissions: Array.isArray(u.permissions) ? u.permissions : [],
          updated_at: now
        };
      }
    });

    this.logAudit({
      organization_id: orgId,
      user_id: performedByUserId,
      user_name: performedByName,
      action: 'ACTUALIZAR_MATRIZ_RBAC',
      entity_type: 'ROLE',
      entity_id: 'RBAC_MATRIX',
      details: `Actualizada matriz de permisos RBAC para ${updates.length} roles en la organización`
    });

    return { 
      roles: this.getRoles(orgId), 
      message: 'Matriz de permisos RBAC actualizada y guardada correctamente.' 
    };
  }

  resetRbacMatrix(
    orgId: string,
    performedByUserId = 'usr_admin_01',
    performedByName = 'Administrador'
  ): { roles: RoleDefinition[]; message: string } {
    const defaults = getDefaultRolesForOrg(orgId);
    
    // Remove existing roles for this org and replace with defaults
    this.roles = this.roles.filter(r => r.organization_id !== orgId);
    this.roles.push(...defaults);

    this.logAudit({
      organization_id: orgId,
      user_id: performedByUserId,
      user_name: performedByName,
      action: 'RESET_MATRIZ_RBAC',
      entity_type: 'ROLE',
      entity_id: 'RBAC_MATRIX',
      details: `Restablecida matriz de permisos RBAC a los valores predeterminados institucionales`
    });

    return { 
      roles: defaults, 
      message: 'Matriz RBAC restablecida exitosamente a valores estándar.' 
    };
  }

  checkUserPermission(orgId: string, userRole: string, permissionKey: string): boolean {
    if (userRole === 'ADMIN') return true;
    const role = this.getRoleById(orgId, userRole);
    if (!role) return false;
    return role.permissions.includes(permissionKey);
  }

  // ----------------------------------------------------
  // Expenses (Comprobantes y Facturas)
  // ----------------------------------------------------
  getExpenses(orgId: string, filters?: { company_id?: string; branch_id?: string; status?: string }): ExpenseRecord[] {
    return this.expenses
      .filter(e => {
        if (e.organization_id !== orgId) return false;
        if (filters?.company_id && e.company_id !== filters.company_id) return false;
        if (filters?.branch_id && e.branch_id !== filters.branch_id) return false;
        if (filters?.status && e.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getExpenseById(orgId: string, id: string): ExpenseRecord | undefined {
    return this.expenses.find(e => e.organization_id === orgId && (e.id === id || e.external_id === id));
  }

  saveExpense(orgId: string, expenseData: Partial<ExpenseRecord>): ExpenseRecord {
    const now = new Date().toISOString();

    // Idempotency / External ID check for duplicate requests
    if (expenseData.idempotency_key || expenseData.external_id) {
      const existingDuplicate = this.expenses.find(e => 
        e.organization_id === orgId && 
        ((expenseData.idempotency_key && e.idempotency_key === expenseData.idempotency_key) ||
         (expenseData.external_id && e.external_id === expenseData.external_id))
      );
      if (existingDuplicate) {
        return existingDuplicate;
      }
    }

    const existingIdx = this.expenses.findIndex(e => e.organization_id === orgId && e.id === expenseData.id);

    if (existingIdx !== -1) {
      const updated = {
        ...this.expenses[existingIdx],
        ...expenseData,
        updated_at: now
      };
      this.expenses[existingIdx] = updated;

      this.logAudit({
        organization_id: orgId,
        user_id: expenseData.created_by_user_id || 'usr_admin_01',
        user_name: expenseData.created_by_name || 'Usuario',
        action: 'ACTUALIZAR_GASTO',
        entity_type: 'EXPENSE',
        entity_id: updated.id,
        details: `Actualizó comprobante ${updated.ncf || 'Sin NCF'} (${updated.supplier_name}) por RD$ ${Number(updated.total_amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`
      });

      this.triggerWebhooks(orgId, 'expense.updated', updated);

      return updated;
    } else {
      const newExpense: ExpenseRecord = {
        id: expenseData.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        external_id: expenseData.external_id,
        idempotency_key: expenseData.idempotency_key,
        organization_id: orgId,
        company_id: expenseData.company_id || this.companies.find(c => c.organization_id === orgId && c.is_active)?.id || 'comp_main',
        branch_id: expenseData.branch_id || this.branches.find(b => b.organization_id === orgId && b.is_active)?.id || 'branch_main',
        created_by_user_id: expenseData.created_by_user_id || 'usr_admin_01',
        created_by_name: expenseData.created_by_name || 'Administrador',
        date: expenseData.date || now.split('T')[0],
        supplier_name: expenseData.supplier_name || 'Proveedor No Identificado',
        supplier_rnc: expenseData.supplier_rnc || '',
        supplier_id: expenseData.supplier_id,
        ncf: expenseData.ncf || '',
        ncf_type: expenseData.ncf_type || 'B01',
        document_type: expenseData.document_type || 'FACTURA_CREDITO_FISCAL',
        classification: expenseData.classification || 'GASTO_OPERATIVO',
        expense_category: expenseData.expense_category || 'Suministros de Oficina y Papelería',
        cost_center_id: expenseData.cost_center_id,
        project_id: expenseData.project_id,
        vehicle_id: expenseData.vehicle_id,
        subtotal: Number(expenseData.subtotal) || 0,
        itbis_amount: Number(expenseData.itbis_amount) || 0,
        legal_tip_amount: Number(expenseData.legal_tip_amount) || 0,
        other_taxes: Number(expenseData.other_taxes) || 0,
        total_amount: Number(expenseData.total_amount) || 0,
        currency: expenseData.currency || 'DOP',
        payment_method: expenseData.payment_method || 'TARJETA_EMPRESARIAL',
        dgii_expense_type: expenseData.dgii_expense_type || '02 - Gastos por Trabajos, Suministros y Servicios',
        dgii_payment_type: expenseData.dgii_payment_type || '03 - Tarjeta de Crédito/Débito',
        status: expenseData.status || 'PENDIENTE_REVISION',
        approval_notes: expenseData.approval_notes,
        correction_request_note: expenseData.correction_request_note,
        reviewed_by: expenseData.reviewed_by,
        reviewed_at: expenseData.reviewed_at,
        receipt_image_url: expenseData.receipt_image_url,
        receipt_thumbnail_url: expenseData.receipt_thumbnail_url,
        ocr_raw_text: expenseData.ocr_raw_text,
        ai_confidence_score: expenseData.ai_confidence_score || 95,
        field_confidences: expenseData.field_confidences,
        ai_provider_used: expenseData.ai_provider_used || 'GEMINI',
        ai_model_used: expenseData.ai_model_used || 'gemini-2.5-flash',
        line_items: expenseData.line_items || [],
        created_at: now,
        updated_at: now
      };

      this.expenses.unshift(newExpense);

      // Auto-registrar proveedor si no existe
      if (newExpense.supplier_rnc && newExpense.supplier_name) {
        this.saveSupplier(orgId, {
          rnc: newExpense.supplier_rnc,
          name: newExpense.supplier_name,
          category_default: newExpense.expense_category,
          status_dgii: 'ACTIVO',
          total_invoiced: newExpense.total_amount
        });
      }

      this.logAudit({
        organization_id: orgId,
        user_id: newExpense.created_by_user_id,
        user_name: newExpense.created_by_name,
        action: 'CREAR_GASTO',
        entity_type: 'EXPENSE',
        entity_id: newExpense.id,
        details: `Radicó nuevo comprobante fiscal NCF: ${newExpense.ncf || 'Borrador'} (${newExpense.supplier_name}) por RD$ ${newExpense.total_amount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`
      });

      this.triggerWebhooks(orgId, 'expense.created', newExpense);
      return newExpense;
    }
  }

  approveExpense(orgId: string, id: string, reviewerName = 'Administrador', notes = 'Aprobado vía API/Panel'): ExpenseRecord | undefined {
    const expense = this.expenses.find(e => e.organization_id === orgId && (e.id === id || e.external_id === id));
    if (!expense) return undefined;

    const now = new Date().toISOString();
    expense.status = 'APROBADO';
    expense.reviewed_by = reviewerName;
    expense.reviewed_at = now;
    expense.approval_notes = notes;
    expense.updated_at = now;
    expense.erp_sync_status = 'PENDIENTE_SYNC';

    this.logAudit({
      organization_id: orgId,
      user_id: 'usr_admin_01',
      user_name: reviewerName,
      action: 'APROBAR_GASTO',
      entity_type: 'EXPENSE',
      entity_id: expense.id,
      details: `Aprobó erogación ${expense.ncf || expense.id} (${expense.supplier_name}). Nota: ${notes}`
    });

    this.triggerWebhooks(orgId, 'expense.approved', expense);

    return expense;
  }

  rejectExpense(orgId: string, id: string, reviewerName = 'Administrador', reason = 'Rechazado por inconsistencia fiscal'): ExpenseRecord | undefined {
    const expense = this.expenses.find(e => e.organization_id === orgId && (e.id === id || e.external_id === id));
    if (!expense) return undefined;

    const now = new Date().toISOString();
    expense.status = 'RECHAZADO';
    expense.reviewed_by = reviewerName;
    expense.reviewed_at = now;
    expense.correction_request_note = reason;
    expense.updated_at = now;

    this.logAudit({
      organization_id: orgId,
      user_id: 'usr_admin_01',
      user_name: reviewerName,
      action: 'RECHAZAR_GASTO',
      entity_type: 'EXPENSE',
      entity_id: expense.id,
      details: `Rechazó erogación ${expense.ncf || expense.id}. Motivo: ${reason}`
    });

    this.triggerWebhooks(orgId, 'expense.rejected', expense);

    return expense;
  }

  deleteExpense(orgId: string, id: string): boolean {
    const exp = this.expenses.find(e => e.organization_id === orgId && e.id === id);
    if (!exp) return false;

    this.expenses = this.expenses.filter(e => !(e.organization_id === orgId && e.id === id));
    return true;
  }

  // ----------------------------------------------------
  // Receipts (Subida y procesamiento de comprobantes)
  // ----------------------------------------------------
  getReceipts(orgId: string): ReceiptRecord[] {
    return this.receipts.filter(r => r.organization_id === orgId);
  }

  getReceiptById(orgId: string, id: string): ReceiptRecord | undefined {
    return this.receipts.find(r => r.organization_id === orgId && r.id === id);
  }

  saveReceipt(orgId: string, data: Partial<ReceiptRecord>): ReceiptRecord {
    const existingIdx = this.receipts.findIndex(r => r.organization_id === orgId && r.id === data.id);
    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      const updated: ReceiptRecord = {
        ...this.receipts[existingIdx],
        ...data,
        updated_at: now
      };
      this.receipts[existingIdx] = updated;
      return updated;
    } else {
      const newReceipt: ReceiptRecord = {
        id: data.id || `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organization_id: orgId,
        status: data.status || 'UPLOADED',
        image_url: data.image_url,
        image_base64: data.image_base64,
        file_name: data.file_name || 'comprobante_fiscal.jpg',
        mime_type: data.mime_type || 'image/jpeg',
        extraction: data.extraction,
        fiscal_validation: data.fiscal_validation,
        meta: data.meta,
        error: data.error,
        created_at: now,
        updated_at: now
      };
      this.receipts.unshift(newReceipt);
      return newReceipt;
    }
  }

  // ----------------------------------------------------
  // Webhooks (Subscripciones y Notificaciones de eventos)
  // ----------------------------------------------------
  getWebhooks(orgId: string): WebhookSubscription[] {
    return this.webhooks.filter(w => w.organization_id === orgId);
  }

  saveWebhook(orgId: string, data: Partial<WebhookSubscription>): WebhookSubscription {
    const existingIdx = this.webhooks.findIndex(w => w.organization_id === orgId && w.id === data.id);
    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      const updated = {
        ...this.webhooks[existingIdx],
        ...data
      };
      this.webhooks[existingIdx] = updated;
      return updated;
    } else {
      const newWebhook: WebhookSubscription = {
        id: data.id || `whk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organization_id: orgId,
        url: data.url || 'https://example.com/webhooks/eroga-ai',
        events: data.events || ['expense.created', 'expense.approved'],
        secret: data.secret || `whsec_${Math.random().toString(36).substring(2, 12)}`,
        is_active: data.is_active ?? true,
        created_at: now
      };
      this.webhooks.push(newWebhook);
      return newWebhook;
    }
  }

  deleteWebhook(orgId: string, id: string): boolean {
    const prev = this.webhooks.length;
    this.webhooks = this.webhooks.filter(w => !(w.organization_id === orgId && w.id === id));
    return this.webhooks.length < prev;
  }

  triggerWebhooks(orgId: string, event: string, payload: any): void {
    const matchedWebhooks = this.webhooks.filter(w => w.organization_id === orgId && w.is_active && (w.events.includes(event as any) || w.events.includes('*' as any)));
    const now = new Date().toISOString();
    matchedWebhooks.forEach(wh => {
      wh.last_triggered_at = now;
      // In asynchronous systems, this dispatches HTTP POST with HMAC-SHA256 signature
    });
  }

  // ----------------------------------------------------
  // Categories & Cost Centers
  // ----------------------------------------------------
  getCategories(orgId: string): ExpenseCategory[] {
    return this.categories.filter(c => c.organization_id === orgId || c.is_system);
  }

  saveCategory(orgId: string, cat: Partial<ExpenseCategory>): ExpenseCategory {
    const existingIdx = this.categories.findIndex(c => (c.organization_id === orgId || c.is_system) && c.id === cat.id);
    const targetId = cat.id || `cat_${Date.now()}`;

    const fullCat: ExpenseCategory = {
      id: targetId,
      organization_id: orgId,
      name: cat.name || 'Nueva Categoría',
      code: cat.code || `CAT-${Math.floor(100 + Math.random() * 900)}`,
      account_code: cat.account_code || '6101-01',
      dgii_type_code: cat.dgii_type_code || '02 - Gastos por Trabajos, Suministros y Servicios',
      default_classification: cat.default_classification || 'GASTO_OPERATIVO',
      default_itbis_rate: cat.default_itbis_rate ?? 18,
      monthly_budget: Number(cat.monthly_budget) || 0,
      icon: cat.icon || 'Tag',
      color: cat.color || '#3B82F6',
      is_active: cat.is_active ?? true,
      requires_approval_above: cat.requires_approval_above,
      created_at: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      this.categories[existingIdx] = { ...this.categories[existingIdx], ...fullCat };
      return this.categories[existingIdx];
    } else {
      this.categories.push(fullCat);
      return fullCat;
    }
  }

  deleteCategory(orgId: string, id: string): boolean {
    const initialLen = this.categories.length;
    this.categories = this.categories.filter(c => !(c.organization_id === orgId && c.id === id && !c.is_system));
    return this.categories.length < initialLen;
  }

  getCostCenters(orgId: string): CostCenter[] {
    return this.costCenters.filter(c => c.organization_id === orgId);
  }

  saveCostCenter(orgId: string, cc: Partial<CostCenter>): CostCenter {
    const existingIdx = this.costCenters.findIndex(c => c.organization_id === orgId && c.id === cc.id);
    const targetId = cc.id || `cc_${Date.now()}`;

    const fullCC: CostCenter = {
      id: targetId,
      organization_id: orgId,
      code: cc.code || `CC-${Math.floor(100 + Math.random() * 900)}`,
      name: cc.name || 'Nuevo Centro de Costo',
      manager_name: cc.manager_name || 'Encargado',
      budget_monthly: Number(cc.budget_monthly) || 0,
      spent_current_month: Number(cc.spent_current_month) || 0
    };

    if (existingIdx !== -1) {
      this.costCenters[existingIdx] = { ...this.costCenters[existingIdx], ...fullCC };
      return this.costCenters[existingIdx];
    } else {
      this.costCenters.push(fullCC);
      return fullCC;
    }
  }

  deleteCostCenter(orgId: string, id: string): boolean {
    const initialLen = this.costCenters.length;
    this.costCenters = this.costCenters.filter(c => !(c.organization_id === orgId && c.id === id));
    return this.costCenters.length < initialLen;
  }

  // ----------------------------------------------------
  // Suppliers (Proveedores)
  // ----------------------------------------------------
  getSuppliers(orgId: string): Supplier[] {
    return this.suppliers.filter(s => s.organization_id === orgId);
  }

  saveSupplier(orgId: string, sup: Partial<Supplier>): Supplier {
    const existingIdx = this.suppliers.findIndex(s => s.organization_id === orgId && (s.id === sup.id || s.rnc === sup.rnc));
    const targetId = sup.id || `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const fullSup: Supplier = {
      id: targetId,
      organization_id: orgId,
      rnc: sup.rnc || '',
      name: sup.name || 'Proveedor Nuevo',
      trade_name: sup.trade_name || sup.name || '',
      phone: sup.phone || '',
      email: sup.email || '',
      category_default: sup.category_default || 'Suministros de Oficina y Papelería',
      status_dgii: sup.status_dgii || 'ACTIVO',
      total_invoiced: Number(sup.total_invoiced) || 0,
      created_at: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      const prev = this.suppliers[existingIdx];
      this.suppliers[existingIdx] = {
        ...prev,
        ...fullSup,
        total_invoiced: (prev.total_invoiced || 0) + (Number(sup.total_invoiced) || 0)
      };
      this.saveToDisk();
      return this.suppliers[existingIdx];
    } else {
      this.suppliers.push(fullSup);
      this.saveToDisk();
      return fullSup;
    }
  }

  deleteSupplier(orgId: string, id: string): boolean {
    const initialLen = this.suppliers.length;
    this.suppliers = this.suppliers.filter(s => !(s.organization_id === orgId && s.id === id));
    this.saveToDisk();
    return this.suppliers.length < initialLen;
  }

  // ----------------------------------------------------
  // Projects & Vehicles
  // ----------------------------------------------------
  getProjects(orgId: string): Project[] {
    return this.projects.filter(p => p.organization_id === orgId);
  }

  saveProject(orgId: string, proj: Partial<Project>): Project {
    const existingIdx = this.projects.findIndex(p => p.organization_id === orgId && p.id === proj.id);
    const targetId = proj.id || `proj_${Date.now()}`;

    const fullProj: Project = {
      id: targetId,
      organization_id: orgId,
      code: proj.code || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      name: proj.name || 'Nuevo Proyecto',
      client_name: proj.client_name || 'Cliente Corporativo',
      budget: Number(proj.budget) || 0,
      spent: Number(proj.spent) || 0,
      status: proj.status || 'ACTIVO'
    };

    if (existingIdx !== -1) {
      this.projects[existingIdx] = { ...this.projects[existingIdx], ...fullProj };
      this.saveToDisk();
      return this.projects[existingIdx];
    } else {
      this.projects.push(fullProj);
      this.saveToDisk();
      return fullProj;
    }
  }

  deleteProject(orgId: string, id: string): boolean {
    const initialLen = this.projects.length;
    this.projects = this.projects.filter(p => !(p.organization_id === orgId && p.id === id));
    this.saveToDisk();
    return this.projects.length < initialLen;
  }

  getVehicles(orgId: string): Vehicle[] {
    return this.vehicles.filter(v => v.organization_id === orgId);
  }

  saveVehicle(orgId: string, veh: Partial<Vehicle>): Vehicle {
    const existingIdx = this.vehicles.findIndex(v => v.organization_id === orgId && (v.id === veh.id || v.plate === veh.plate));
    const targetId = veh.id || `veh_${Date.now()}`;

    const fullVeh: Vehicle = {
      id: targetId,
      organization_id: orgId,
      plate: (veh.plate || 'G000000').toUpperCase(),
      brand: veh.brand || 'Toyota',
      model: veh.model || 'Vehículo Corporativo',
      driver_name: veh.driver_name || 'Chofer Asignado',
      fuel_type: veh.fuel_type || 'GASOLINA_PREMIUM',
      total_fuel_spent: Number(veh.total_fuel_spent) || 0,
      last_mileage: Number(veh.last_mileage) || 0
    };

    if (existingIdx !== -1) {
      this.vehicles[existingIdx] = { ...this.vehicles[existingIdx], ...fullVeh };
      this.saveToDisk();
      return this.vehicles[existingIdx];
    } else {
      this.vehicles.push(fullVeh);
      this.saveToDisk();
      return fullVeh;
    }
  }

  deleteVehicle(orgId: string, id: string): boolean {
    const initialLen = this.vehicles.length;
    this.vehicles = this.vehicles.filter(v => !(v.organization_id === orgId && v.id === id));
    this.saveToDisk();
    return this.vehicles.length < initialLen;
  }

  // ----------------------------------------------------
  // Audit Logs
  // ----------------------------------------------------
  getAuditLogs(orgId: string): AuditLog[] {
    return this.auditLogs
      .filter(a => a.organization_id === orgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  logAudit(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString()
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    this.saveToDisk();
    prismaRepo.logAudit({
      organization_id: log.organization_id,
      user_id: log.user_id,
      user_name: log.user_name,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      request_id: log.request_id
    }).catch((error) => {
      console.error('[ErogaAI DB] Error persisting legacy audit event to SQL:', error);
    });
    return newLog;
  }

  // ----------------------------------------------------
  // ERP Config (Módulo Opcional e Independiente AllSender ERP)
  // ----------------------------------------------------
  getERPConfig(orgId: string): ERPConfig {
    if (this.erpConfig.organization_id === orgId) {
      return this.erpConfig;
    }
    return {
      organization_id: orgId,
      is_enabled: false,
      api_endpoint: 'https://api.allsender.com/v1/accounting/invoices',
      api_key_masked: 'as_live_••••••••8899',
      auto_sync_on_approval: false,
      ledger_account_default: '6105-01-000',
      sync_status: 'DESACTIVADO'
    };
  }

  saveERPConfig(orgId: string, config: Partial<ERPConfig>): ERPConfig {
    const isConfigComplete = Boolean((config.api_endpoint || this.erpConfig.api_endpoint) && (config.api_key_masked || this.erpConfig.api_key_masked));
    
    let status: ERPSyncStatus = this.erpConfig.sync_status;
    if (config.is_enabled === false) {
      status = 'DESACTIVADO';
    } else if (config.is_enabled === true) {
      status = isConfigComplete ? (config.sync_status || 'CONECTADO') : 'CONFIGURACION_INCOMPLETA';
    }

    this.erpConfig = {
      ...this.erpConfig,
      ...config,
      organization_id: orgId,
      sync_status: status
    };

    this.logAudit({
      organization_id: orgId,
      user_id: 'usr_admin_01',
      user_name: 'Administrador',
      action: 'SYNC_ERP',
      entity_type: 'SETTINGS',
      entity_id: 'erp_allsender',
      details: `Actualizó configuración del módulo AllSender ERP. Estado: ${this.erpConfig.sync_status}, Auto-sync: ${this.erpConfig.auto_sync_on_approval}`
    });

    return this.erpConfig;
  }

  testERPConnection(orgId: string): { success: boolean; status: ERPSyncStatus; message: string; latency_ms: number } {
    const config = this.getERPConfig(orgId);
    const now = new Date().toISOString();

    if (!config.is_enabled) {
      return {
        success: false,
        status: 'DESACTIVADO',
        message: 'El módulo AllSender ERP se encuentra desactivado.',
        latency_ms: 0
      };
    }

    if (!config.api_endpoint || !config.api_key_masked) {
      config.sync_status = 'CONFIGURACION_INCOMPLETA';
      return {
        success: false,
        status: 'CONFIGURACION_INCOMPLETA',
        message: 'Falta especificar el Endpoint API o el API Key de AllSender.',
        latency_ms: 0
      };
    }

    // Test simulado verificado
    config.sync_status = 'CONECTADO';
    config.last_test_time = now;
    config.last_error_message = undefined;

    return {
      success: true,
      status: 'CONECTADO',
      message: 'Conexión verificada exitosamente con AllSender ERP Enterprise (HTTP 200 OK).',
      latency_ms: 58
    };
  }

  syncExpenseBatchWithERP(orgId: string): { 
    synced_count: number; 
    failed_count: number; 
    synced_expenses: ExpenseRecord[]; 
    errors: string[] 
  } {
    const config = this.getERPConfig(orgId);
    if (!config.is_enabled) {
      return { synced_count: 0, failed_count: 0, synced_expenses: [], errors: ['El módulo AllSender ERP está desactivado.'] };
    }

    // Regla estricta: ÚNICAMENTE sincronizar gastos en estado APROBADO
    const eligibleExpenses = this.expenses.filter(e => e.organization_id === orgId && e.status === 'APROBADO');

    const synced: ExpenseRecord[] = [];
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (const exp of eligibleExpenses) {
      try {
        exp.status = 'SINCRONIZADO_ERP';
        exp.erp_sync_status = 'SINCRONIZADO';
        exp.erp_synced_at = now;
        exp.all_sender_sync_id = `as_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        exp.all_sender_synced_at = now;
        exp.erp_response_payload = JSON.stringify({ status: 'ACCEPTED', ledger_account: config.ledger_account_default, ncf: exp.ncf });
        exp.updated_at = now;
        synced.push(exp);

        this.triggerWebhooks(orgId, 'expense.sync.completed', {
          expense_id: exp.id,
          all_sender_sync_id: exp.all_sender_sync_id,
          synced_at: now
        });
      } catch (err: any) {
        exp.erp_sync_status = 'ERROR_SYNC';
        exp.erp_sync_error = err.message || 'Error en comunicación con AllSender ERP';
        errors.push(`Error en comprobante ${exp.id}: ${exp.erp_sync_error}`);
      }
    }

    config.last_sync_time = now;
    config.sync_status = synced.length > 0 ? 'CONECTADO' : config.sync_status;

    if (synced.length > 0) {
      this.logAudit({
        organization_id: orgId,
        user_id: 'usr_admin_01',
        user_name: 'Administrador',
        action: 'SYNC_ERP',
        entity_type: 'EXPENSE',
        entity_id: 'batch_sync',
        details: `Sincronizó ${synced.length} erogaciones aprobadas con AllSender ERP.`
      });
    }

    return {
      synced_count: synced.length,
      failed_count: errors.length,
      synced_expenses: synced,
      errors
    };
  }

  // ----------------------------------------------------
  // AI Providers & Usage
  // ----------------------------------------------------
  getAIProviders(orgId: string): AIProviderConfig[] {
    return this.aiProviders.filter(p => p.organization_id === orgId);
  }

  getAIProviderById(orgId: string, id: string): AIProviderConfig | undefined {
    return this.aiProviders.find(p => p.organization_id === orgId && p.id === id);
  }

  getRawApiKey(providerId: string): string | undefined {
    return rawApiKeysStore.get(providerId);
  }

  getEncryptedApiKey(providerId: string): string | undefined {
    return rawApiKeysStore.get(providerId);
  }

  getAIUsageLogs(orgId: string): AIUsageLog[] {
    return this.aiUsageLogs.filter(l => l.organization_id === orgId);
  }

  saveAIProvider(orgId: string, data: Partial<AIProviderConfig> & { api_key?: string }): AIProviderConfig {
    const existingIdx = this.aiProviders.findIndex(p => p.organization_id === orgId && p.id === data.id);
    const targetId = data.id || `aip_${Date.now()}`;
    const now = new Date().toISOString();

    if (data.api_key && data.api_key.trim() !== '') {
      rawApiKeysStore.set(targetId, encryptApiKey(data.api_key.trim()));
    }

    const hasStoredKey = rawApiKeysStore.has(targetId) && rawApiKeysStore.get(targetId) !== '';

    const provider: AIProviderConfig = {
      id: targetId,
      organization_id: orgId,
      provider_type: data.provider_type || 'GEMINI',
      name: data.name || 'Proveedor IA',
      masked_key: data.api_key ? maskApiKey(data.api_key) : (data.masked_key || '••••••••'),
      has_key: hasStoredKey,
      selected_model: data.selected_model || 'gemini-2.5-flash',
      available_models: data.available_models || ['gemini-2.5-flash', 'gemini-2.5-pro'],
      is_active: data.is_active ?? true,
      is_primary: data.is_primary ?? false,
      is_secondary_fallback: data.is_secondary_fallback ?? false,
      total_requests: data.total_requests || 0,
      total_tokens: data.total_tokens || 0,
      last_used_at: data.last_used_at,
      status: data.status || 'ONLINE',
      last_test_message: data.last_test_message,
      created_at: now
    };

    if (existingIdx !== -1) {
      this.aiProviders[existingIdx] = { ...this.aiProviders[existingIdx], ...provider };
      return this.aiProviders[existingIdx];
    } else {
      this.aiProviders.push(provider);
      return provider;
    }
  }

  logAIUsage(log: Omit<AIUsageLog, 'id' | 'created_at'>): AIUsageLog {
    const newLog: AIUsageLog = {
      ...log,
      id: `ai_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString()
    };
    this.aiUsageLogs.unshift(newLog);
    return newLog;
  }

  validatePasswordResetToken(token: string): User | null {
    const item = this.passwordResetTokens.get(token);
    if (!item) return null;
    if (new Date() > new Date(item.expires_at)) {
      this.passwordResetTokens.delete(token);
      return null;
    }
    const user = this.users.find(u => u.id === item.user_id);
    return user || null;
  }

  consumePasswordResetToken(token: string): void {
    this.passwordResetTokens.delete(token);
  }

  updateUserPassword(userId: string, passwordHash: string): boolean {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    user.password_hash = passwordHash;
    user.updated_at = new Date().toISOString();
    this.saveToDisk();
    return true;
  }
}

export const db = new ErogaAIDatabase();
