import { db } from '../db.ts';

export interface EntitlementLimits {
  max_users: number;
  max_companies: number;
  max_branches: number;
  ocr_limit: number;
  managed_ai_tokens: number;
  api_request_limit: number;
  storage_mb: number;
  email_reports: boolean;
  erp_sync: boolean;
  api_access: boolean;
}

const PLAN_LIMITS: Record<string, EntitlementLimits> = {
  STARTER: {
    max_users: 3,
    max_companies: 1,
    max_branches: 2,
    ocr_limit: 100,
    managed_ai_tokens: 50000,
    api_request_limit: 1000,
    storage_mb: 500.0,
    email_reports: false,
    erp_sync: false,
    api_access: true
  },
  PROFESSIONAL: {
    max_users: 10,
    max_companies: 3,
    max_branches: 10,
    ocr_limit: 500,
    managed_ai_tokens: 250000,
    api_request_limit: 10000,
    storage_mb: 2000.0,
    email_reports: true,
    erp_sync: true,
    api_access: true
  },
  BUSINESS: {
    max_users: 25,
    max_companies: 10,
    max_branches: 30,
    ocr_limit: 2000,
    managed_ai_tokens: 1000000,
    api_request_limit: 50000,
    storage_mb: 10000.0,
    email_reports: true,
    erp_sync: true,
    api_access: true
  },
  ENTERPRISE: {
    max_users: 9999,
    max_companies: 9999,
    max_branches: 9999,
    ocr_limit: 999999,
    managed_ai_tokens: 99999999,
    api_request_limit: 9999999,
    storage_mb: 100000.0,
    email_reports: true,
    erp_sync: true,
    api_access: true
  }
};

export class EntitlementService {
  static getLimitsForOrg(orgId: string): EntitlementLimits {
    const org = db.getOrganizationById(orgId);
    const plan = org?.plan || 'STARTER';
    return PLAN_LIMITS[plan] || PLAN_LIMITS.STARTER;
  }

  static canCreateUser(orgId: string): boolean {
    const limits = this.getLimitsForOrg(orgId);
    const currentUsers = db.getUsers(orgId).length;
    return currentUsers < limits.max_users;
  }

  static canCreateCompany(orgId: string): boolean {
    const limits = this.getLimitsForOrg(orgId);
    const currentCompanies = db.getCompanies(orgId).length;
    return currentCompanies < limits.max_companies;
  }

  static canCreateBranch(orgId: string, companyId?: string): boolean {
    const limits = this.getLimitsForOrg(orgId);
    const currentBranches = db.getBranches(orgId, companyId).length;
    return currentBranches < limits.max_branches;
  }

  static canUseOCRScan(orgId: string): boolean {
    const limits = this.getLimitsForOrg(orgId);
    const org = db.getOrganizationById(orgId);
    const used = org?.monthly_scans_used || 0;
    return used < limits.ocr_limit;
  }
}
