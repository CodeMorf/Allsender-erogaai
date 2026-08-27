import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  ExpenseRecord, 
  User, 
  Organization, 
  Company, 
  Branch, 
  AIProviderConfig, 
  RoleType, 
  ExpenseStatus,
  ExpenseCategory,
  CostCenter,
  Supplier,
  Project,
  Vehicle,
  AuditLog,
  ERPConfig,
  AppPortal,
  ActiveViewType,
  ApiKey,
  ApiKeyScope,
  ApiKeyLog,
  RoleDefinition,
  PermissionDefinition
} from '../types.ts';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface OfflineQueueItem {
  id: string;
  expense: Partial<ExpenseRecord>;
  timestamp: string;
}

interface AppContextType {
  // Portal
  portal: AppPortal;
  setPortal: (portal: AppPortal) => void;

  // Session & Multi-Company Tenant
  organization: Organization | null;
  organizations: Organization[];
  companies: Company[];
  branches: Branch[];
  currentCompany: Company | null;
  currentBranch: Branch | null;
  setCurrentCompany: (c: Company | null) => void;
  setCurrentBranch: (b: Branch | null) => void;
  fetchCompanies: () => Promise<void>;
  saveCompany: (comp: Partial<Company>) => Promise<{ company?: Company; error?: string }>;
  deactivateCompany: (companyId: string) => Promise<boolean>;
  fetchBranches: (companyId?: string) => Promise<void>;
  saveBranch: (branch: Partial<Branch>) => Promise<{ branch?: Branch; error?: string }>;
  deactivateBranch: (branchId: string) => Promise<boolean>;
  
  // User & Roles (RBAC)
  currentUser: User | null;
  users: User[];
  roles: RoleDefinition[];
  permissionsCatalog: PermissionDefinition[];
  isLoadingRoles: boolean;
  setUserRole: (role: RoleType) => void;
  switchCurrentUser: (user: User) => void;
  fetchUsers: () => Promise<void>;
  saveUser: (user: Partial<User>) => Promise<{ user?: User; error?: string }>;
  deactivateUser: (userId: string) => Promise<boolean>;
  fetchRoles: () => Promise<void>;
  saveRole: (role: Partial<RoleDefinition>) => Promise<{ role?: RoleDefinition; error?: string }>;
  deleteRole: (roleId: string) => Promise<{ success: boolean; message: string }>;
  updateRbacMatrix: (updates: { roleId: string; permissions: string[] }[]) => Promise<boolean>;
  resetRbacMatrix: () => Promise<boolean>;
  hasPermission: (permissionKey: string) => boolean;
  
