export type RoleType = 'ADMIN' | 'ACCOUNTANT' | 'SUPERVISOR' | 'EMPLOYEE';

export type AppPortal = 'company' | 'super-admin';

export type CompanyView = 
  | 'dashboard' 
  | 'expenses' 
  | 'cost-consolidation' 
  | 'categories' 
  | 'suppliers' 
  | 'projects-vehicles' 
  | 'dgii-606' 
  | 'erp-integration' 
  | 'audit-logs' 
  | 'organization' 
  | 'team'
  | 'users'
  | 'api-keys' 
  | 'api-docs' 
  | 'ai-config'
  | 'mobile-capacitor';

export type SuperAdminView = 
  | 'saas-tenants' 
  | 'saas-ai-providers' 
  | 'saas-telemetry' 
  | 'saas-audit-logs';

export type ActiveViewType = CompanyView | SuperAdminView;

export type ERPSyncStatus = 
  | 'DESACTIVADO' 
  | 'CONFIGURACION_INCOMPLETA' 
  | 'CONECTANDO' 
  | 'CONECTADO' 
  | 'ERROR_CONEXION' 
  | 'SINCRONIZACION_PENDIENTE' 
  | 'SINCRONIZACION_ACTIVA'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

export interface ERPConfig {
  organization_id: string;
  is_enabled?: boolean;
  api_endpoint: string;
  api_key_masked: string;
  encrypted_api_key?: string;
  target_company_id?: string;
  target_branch_id?: string;
  auto_sync_on_approval: boolean;
  ledger_account_default: string;
  last_sync_time?: string;
  last_test_time?: string;
  last_error_message?: string;
  sync_status: ERPSyncStatus;
}

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  code: string; // e.g. "CAT-COM-01"
  account_code: string; // e.g. "6105-01"
  dgii_type_code: string; // e.g. "02 - Gastos por Trabajos, Suministros y Servicios"
  default_classification: ExpenseClassification;
  default_itbis_rate: number; // 0, 16, 18
  monthly_budget?: number;
  icon?: string;
  color?: string;
  is_active: boolean;
  is_system?: boolean;
  requires_approval_above?: number;
  created_at: string;
}

export interface CostCenter {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  manager_name?: string;
  budget_monthly: number;
  spent_current_month: number;
}

export interface Supplier {
  id: string;
  organization_id: string;
  rnc: string;
  rnc_normalized?: string;
  name: string;
  trade_name?: string;
  phone?: string;
  email?: string;
  category_default?: string;
  status_dgii: 'ACTIVO' | 'SUSPENDIDO' | 'DADO_DE_BAJA' | 'INACTIVO' | 'NO_LOCALIZADO' | 'DESCONOCIDO';
  categoria_dgii?: string;
  regimen_de_pagos?: string;
  actividad_economica?: string;
  administracion_local?: string;
  facturador_electronico?: string;
  licencias_vhm?: string;
  dgii_source?: string;
  dgii_last_verified_at?: string;
  dgii_metadata?: Record<string, unknown>;
  total_invoiced: number;
  created_at: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  client_name?: string;
  budget: number;
  spent: number;
  status: 'ACTIVO' | 'FINALIZADO' | 'PAUSADO';
}

export interface Vehicle {
  id: string;
  organization_id: string;
  plate: string;
  brand: string;
  model: string;
  driver_name?: string;
  fuel_type: 'GASOLINA_PREMIUM' | 'GASOLINA_REGULAR' | 'GASOIL_OPTIMO' | 'GASOIL_REGULAR' | 'GLP' | 'ELECTRICO';
  total_fuel_spent: number;
  last_mileage?: number;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string;
  impersonated_by?: string;
  action: 
    | 'CREAR_GASTO' 
    | 'ACTUALIZAR_GASTO' 
    | 'APROBAR_GASTO' 
    | 'RECHAZAR_GASTO' 
    | 'SOLICITAR_CORRECCION' 
    | 'EXPORTAR_606' 
    | 'SYNC_ERP' 
    | 'CONFIG_IA' 
    | 'CREAR_EMPRESA'
    | 'ACTUALIZAR_EMPRESA'
    | 'DESACTIVAR_EMPRESA'
    | 'CREAR_SUCURSAL'
    | 'ACTUALIZAR_SUCURSAL'
    | 'DESACTIVAR_SUCURSAL'
    | 'CREAR_API_KEY'
    | 'REVOCAR_API_KEY'
    | 'REGENERAR_API_KEY'
    | 'CREAR_USUARIO'
    | 'ACTUALIZAR_USUARIO'
    | 'DESACTIVAR_USUARIO'
    | 'CREAR_ROL'
    | 'ACTUALIZAR_ROL'
    | 'ELIMINAR_ROL'
    | 'ACTUALIZAR_MATRIZ_RBAC'
    | 'RESET_MATRIZ_RBAC'
    | 'IMPERSONATE_ORGANIZATION'
    | 'PLATFORM_SETTINGS';
  entity_type: 'EXPENSE' | 'SETTINGS' | 'USER' | 'REPORT' | 'SUPPLIER' | 'PROJECT' | 'VEHICLE' | 'COMPANY' | 'BRANCH' | 'API_KEY' | 'ROLE' | 'ORGANIZATION';
  entity_id: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  created_at: string;
}

