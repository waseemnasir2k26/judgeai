import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Auth Pages
import {
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  PendingApprovalPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/auth';

// Main Pages
import { DashboardPage } from './pages/DashboardPage';

// Analysis Pages
import {
  NewAnalysisPage,
  AnalysisListPage,
  AnalysisDetailPage,
} from './pages/analysis';

// Admin Pages
import {
  AdminDashboard,
  UsersPage,
  AIConfigPage,
} from './pages/admin';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { FeedbackPage } from './pages/admin/FeedbackPage';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/pending-approval" element={<PendingApprovalPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>

              {/* Main App Routes */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analysis/new" element={<NewAnalysisPage />} />
                <Route path="/analysis" element={<AnalysisListPage />} />
                <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="ai-config" element={<AIConfigPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
