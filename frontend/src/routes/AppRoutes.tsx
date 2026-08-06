import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProvidersPage } from '../pages/ProvidersPage';
import { ModelsPage } from '../pages/ModelsPage';
import { ApiKeysPage } from '../pages/ApiKeysPage';
import { UsagePage } from '../pages/UsagePage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { BillingPage } from '../pages/BillingPage';
import { PromptTemplatesPage } from '../pages/PromptTemplatesPage';
import { PlaygroundPage } from '../pages/PlaygroundPage';
import { UsersPage } from '../pages/UsersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LogsPage } from '../pages/LogsPage';
import { RequestDetailsPage } from '../pages/RequestDetailsPage';
import { EndpointDocsPage } from '../pages/EndpointDocsPage';
import { CostCalculatorPage } from '../pages/CostCalculatorPage';
import { ModelPricingPage } from '../pages/ModelPricingPage';
import { useAuthStore } from '../store/authStore';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="models/pricing" element={<ModelPricingPage />} />
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="prompts" element={<PromptTemplatesPage />} />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="request-details" element={<RequestDetailsPage />} />
        <Route path="endpoint-docs" element={<EndpointDocsPage />} />
        <Route path="tools/cost-calculator" element={<CostCalculatorPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
