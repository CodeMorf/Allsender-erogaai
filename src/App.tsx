import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { PWAProvider } from './context/PWAContext.js';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { ToastContainer } from './components/ToastContainer.js';
import { ExpenseScannerModal } from './components/ExpenseScannerModal.js';
import { ExpenseDetailModal } from './components/ExpenseDetailModal.js';
import { PWAInstallBanner } from './components/PWAInstallBanner.js';
import { OfflineIndicator } from './components/OfflineIndicator.js';
import { PWAUpdateToast } from './components/PWAUpdateToast.js';
import { MobileBottomNav } from './components/MobileBottomNav.js';
import { DashboardView } from './views/DashboardView.js';
import { ExpensesListView } from './views/ExpensesListView.js';
import { CategoriesView } from './views/CategoriesView.js';
import { CostConsolidationView } from './views/CostConsolidationView.js';
import { DGIIReportView } from './views/DGIIReportView.js';
import { OrganizationView } from './views/OrganizationView.js';
import { TeamView } from './views/TeamView.js';
import { SuperAdminView } from './views/SuperAdminView.js';
import { SuppliersView } from './views/SuppliersView.js';
import { ProjectsVehiclesView } from './views/ProjectsVehiclesView.js';
import { ERPIntegrationView } from './views/ERPIntegrationView.js';
import { AuditLogView } from './views/AuditLogView.js';
import { ApiKeysView } from './views/ApiKeysView.js';
import { ApiDocsView } from './views/ApiDocsView.js';
import { AuthView } from './views/AuthView.js';
import { ImpersonationBanner } from './components/ImpersonationBanner.js';
import { OnboardingView } from './views/OnboardingView.js';

const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Impersonation Banner for SuperAdmin Support Mode */}
        <ImpersonationBanner />

        {/* Offline notification & Queue status */}
        <OfflineIndicator />

        <Navbar />

        <main className="flex-1 overflow-y-auto p-3 pb-24 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* Modals, PWA Prompts & Toasts */}
      <ExpenseScannerModal />
      <ExpenseDetailModal />
      <PWAInstallBanner />
      <PWAUpdateToast />
      <ToastContainer />
    </div>
  );
};

const SuperAdminRoute: React.FC = () => {
  const { currentUser } = useApp();
  const isPlatformSuperAdmin = currentUser?.platform_role === 'SUPER_ADMIN' || currentUser?.platform_role === 'PLATFORM_ADMIN';

  if (!isPlatformSuperAdmin) {
    return <Navigate to="/company/dashboard" replace />;
  }

  return (
    <AuthenticatedLayout>
      <SuperAdminView />
    </AuthenticatedLayout>
  );
};

const AppRouter: React.FC = () => {
  const { currentUser, organization, fetchCompanies, fetchSession } = useApp();
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState<boolean>(false);

  // If user is not authenticated, render AuthView (Login / Register / Password Reset)
  if (!currentUser) {
    return <AuthView onSuccess={() => fetchCompanies()} />;
  }

  const isTenantOnboardingDone = !!organization?.onboarding_done_at || organization?.onboarding_step === 7 || isOnboardingDismissed || localStorage.getItem('eroga_onboarding_done') === 'true';

  // If user is authenticated for the first time, show 7-step Onboarding Wizard
  if (!isTenantOnboardingDone) {
    return (
      <OnboardingView 
        onComplete={async () => {
          try {
            await fetch('/api/organization/onboarding/complete', { method: 'POST' });
          } catch {}
          setIsOnboardingDismissed(true);
          localStorage.setItem('eroga_onboarding_done', 'true');
          fetchSession();
        }} 
      />
    );
  }

  return (
    <Routes>
      {/* Super Admin SaaS Portal */}
      <Route path="/super-admin/*" element={<SuperAdminRoute />} />

      {/* Tenant Company Portal */}
      <Route path="/company/dashboard" element={<AuthenticatedLayout><DashboardView /></AuthenticatedLayout>} />
      <Route path="/company/expenses" element={<AuthenticatedLayout><ExpensesListView /></AuthenticatedLayout>} />
      <Route path="/company/categories" element={<AuthenticatedLayout><CategoriesView /></AuthenticatedLayout>} />
      <Route path="/company/cost-consolidation" element={<AuthenticatedLayout><CostConsolidationView /></AuthenticatedLayout>} />
      <Route path="/company/suppliers" element={<AuthenticatedLayout><SuppliersView /></AuthenticatedLayout>} />
      <Route path="/company/projects-vehicles" element={<AuthenticatedLayout><ProjectsVehiclesView /></AuthenticatedLayout>} />
      <Route path="/company/dgii-606" element={<AuthenticatedLayout><DGIIReportView /></AuthenticatedLayout>} />
      <Route path="/company/erp-integration" element={<AuthenticatedLayout><ERPIntegrationView /></AuthenticatedLayout>} />
      <Route path="/company/api-keys" element={<AuthenticatedLayout><ApiKeysView /></AuthenticatedLayout>} />
      <Route path="/company/api-docs" element={<AuthenticatedLayout><ApiDocsView /></AuthenticatedLayout>} />
      <Route path="/company/audit-logs" element={<AuthenticatedLayout><AuditLogView /></AuthenticatedLayout>} />
      <Route path="/company/organization" element={<AuthenticatedLayout><OrganizationView /></AuthenticatedLayout>} />
      <Route path="/company/team" element={<AuthenticatedLayout><TeamView /></AuthenticatedLayout>} />
      <Route path="/company/users" element={<AuthenticatedLayout><TeamView /></AuthenticatedLayout>} />

      {/* Fallback & Root Redirect */}
      <Route path="/" element={<Navigate to="/company/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/company/dashboard" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PWAProvider>
          <AppProvider>
            <AppRouter />
          </AppProvider>
        </PWAProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
