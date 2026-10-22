/* Main App Component */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ToastContainer } from '@/components/ui/Toast';
import { LoginPage, DashboardPage, AnalyzePage, AnalyzeDetailPage, DocumentsPage, DocumentDetailPage, CritiquesPage, CritiqueDetailPage } from '@/pages';
import { useAuth } from '@/hooks/useAuth';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App = () => {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <AnalyzePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze/:id"
            element={
              <ProtectedRoute>
                <AnalyzeDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <ProtectedRoute>
                <DocumentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/critiques"
            element={
              <ProtectedRoute>
                <CritiquesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/critiques/:id"
            element={
              <ProtectedRoute>
                <CritiqueDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};