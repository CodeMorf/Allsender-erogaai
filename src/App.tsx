import React, { useState } from 'react';
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
import { OnboardingView } from './views/OnboardingView.js';

const MainLayout: React.FC = () => {
  const { portal, activeView, currentUser, fetchCompanies } = useApp();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    return localStorage.getItem('eroga_onboarding_done') === 'true';
  });

  // If user is not authenticated, render AuthView (Login / Register / Password Reset)
  if (!currentUser) {
    return <AuthView onSuccess={() => fetchCompanies()} />;
  }

  // If user is authenticated for the first time, show 7-step Onboarding Wizard
  if (!isOnboardingCompleted) {
    return (
      <OnboardingView 
        onComplete={() => {
          setIsOnboardingCompleted(true);
          localStorage.setItem('eroga_onboarding_done', 'true');
        }} 
      />
    );
  }

  const renderActiveView = () => {
    // If inside Super Admin Portal
    if (portal === 'super-admin') {
      return <SuperAdminView />;
    }

    // Company Portal Views
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'expenses':
        return <ExpensesListView />;
      case 'categories':
        return <CategoriesView />;
      case 'cost-consolidation':
        return <CostConsolidationView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'projects-vehicles':
        return <ProjectsVehiclesView />;
      case 'dgii-606':
        return <DGIIReportView />;
      case 'erp-integration':
        return <ERPIntegrationView />;
      case 'api-keys':
        return <ApiKeysView />;
      case 'api-docs':
        return <ApiDocsView />;
      case 'audit-logs':
        return <AuditLogView />;
      case 'organization':
        return <OrganizationView />;
      case 'team':
      case 'users':
        return <TeamView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Offline notification & Queue status */}
        <OfflineIndicator />

        <Navbar />

        <main className="flex-1 overflow-y-auto p-3 pb-24 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
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

export default function App() {
  return (
    <ThemeProvider>
      <PWAProvider>
        <AppProvider>
          <MainLayout />
        </AppProvider>
      </PWAProvider>
    </ThemeProvider>
  );
}