export interface PermissionDefinition {
  key: string;
  category: 'EXPENSES' | 'APPROVALS' | 'DGII_FISCAL' | 'ERP' | 'MASTER_DATA' | 'ORGANIZATION' | 'TEAM_RBAC' | 'API_KEYS' | 'AUDIT';
  category_label: string;
  name: string;
  description: string;
}

export interface RoleDefinition {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  is_system?: boolean;
  color?: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export type ExpenseStatus = 
  | 'BORRADOR' 
  | 'PENDIENTE_REVISION' 
  | 'APROBADO' 
  | 'RECHAZADO' 
  | 'REQUIERE_CORRECCION'
  | 'SINCRONIZADO_ERP';

export type ExpenseClassification = 
  | 'GASTO_OPERATIVO' 
  | 'COSTO_VENTA' 
  | 'COMPRA_INVENTARIO' 
  | 'ACTIVO_FIJO';

export type NcfType = 
  | 'B01' // Crédito Fiscal
  | 'B02' // Consumidor Final
  | 'B11' // Proveedores Informales
  | 'B14' // Regímenes Especiales
  | 'B15' // Gubernamental
  | 'B16' // Exportaciones
  | 'E31' // Factura Electrónica e-NCF Crédito Fiscal
  | 'E32' // e-NCF Consumo
  | 'E44' // e-NCF Regímenes Especiales
  | 'E45'; // e-NCF Gubernamental

export type AIProviderType = 'GEMINI' | 'GROQ' | 'OPENAI' | 'CODEMORF';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: RoleType | string;
  platform_role?: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'SUPPORT' | 'BILLING_ADMIN' | 'NONE';
  organization_id: string;
  department?: string;
  status: 'ACTIVE' | 'INACTIVE';
  is_active?: boolean;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: RoleType | string;
  status: 'ACTIVE' | 'INACTIVE';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  rnc: string;
  currency: 'DOP' | 'USD' | 'EUR';
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  created_at: string;
  updated_at?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
  onboarding_step?: number;
  onboarding_done_at?: string;
  monthly_scans_used?: number;
  monthly_scans_limit?: number;
  storage_mb_used?: number;
  storage_mb_limit?: number;
}

export type TaxRegimeType = 
  | 'REGIMEN_GENERAL' 
  | 'RST_PERSONAS_FISICAS' 
  | 'RST_COMPRAS' 
  | 'ZONA_FRANCA' 
  | 'ORGANISMO_SIN_FINES_LUCRO';

