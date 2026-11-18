import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { UsersPage } from '@/pages/settings/UsersPage';
import { RolesPage } from '@/pages/settings/RolesPage';
import { OrganizationPage } from '@/pages/settings/OrganizationPage';
import { AuditLogsPage } from '@/pages/settings/AuditLogsPage';
import { CustomersPage } from '@/pages/crm/CustomersPage';
import { ProductsPage } from '@/pages/crm/ProductsPage';
import { WarrantyLookupPage } from '@/pages/crm/WarrantyLookupPage';
import { TicketsPage } from '@/pages/service-desk/TicketsPage';
import { TicketDetailPage } from '@/pages/service-desk/TicketDetailPage';
import { WorkOrdersPage } from '@/pages/field-service/WorkOrdersPage';
import { WorkOrderDetailPage } from '@/pages/field-service/WorkOrderDetailPage';
import { DispatchBoardPage } from '@/pages/dispatch/DispatchBoardPage';
import { ContractsPage } from '@/pages/contracts/ContractsPage';
import { RmaConsolePage } from '@/pages/rma/RmaConsolePage';
import { PartnersPage } from '@/pages/partners/PartnersPage';
import { PublicTrackingPage } from '@/pages/tracking/PublicTrackingPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';
import { LogisticsPage } from '@/pages/logistics/LogisticsPage';
import { FinancePage } from '@/pages/finance/FinancePage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-semibold font-poppins text-ink-soft">
          Connecting to ORBIT Platform...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <LoginPage onSuccess={() => {}} />
        }
      />

      {/* Public Customer Self-Service Tracking (No Login Required) */}
      <Route path="/track/:token" element={<PublicTrackingPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="operations/customers" element={<CustomersPage />} />
        <Route path="operations/products" element={<ProductsPage />} />
        <Route path="operations/warranty-check" element={<WarrantyLookupPage />} />
        <Route path="operations/tickets" element={<TicketsPage />} />
        <Route path="operations/tickets/:id" element={<TicketDetailPage />} />
        <Route path="operations/work-orders" element={<WorkOrdersPage />} />
        <Route path="operations/work-orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="operations/dispatch" element={<DispatchBoardPage />} />
        <Route path="operations/contracts" element={<ContractsPage />} />
        <Route path="management/inventory" element={<InventoryPage />} />
        <Route path="management/rma" element={<RmaConsolePage />} />
        <Route path="management/partners" element={<PartnersPage />} />
        <Route path="management/logistics" element={<LogisticsPage />} />
        <Route path="management/finance" element={<FinancePage />} />
        <Route path="management/analytics" element={<AnalyticsPage />} />
        <Route path="settings/users" element={<UsersPage />} />
        <Route path="settings/roles" element={<RolesPage />} />
        <Route path="settings/organization" element={<OrganizationPage />} />
        <Route path="settings/audit-logs" element={<AuditLogsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
