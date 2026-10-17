import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import themeConfig from './theme.js';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Login from './pages/Login.jsx';
import PipelinePage from './pages/PipelinePage.jsx';
import ActiveJobsPage from './pages/ActiveJobsPage.jsx';
import CompletedJobsPage from './pages/CompletedJobsPage.jsx';
import JobDetail from './pages/JobDetail.jsx';
import Catalog from './pages/Catalog.jsx';
import Customers from './pages/Customers.jsx';
import Settings from './pages/Admin/Settings.jsx';
import Portal from './pages/Portal.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';

function App() {
  return (
    <ConfigProvider theme={themeConfig}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/portal/:token" element={<Portal />} />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Navigate to="/jobs/pipeline" replace />} />
            <Route path="/jobs/pipeline" element={<PipelinePage />} />
            <Route path="/jobs/active" element={<ActiveJobsPage />} />
            <Route path="/jobs/completed" element={<CompletedJobsPage />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/jobs/pipeline" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