  // Navigation & Theme
  activeView: ActiveViewType;
  setActiveView: (view: ActiveViewType) => void;
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Expenses State & Operations
  expenses: ExpenseRecord[];
  isLoadingExpenses: boolean;
  fetchExpenses: () => Promise<void>;
  createExpense: (expense: Partial<ExpenseRecord>) => Promise<ExpenseRecord>;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>) => Promise<void>;
  updateExpenseStatus: (id: string, status: ExpenseStatus, notes?: string, correctionNote?: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  syncWithAllSenderERP: (expenseIds?: string[]) => Promise<{ message: string; count: number }>;

  // Offline & Synchronization
  isOffline: boolean;
  offlineQueueCount: number;
  syncOfflineQueue: () => Promise<void>;

  // API Keys (External Integration / Microservice mode)
  apiKeys: ApiKey[];
  apiKeyScopes: ApiKeyScope[];
  apiKeyLogs: ApiKeyLog[];
  isLoadingApiKeys: boolean;
  fetchApiKeys: () => Promise<void>;
  fetchApiKeyScopes: () => Promise<void>;
  fetchApiKeyLogs: () => Promise<void>;
  createApiKey: (data: { name: string; company_id: string; branch_id?: string; scopes: string[]; expires_at?: string | null }) => Promise<{ apiKey?: ApiKey; rawKey?: string; warning?: string; error?: string }>;
  regenerateApiKey: (id: string) => Promise<{ apiKey?: ApiKey; rawKey?: string; warning?: string; error?: string }>;
  toggleApiKey: (id: string, isActive: boolean) => Promise<void>;
  revokeApiKey: (id: string) => Promise<boolean>;

  // Categories & Cost Centers
  categories: ExpenseCategory[];
  isLoadingCategories: boolean;
  fetchCategories: () => Promise<void>;
  saveCategory: (cat: Partial<ExpenseCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  costCenters: CostCenter[];
  fetchCostCenters: () => Promise<void>;
  saveCostCenter: (cc: Partial<CostCenter>) => Promise<void>;
  deleteCostCenter: (id: string) => Promise<void>;

  // Suppliers (Proveedores)
  suppliers: Supplier[];
  isLoadingSuppliers: boolean;
  fetchSuppliers: () => Promise<void>;
  saveSupplier: (sup: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Projects (Proyectos / Obras)
  projects: Project[];
  fetchProjects: () => Promise<void>;
  saveProject: (p: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Vehicles (Flotilla)
  vehicles: Vehicle[];
  fetchVehicles: () => Promise<void>;
  saveVehicle: (v: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  // Audit Logs
  auditLogs: AuditLog[];
  fetchAuditLogs: () => Promise<void>;

  // ERP AllSender Config
  erpConfig: ERPConfig | null;
  fetchERPConfig: () => Promise<void>;
  saveERPConfig: (cfg: Partial<ERPConfig>) => Promise<void>;
  
  // AI Providers
  aiProviders: AIProviderConfig[];
  isLoadingProviders: boolean;
  fetchAIProviders: () => Promise<void>;
  saveAIProvider: (data: Partial<AIProviderConfig> & { api_key?: string }) => Promise<void>;
  testAIProvider: (id: string) => Promise<{ success: boolean; message: string; latency_ms?: number }>;
  
  // Modals, Drawer & Active Document
  isScannerOpen: boolean;
  openScanner: () => void;
  closeScanner: () => void;
  selectedExpense: ExpenseRecord | null;
  setSelectedExpense: (exp: ExpenseRecord | null) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  toggleMobileDrawer: () => void;
  
  // Toasts
  toasts: Toast[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portal, setPortalState] = useState<AppPortal>('company');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // RBAC Roles & Permissions Matrix
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionDefinition[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);

  const [activeView, setActiveView] = useState<ActiveViewType>('dashboard');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState<boolean>(true);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeyScopes, setApiKeyScopes] = useState<ApiKeyScope[]>([]);
  const [apiKeyLogs, setApiKeyLogs] = useState<ApiKeyLog[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState<boolean>(false);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [erpConfig, setERPConfig] = useState<ERPConfig | null>(null);

  const [aiProviders, setAiProviders] = useState<AIProviderConfig[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);

  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Offline support
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('eroga_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleMobileDrawer = () => setIsMobileDrawerOpen(prev => !prev);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Connectivity event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('success', 'Conexión Restaurada', 'El sistema está en línea. Sincronizando datos...');
      if (offlineQueue.length > 0) {
        syncOfflineQueue();
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast('warning', 'Modo Sin Conexión', 'Trabajando en modo offline. Los comprobantes se guardarán localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  // Persist offline queue
  useEffect(() => {
    try {
      localStorage.setItem('eroga_offline_queue', JSON.stringify(offlineQueue));
    } catch (e) {
      console.warn('Could not persist offline queue', e);
    }
  }, [offlineQueue]);

  const toggleTheme = () => {
    setThemeMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const setPortal = (newPortal: AppPortal) => {
    setPortalState(newPortal);
    if (newPortal === 'super-admin') {
      setActiveView('saas-tenants');
    } else {
      setActiveView('dashboard');
    }
  };

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data && data.organization) {
            setOrganization(data.organization);
            const compList = Array.isArray(data.companies) ? data.companies : [];
            const branchList = Array.isArray(data.branches) ? data.branches : [];
            setCompanies(compList);
            setBranches(branchList);
            setCurrentCompany(compList[0] || null);
            setCurrentBranch(branchList[0] || null);
            setUsers(Array.isArray(data.users) ? data.users : []);
            setCurrentUser(data.currentUser || null);
          }
        } catch (parseErr) {
          console.warn('Session JSON parse error:', parseErr);
        }
      }

      const orgsRes = await fetch('/api/organizations');
      if (orgsRes.ok) {
        const oData = await orgsRes.json();
        if (Array.isArray(oData.organizations)) {
          setOrganizations(oData.organizations);
        }
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.companies) ? data.companies : [];
        setCompanies(list);
        if (!currentCompany && list.length > 0) {
          setCurrentCompany(list[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const saveCompany = async (compData: Partial<Company>): Promise<{ company?: Company; error?: string }> => {
    const isEdit = Boolean(compData.id);
    const url = isEdit ? `/api/companies/${compData.id}` : '/api/companies';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...compData,
          organization_id: organization?.id || 'org_allsender_corp',
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        showToast('error', 'Error al Guardar Empresa', data.error || 'No se pudo guardar la empresa');
        return { error: data.error || 'Error al guardar' };
      }

      await fetchCompanies();
      await fetchAuditLogs();
      showToast('success', 'Empresa Guardada', `La empresa "${data.company.name}" fue registrada correctamente.`);
      
      if (!currentCompany || currentCompany.id === data.company.id) {
        setCurrentCompany(data.company);
      }

      return { company: data.company };
    } catch (err: any) {
      showToast('error', 'Error de Conexión', err.message);
      return { error: err.message };
    }
  };

  const deactivateCompany = async (companyId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'No se pudo desactivar', data.error || 'Error al procesar');
        return false;
      }

      await fetchCompanies();
      await fetchAuditLogs();
      showToast('info', 'Empresa Desactivada', data.message || 'Empresa desactivada con éxito.');
      
      if (currentCompany?.id === companyId) {
        const remaining = companies.filter(c => c.id !== companyId && c.is_active);
        setCurrentCompany(remaining[0] || null);
      }
      return true;
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      return false;
    }
  };

  const fetchBranches = async (companyId?: string) => {
    try {
      const q = companyId ? `?company_id=${companyId}` : '';
      const res = await fetch(`/api/branches${q}`);
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data.branches) ? data.branches : []);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const saveBranch = async (branchData: Partial<Branch>): Promise<{ branch?: Branch; error?: string }> => {
    const isEdit = Boolean(branchData.id);
    const url = isEdit ? `/api/branches/${branchData.id}` : '/api/branches';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...branchData,
          organization_id: organization?.id || 'org_allsender_corp',
          company_id: branchData.company_id || currentCompany?.id,
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        showToast('error', 'Error al Guardar Sucursal', data.error || 'No se pudo registrar la sucursal');
        return { error: data.error || 'Error al guardar' };
      }

      await fetchBranches(currentCompany?.id);
      await fetchCompanies();
      await fetchAuditLogs();
      showToast('success', 'Sucursal Guardada', `Sucursal "${data.branch.name}" registrada con éxito.`);
      return { branch: data.branch };
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      return { error: err.message };
    }
  };

  const deactivateBranch = async (branchId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'Error', data.error || 'No se pudo desactivar');
        return false;
      }

      await fetchBranches(currentCompany?.id);
      await fetchCompanies();
      await fetchAuditLogs();
      showToast('info', 'Sucursal Desactivada', data.message);
      return true;
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      return false;
    }
  };

  // API Keys
  const fetchApiKeys = async () => {
    setIsLoadingApiKeys(true);
    try {
      const res = await fetch('/api/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(Array.isArray(data.api_keys) ? data.api_keys : []);
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const fetchApiKeyScopes = async () => {
    try {
      const res = await fetch('/api/api-keys/scopes');
      if (res.ok) {
        const data = await res.json();
        setApiKeyScopes(Array.isArray(data.scopes) ? data.scopes : []);
      }
    } catch (err) {
      console.error('Error fetching API scopes:', err);
    }
  };

  const fetchApiKeyLogs = async () => {
    try {
      const res = await fetch('/api/api-keys/logs');
      if (res.ok) {
        const data = await res.json();
        setApiKeyLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch (err) {
      console.error('Error fetching API key logs:', err);
    }
  };

  const createApiKey = async (data: {
    name: string;
    company_id: string;
    branch_id?: string;
    scopes: string[];
    expires_at?: string | null;
  }) => {
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          organization_id: organization?.id || 'org_allsender_corp',
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        showToast('error', 'Error al Generar API Key', resData.error || 'No se pudo generar la clave');
        return { error: resData.error };
      }

      await fetchApiKeys();
      await fetchAuditLogs();
      return resData;
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      return { error: err.message };
    }
  };

  const regenerateApiKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        showToast('error', 'Error al Regenerar API Key', resData.error);
        return { error: resData.error };
      }

      await fetchApiKeys();
      await fetchAuditLogs();
      return resData;
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      return { error: err.message };
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/api-keys/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });
      if (res.ok) {
        await fetchApiKeys();
        showToast('info', 'Estado Actualizado', `API Key ${isActive ? 'activada' : 'pausada'}.`);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const revokeApiKey = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (res.ok) {
        await fetchApiKeys();
        await fetchAuditLogs();
        showToast('info', 'API Key Revocada', data.message || 'La clave fue revocada permanentemente.');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      return false;
    }
  };

  const fetchExpenses = async () => {
    setIsLoadingExpenses(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          const list = Array.isArray(data) ? data : (Array.isArray(data?.expenses) ? data.expenses : []);
          setExpenses(list);
        } catch (jsonErr) {
          console.warn('Expenses JSON parse warning:', jsonErr);
        }
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const saveCategory = async (cat: Partial<ExpenseCategory>) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat)
    });

    if (!res.ok) throw new Error('Error al guardar categoría');
    await fetchCategories();
    showToast('success', 'Categoría Guardada', `Categoría ${cat.name || ''} actualizada.`);
  };

  const deleteCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Error al eliminar categoría');
    }
    await fetchCategories();
    showToast('info', 'Categoría Eliminada', 'La categoría fue removida.');
  };

  const fetchCostCenters = async () => {
    try {
      const res = await fetch('/api/cost-centers');
      if (res.ok) {
        const data = await res.json();
        setCostCenters(Array.isArray(data.costCenters) ? data.costCenters : []);
      }
    } catch (err) {
      console.error('Error fetching cost centers:', err);
    }
  };

  const saveCostCenter = async (cc: Partial<CostCenter>) => {
    const res = await fetch('/api/cost-centers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cc)
    });
    if (!res.ok) throw new Error('Error al guardar centro de costos');
    await fetchCostCenters();
    showToast('success', 'Centro de Costos', `Guardado: ${cc.name}`);
  };

  const deleteCostCenter = async (id: string) => {
    const res = await fetch(`/api/cost-centers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar centro de costos');
    await fetchCostCenters();
    showToast('info', 'Centro de Costos', 'Centro de costos eliminado');
  };

  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true);
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const saveSupplier = async (sup: Partial<Supplier>) => {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sup)
    });
    if (!res.ok) throw new Error('Error al guardar proveedor');
    await fetchSuppliers();
    showToast('success', 'Proveedor Guardado', `${sup.name || sup.rnc} registrado correctamente.`);
  };

  const deleteSupplier = async (id: string) => {
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar proveedor');
    await fetchSuppliers();
    showToast('info', 'Proveedor', 'Proveedor eliminado.');
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const saveProject = async (p: Partial<Project>) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    if (!res.ok) throw new Error('Error al guardar proyecto');
    await fetchProjects();
    showToast('success', 'Proyecto / Obra', `Guardado: ${p.name}`);
  };

  const deleteProject = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar proyecto');
    await fetchProjects();
    showToast('info', 'Proyecto', 'Proyecto eliminado.');
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const saveVehicle = async (v: Partial<Vehicle>) => {
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v)
    });
    if (!res.ok) throw new Error('Error al guardar vehículo');
    await fetchVehicles();
    showToast('success', 'Flotilla Vehicular', `Vehículo ${v.plate} actualizado.`);
  };

  const deleteVehicle = async (id: string) => {
    const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar vehículo');
    await fetchVehicles();
    showToast('info', 'Flotilla', 'Vehículo eliminado.');
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  const fetchERPConfig = async () => {
    try {
      const res = await fetch('/api/erp/config');
      if (res.ok) {
        const data = await res.json();
        setERPConfig(data.config || null);
      }
    } catch (err) {
      console.error('Error fetching ERP config:', err);
    }
  };

  const saveERPConfig = async (cfg: Partial<ERPConfig>) => {
    const res = await fetch('/api/erp/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    if (!res.ok) throw new Error('Error al guardar configuración ERP');
    const data = await res.json();
    setERPConfig(data.config);
    showToast('success', 'AllSender ERP', 'Parámetros de conexión ERP actualizados.');
  };

  const fetchAIProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const res = await fetch('/api/ai/providers');
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          const list = Array.isArray(data) ? data : (Array.isArray(data?.providers) ? data.providers : []);
          setAiProviders(list);
        } catch (jsonErr) {
          console.warn('AI Providers parse warning:', jsonErr);
        }
      }
    } catch (err) {
      console.error('Error fetching AI providers:', err);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    const items = [...offlineQueue];
    let synced = 0;

    for (const item of items) {
      try {
        await createExpense(item.expense);
        synced++;
      } catch (err) {
        console.error('Failed to sync offline item', err);
      }
    }

    setOfflineQueue([]);
    localStorage.removeItem('eroga_offline_queue');
    showToast('success', 'Sincronización Offline Completa', `Se sincronizaron ${synced} comprobantes guardados sin conexión.`);
  };

  useEffect(() => {
    fetchSession();
    fetchExpenses();
    fetchCategories();
    fetchCostCenters();
    fetchSuppliers();
    fetchProjects();
    fetchVehicles();
    fetchAuditLogs();
    fetchERPConfig();
    fetchAIProviders();
    fetchApiKeys();
    fetchApiKeyScopes();
    fetchApiKeyLogs();
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const res = await fetch('/api/rbac/roles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.roles)) {
          setRoles(data.roles);
        }
        if (Array.isArray(data.permissions)) {
          setPermissionsCatalog(data.permissions);
        }
      }
    } catch (err) {
      console.warn('Error fetching RBAC roles:', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const saveRole = async (roleData: Partial<RoleDefinition>): Promise<{ role?: RoleDefinition; error?: string }> => {
    try {
      const isEdit = Boolean(roleData.id);
      const url = isEdit ? `/api/rbac/roles/${roleData.id}` : '/api/rbac/roles';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...roleData,
          organization_id: organization?.id || 'org_allsender_corp',
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        showToast('error', 'Error al Guardar Rol', data.error || 'No se pudo guardar el rol');
        return { error: data.error };
      }

      await fetchRoles();
      await fetchAuditLogs();
      showToast('success', isEdit ? 'Rol Actualizado' : 'Rol Creado', data.message || `El rol "${data.role.name}" ha sido guardado exitosamente.`);
      return { role: data.role };
    } catch (err: any) {
      showToast('error', 'Error de Red', err.message);
      return { error: err.message };
    }
  };

  const deleteRole = async (roleId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'No se pudo eliminar', data.error || 'Error al eliminar rol');
        return { success: false, message: data.error || 'Error al eliminar' };
      }

      await fetchRoles();
      await fetchAuditLogs();
      showToast('info', 'Rol Eliminado', data.message || 'El rol personalizado fue eliminado.');
      return { success: true, message: data.message };
    } catch (err: any) {
      showToast('error', 'Error de Red', err.message);
      return { success: false, message: err.message };
    }
  };

  const updateRbacMatrix = async (updates: { roleId: string; permissions: string[] }[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/rbac/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          organization_id: organization?.id || 'org_allsender_corp',
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'Error al Guardar Matriz', data.error || 'No se pudo actualizar la matriz RBAC');
        return false;
      }

      await fetchRoles();
      await fetchAuditLogs();
      showToast('success', 'Matriz RBAC Actualizada', data.message || 'Permisos actualizados en su entorno SaaS.');
      return true;
    } catch (err: any) {
      showToast('error', 'Error de Red', err.message);
      return false;
    }
  };

  const resetRbacMatrix = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/rbac/matrix/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organization?.id || 'org_allsender_corp',
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'Error al Restablecer', data.error || 'No se pudo restablecer la matriz RBAC');
        return false;
      }

      await fetchRoles();
      await fetchAuditLogs();
      showToast('info', 'Matriz RBAC Restablecida', data.message || 'Valores predeterminados restaurados.');
      return true;
    } catch (err: any) {
      showToast('error', 'Error de Red', err.message);
      return false;
    }
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;

    // Search in current organization's active roles list
    const roleObj = roles.find(r => r.id === currentUser.role || r.name.toLowerCase() === currentUser.role.toLowerCase());
    if (roleObj) {
      return roleObj.permissions.includes(permissionKey);
    }

    // Built-in fallback
    if (currentUser.role === 'ACCOUNTANT') {
      return [
        'expenses.view_all', 'expenses.create_ocr', 'expenses.create_manual', 'expenses.edit', 'expenses.delete',
        'approvals.approve_reject', 'approvals.request_correction',
        'fiscal.classify_ncf', 'fiscal.export_606', 'fiscal.retentions',
        'erp.sync_expenses',
        'master.suppliers', 'master.projects', 'master.vehicles', 'master.cost_centers',
        'audit.view'
      ].includes(permissionKey);
    }
    if (currentUser.role === 'SUPERVISOR') {
      return [
        'expenses.view_all', 'expenses.create_ocr', 'expenses.create_manual', 'expenses.edit',
        'approvals.approve_reject', 'approvals.request_correction', 'approvals.override_budget',
        'master.suppliers', 'master.projects', 'master.vehicles', 'master.cost_centers'
      ].includes(permissionKey);
    }
    if (currentUser.role === 'EMPLOYEE') {
      return ['expenses.create_ocr', 'expenses.create_manual', 'expenses.edit'].includes(permissionKey);
    }

    return false;
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.warn('Error fetching users:', err);
    }
  };

  const switchCurrentUser = (user: User) => {
    setCurrentUser(user);
    showToast('info', 'Usuario Activo Cambiado', `Ahora estás operando como ${user.name} (${user.role})`);
  };

  const saveUser = async (userData: Partial<User>): Promise<{ user?: User; error?: string }> => {
    try {
      const isEdit = Boolean(userData.id);
      const url = isEdit ? `/api/users/${userData.id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          organization_id: organization?.id || 'org_allsender_corp',
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'Error al Guardar Usuario', data.error || 'No se pudo guardar el usuario');
        return { error: data.error };
      }

      await fetchUsers();
      await fetchAuditLogs();
      showToast('success', isEdit ? 'Usuario Actualizado' : 'Usuario Invitado', `El colaborador "${data.user.name}" ha sido guardado exitosamente.`);
      return { user: data.user };
    } catch (err: any) {
      showToast('error', 'Error de Red', err.message);
      return { error: err.message };
    }
  };

  const deactivateUser = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr_admin_01',
          userName: currentUser?.name || 'Administrador'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'Error', data.error || 'No se pudo desactivar el usuario');
        return false;
      }

      await fetchUsers();
      await fetchAuditLogs();
      showToast('info', 'Acceso Desactivado', data.message);
      return true;
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      return false;
    }
  };

  const setUserRole = (role: RoleType) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, role });
      showToast('info', 'Rol de Usuario Cambiado', `Visualizando sistema con permisos de ${role}`);
    }
  };

  const createExpense = async (expenseData: Partial<ExpenseRecord>): Promise<ExpenseRecord> => {
    if (!navigator.onLine) {
      const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const offlineExpense: ExpenseRecord = {
        id: offlineId,
        organization_id: organization?.id || 'org_allsender_corp',
        company_id: currentCompany?.id || 'comp_main',
        branch_id: currentBranch?.id || 'branch_main',
        created_by_user_id: currentUser?.id || 'usr_admin_01',
        created_by_name: currentUser?.name || 'Usuario (Offline)',
        date: expenseData.date || new Date().toISOString().split('T')[0],
        supplier_name: expenseData.supplier_name || 'Proveedor Offline',
        supplier_rnc: expenseData.supplier_rnc || '',
        ncf: expenseData.ncf || '',
        ncf_type: expenseData.ncf_type || 'B01',
        document_type: expenseData.document_type || 'FACTURA_CREDITO_FISCAL',
        classification: expenseData.classification || 'GASTO_OPERATIVO',
        expense_category: expenseData.expense_category || 'Suministros de Oficina y Papelería',
        subtotal: expenseData.subtotal || 0,
        itbis_amount: expenseData.itbis_amount || 0,
        legal_tip_amount: expenseData.legal_tip_amount || 0,
        other_taxes: expenseData.other_taxes || 0,
        total_amount: expenseData.total_amount || 0,
        currency: expenseData.currency || 'DOP',
        payment_method: expenseData.payment_method || 'TARJETA_EMPRESARIAL',
        status: 'PENDIENTE_REVISION',
        receipt_image_url: expenseData.receipt_image_url,
        ai_confidence_score: expenseData.ai_confidence_score || 95,
        ai_provider_used: expenseData.ai_provider_used || 'GEMINI',
        ai_model_used: expenseData.ai_model_used || 'gemini-2.5-flash',
        line_items: expenseData.line_items || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setOfflineQueue(prev => [...prev, { id: offlineId, expense: expenseData, timestamp: new Date().toISOString() }]);
      setExpenses(prev => [offlineExpense, ...prev]);
      showToast('warning', 'Guardado Localmente (Offline)', `Comprobante ${offlineExpense.ncf} guardado en cola para sincronizar.`);
      return offlineExpense;
    }

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...expenseData,
        company_id: expenseData.company_id || currentCompany?.id,
        branch_id: expenseData.branch_id || currentBranch?.id,
        created_by_user_id: currentUser?.id || 'usr_admin_01',
        created_by_name: currentUser?.name || 'Administrador'
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar comprobante');
    }

    const created: ExpenseRecord = await res.json();
    setExpenses(prev => [created, ...prev]);
    await fetchAuditLogs();
    await fetchSuppliers();
    showToast('success', 'Erogación Registrada', `Comprobante ${created.ncf || 'Fiscal'} procesado exitosamente`);
    return created;
  };

  const updateExpense = async (id: string, updates: Partial<ExpenseRecord>) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        updated_by_user_id: currentUser?.id,
        updated_by_name: currentUser?.name
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar');
    }

    const updated: ExpenseRecord = await res.json();
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    if (selectedExpense?.id === id) {
      setSelectedExpense(updated);
    }
    await fetchAuditLogs();
    showToast('success', 'Erogación Actualizada', `Cambios guardados en comprobante ${updated.ncf}`);
  };

  const updateExpenseStatus = async (id: string, status: ExpenseStatus, notes?: string, correctionNote?: string) => {
    const res = await fetch(`/api/expenses/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        notes,
        correction_note: correctionNote,
        reviewer_name: currentUser?.name || 'Supervisor'
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al cambiar estado');
    }

    const updated: ExpenseRecord = await res.json();
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    if (selectedExpense?.id === id) {
      setSelectedExpense(updated);
    }

    const labels: Record<ExpenseStatus, string> = {
      APROBADO: 'Aprobado para deducción y DGII 606',
      RECHAZADO: 'Rechazado',
      REQUIERE_CORRECCION: 'Solicitud de corrección enviada',
      PENDIENTE_REVISION: 'Puesto en revisión contable',
      BORRADOR: 'Guardado como borrador',
      SINCRONIZADO_ERP: 'Sincronizado con AllSender ERP'
    };

    await fetchAuditLogs();
    showToast('success', 'Estado Actualizado', `${updated.ncf}: ${labels[status] || status}`);
  };

  const deleteExpense = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar');
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (selectedExpense?.id === id) setSelectedExpense(null);
    showToast('info', 'Erogación Eliminada', 'El registro fue removido del sistema');
  };

  const syncWithAllSenderERP = async (expenseIds?: string[]) => {
    const res = await fetch('/api/all-sender/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expense_ids: expenseIds })
    });

    const data = await res.json();
    await fetchExpenses();
    await fetchAuditLogs();
    showToast('success', 'Sincronización AllSender ERP', data.message);
    return { message: data.message, count: data.synced_count };
  };

  const saveAIProvider = async (data: Partial<AIProviderConfig> & { api_key?: string }) => {
    const res = await fetch('/api/ai/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Error al guardar proveedor de IA');
    await fetchAIProviders();
    showToast('success', 'Configuración de IA Guardada', `Proveedor ${data.name || data.provider_type} actualizado.`);
  };

  const testAIProvider = async (id: string) => {
    const res = await fetch(`/api/ai/providers/${id}/test`, { method: 'POST' });
    const data = await res.json();
    await fetchAIProviders();
    if (data.success) {
      showToast('success', 'Conexión IA Exitosa', data.message);
    } else {
      showToast('error', 'Fallo de Conexión IA', data.error || 'Error al conectar con el proveedor');
    }
    return data;
  };

  const openScanner = () => setIsScannerOpen(true);
  const closeScanner = () => setIsScannerOpen(false);

  return (
    <AppContext.Provider
      value={{
        portal,
        setPortal,
        organization,
        organizations,
        companies,
        branches,
        currentCompany,
        currentBranch,
        setCurrentCompany,
        setCurrentBranch,
        fetchCompanies,
        saveCompany,
        deactivateCompany,
        fetchBranches,
        saveBranch,
        deactivateBranch,
        currentUser,
        users,
        roles,
        permissionsCatalog,
        isLoadingRoles,
        setUserRole,
        switchCurrentUser,
        fetchUsers,
        saveUser,
        deactivateUser,
        fetchRoles,
        saveRole,
        deleteRole,
        updateRbacMatrix,
        resetRbacMatrix,
        hasPermission,
        activeView,
        setActiveView,
        themeMode,
        toggleTheme,
        expenses,
        isLoadingExpenses,
        fetchExpenses,
        createExpense,
        updateExpense,
        updateExpenseStatus,
        deleteExpense,
        syncWithAllSenderERP,
        isOffline,
        offlineQueueCount: offlineQueue.length,
        syncOfflineQueue,
        apiKeys,
        apiKeyScopes,
        apiKeyLogs,
        isLoadingApiKeys,
        fetchApiKeys,
        fetchApiKeyScopes,
        fetchApiKeyLogs,
        createApiKey,
        regenerateApiKey,
        toggleApiKey,
        revokeApiKey,
        categories,
        isLoadingCategories,
        fetchCategories,
        saveCategory,
        deleteCategory,
        costCenters,
        fetchCostCenters,
        saveCostCenter,
        deleteCostCenter,
        suppliers,
        isLoadingSuppliers,
        fetchSuppliers,
        saveSupplier,
        deleteSupplier,
        projects,
        fetchProjects,
        saveProject,
        deleteProject,
        vehicles,
        fetchVehicles,
        saveVehicle,
        deleteVehicle,
        auditLogs,
        fetchAuditLogs,
        erpConfig,
        fetchERPConfig,
        saveERPConfig,
        aiProviders,
        isLoadingProviders,
        fetchAIProviders,
        saveAIProvider,
        testAIProvider,
        isScannerOpen,
        openScanner,
        closeScanner,
        selectedExpense,
        setSelectedExpense,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        toggleMobileDrawer,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