export interface Company {
  id: string;
  organization_id: string;
  name: string; // Razón Social Oficial
  trade_name?: string; // Nombre Comercial
  rnc: string;
  id_type: 'RNC' | 'CEDULA';
  tax_regime: TaxRegimeType;
  address: string;
  province: string;
  municipality: string;
  sector?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  currency: 'DOP' | 'USD' | 'EUR';
  country: string;
  timezone: string;
  is_main: boolean;
  status: 'ACTIVO' | 'INACTIVO';
  is_active: boolean;
  branches_count?: number;
  expenses_count?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  company_id: string;
  organization_id: string;
  name: string;
  code: string;
  address: string;
  province?: string;
  municipality?: string;
  phone?: string;
  responsible?: string;
  status: 'ACTIVO' | 'INACTIVO';
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyScope {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'OCR' | 'EXPENSES' | 'DGII' | 'COMPANIES' | 'SUPPLIERS';
}

export interface ApiKey {
  id: string;
  organization_id: string;
  company_id: string;
  company_name?: string;
  branch_id?: string;
  branch_name?: string;
  name: string;
  key_hash: string;
  masked_key: string;
  key_prefix?: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  total_requests: number;
  request_count?: number;
  is_active: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyLog {
  id: string;
  api_key_id: string;
  api_key_name?: string;
  organization_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  ip_address: string;
  latency_ms: number;
  duration_ms?: number;
  created_at: string;
}

export interface ApiKeyUsage {
  api_key_id: string;
  total_requests: number;
  total_ocr_scans: number;
  total_expenses_created: number;
  total_606_exports: number;
  last_used_at: string | null;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  itbis_rate: number; // 0, 16, 18
  total: number;
  sku?: string;
  discount?: number;
  taxable_amount?: number;
  itbis_amount?: number;
  segment_index?: number;
  confidence?: number;
  raw_text?: string;
  cost_center_id?: string;
  project_id?: string;
}

export interface FieldConfidences {
  supplier_name: number;
  supplier_rnc: number;
  ncf: number;
  date: number;
  subtotal: number;
  itbis_amount: number;
  total_amount: number;
}

export interface ExpenseRecord {
  id: string;
  external_id?: string;
  idempotency_key?: string;
  organization_id: string;
  company_id: string;
  company_name?: string;
  branch_id: string;
  branch_name?: string;
  created_by_user_id: string;
  created_by_name: string;
  created_by_user_name?: string;
  date: string;
  expense_date?: string;
  supplier_name: string;
  supplier_rnc: string;
  supplier_id?: string;
  receipt_session_id?: string;
  ncf: string;
  ncf_type: NcfType;
  document_type: 'FACTURA_CREDITO_FISCAL' | 'FACTURA_CONSUMO' | 'TICKET_POS' | 'COMPROBANTE_ELECTRONICO' | 'RECIBO';
  classification: ExpenseClassification;
  expense_category: string;
  cost_center_id?: string;
  project_id?: string;
  vehicle_id?: string;
  subtotal: number;
  itbis_amount: number;
  legal_tip_amount: number; // 10% propina legal
  other_taxes: number;
  total_amount: number;
  currency: 'DOP' | 'USD' | 'EUR';
  payment_method: 'TARJETA_EMPRESARIAL' | 'EFECTIVO' | 'TRANSFERENCIA' | 'CAJA_CHICA';
  dgii_expense_type?: string;
  dgii_payment_type?: string;
  status: ExpenseStatus;
  approval_notes?: string;
  correction_request_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  receipt_image_url?: string;
  receipt_thumbnail_url?: string;
  ocr_raw_text?: string;
  ai_confidence_score: number; // 0 - 100
  field_confidences?: FieldConfidences;
  ai_provider_used: AIProviderType | 'TESSERACT';
  ai_model_used: string;
  line_items: LineItem[];
  created_at: string;
  updated_at: string;
  all_sender_sync_id?: string;
  all_sender_synced_at?: string;
  erp_synced_at?: string;
  erp_sync_status?: 'PENDIENTE_SYNC' | 'ENVIANDO' | 'SINCRONIZADO' | 'ERROR_SYNC' | 'REINTENTO';
  erp_sync_attempts?: number;
  erp_sync_error?: string;
  erp_response_payload?: string;
}

export interface ReceiptRecord {
  id: string;
  organization_id: string;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  image_url?: string;
  image_base64?: string;
  file_name?: string;
  mime_type?: string;
  extraction?: ReceiptExtraction;
  fiscal_validation?: ValidationResult;
  meta?: {
    provider_used?: string;
    model_used?: string;
    confidence_score?: number;
    duration_ms?: number;
  };
  error?: string;
  created_at: string;
  updated_at: string;
}

export type ReceiptSessionStatus = 'CAPTURING' | 'PROCESSING' | 'REVIEW_REQUIRED' | 'PROCESSED' | 'FAILED' | 'SAVED';
export type ReceiptSegmentStatus = 'UPLOADED' | 'OCR_PROCESSING' | 'OCR_COMPLETED' | 'LOW_CONFIDENCE' | 'FAILED';

export interface ReceiptSegmentRecord {
  id: string;
  organization_id: string;
  receipt_session_id: string;
  segment_index: number;
  status: ReceiptSegmentStatus;
  image_url?: string;
  image_base64?: string;
  file_name?: string;
  mime_type: string;
  ocr_text?: string;
  extraction?: ReceiptExtraction;
  confidence?: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptMathReconciliation {
  is_valid: boolean;
  expected_total: number;
  calculated_total: number;
  difference: number;
  tolerance: number;
  line_items_total: number;
  discounts: number;
  probable_segment_indexes: number[];
}

export interface SupplierResolution {
  status: 'EXISTING' | 'CREATED' | 'PENDING_VALIDATION' | 'NOT_FOUND' | 'INVALID_RNC';
  supplier?: Supplier;
  dgii_status?: Supplier['status_dgii'];
  message: string;
}

export interface ReceiptSessionRecord {
  id: string;
  organization_id: string;
  status: ReceiptSessionStatus;
  supplier_id?: string;
  expense_id?: string;
  extraction?: ReceiptExtraction;
  fiscal_validation?: ValidationResult;
  reconciliation?: ReceiptMathReconciliation;
  supplier_resolution?: SupplierResolution;
  meta?: {
    provider_used?: string;
    model_used?: string;
    local_ocr_segments?: number;
    ai_used?: boolean;
    overlap_segments?: Array<{ previous_segment_index: number; current_segment_index: number; removed: number }>;
  };
  segments_count: number;
  duplicates_removed: number;
  error?: string;
  segments: ReceiptSegmentRecord[];
  created_at: string;
  updated_at: string;
}

export type WebhookEvent = 
  | 'expense.created' 
  | 'expense.updated' 
  | 'expense.approved' 
  | 'expense.rejected' 
  | 'receipt.processed' 
  | 'expense.sync.completed' 
  | 'expense.sync.failed';

export interface WebhookSubscription {
  id: string;
  organization_id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  is_active: boolean;
  created_at: string;
  last_triggered_at?: string;
}

export interface AIProviderConfig {
  id: string;
  organization_id: string;
  provider_type: AIProviderType;
  name: string;
  masked_key: string;
  has_key: boolean;
  selected_model: string;
  available_models: string[];
  is_active: boolean;
  is_primary: boolean;
  is_secondary_fallback: boolean;
  total_requests: number;
  total_tokens: number;
  last_used_at?: string;
  status: 'ONLINE' | 'UNTESTED' | 'ERROR' | 'OFFLINE';
  last_test_message?: string;
  created_at: string;
}

export interface AIUsageLog {
  id: string;
  organization_id: string;
  provider_type: AIProviderType;
  model: string;
  expense_id?: string;
  action: 'EXTRACT_RECEIPT' | 'CLASSIFY' | 'VALIDATE' | 'TEST_CONNECTION';
  tokens_prompt: number;
  tokens_completion: number;
  duration_ms: number;
  status: 'SUCCESS' | 'ERROR';
  created_at: string;
}

export interface ReceiptExtraction {
  supplier_name: string;
  supplier_rnc: string;
  ncf: string;
  ncf_type: NcfType;
  date: string;
  subtotal: number;
  itbis_amount: number;
  legal_tip_amount: number;
  other_taxes: number;
  total_amount: number;
  currency: 'DOP' | 'USD' | 'EUR';
  document_type: 'FACTURA_CREDITO_FISCAL' | 'FACTURA_CONSUMO' | 'TICKET_POS' | 'COMPROBANTE_ELECTRONICO' | 'RECIBO';
  suggested_classification: ExpenseClassification;
  suggested_category: string;
  confidence_score: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    itbis_rate: number;
    total: number;
    sku?: string;
    discount?: number;
    taxable_amount?: number;
    itbis_amount?: number;
    segment_index?: number;
    confidence?: number;
    raw_text?: string;
  }>;
  raw_text?: string;
  observations?: string[];
}

export interface ClassificationSuggestion {
  classification: ExpenseClassification;
  category: string;
  confidence: number;
  reasoning: string;
  tax_deductibility: string;
}

export interface ValidationResult {
  is_valid: boolean;
  rnc_valid: boolean;
  ncf_valid: boolean;
  math_valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface AIUsage {
  total_requests: number;
  total_tokens: number;
  estimated_cost_usd: number;
  average_latency_ms: number;
}

export interface DGII606Record {
  rnc_cedula: string;
  tipo_id: '1' | '2'; // 1=RNC, 2=Cédula
  tipo_bienes_servicios: string;
  ncf: string;
  ncf_modificado: string;
  fecha_comprobante: string;
  fecha_pago: string;
  monto_servicios: number;
  monto_bienes: number;
  total_monto_facturado: number;
  itbis_facturado: number;
  itbis_retenido: number;
  itbis_proporcionalidad: number;
  itbis_costo: number;
  itbis_adelantar: number;
  itbis_percibido: number;
  retencion_renta: number;
  tipo_retencion_isr: string;
  forma_pago: string;
}

export interface EmailSettings {
  organization_id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  encrypted_pass?: string;
  smtp_from: string;
  smtp_from_name: string;
}

