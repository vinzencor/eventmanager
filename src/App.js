import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/responsive.css';

// Components
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import CreateEvent from './components/events/CreateEvent';
import EventPreview from './components/events/EventPreview';
import EventRegistration from './components/registration/EventRegistration';
import EditEvent from './components/events/EditEvent';
import QRScanner from './components/admin/QRScanner';
import Navbar from './components/layout/Navbar';
import InitialSetup from './components/setup/InitialSetup';



// Dashboard router based on user role
const DashboardRouter = () => {
  const { userRole, ROLES, currentUser } = useAuth();

  console.log('DashboardRouter - userRole:', userRole, 'currentUser:', currentUser?.email);

  // Show loading while determining role
  if (currentUser && !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (userRole === ROLES.SUPER_ADMIN) {
    return <SuperAdminDashboard />;
  } else if (userRole === ROLES.TEMP_ADMIN) {
    return <AdminDashboard />;
  } else {
    console.log('Redirecting to unauthorized - userRole:', userRole);
    return <Navigate to="/unauthorized" />;
  }
};

// Unauthorized page
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h2>
      <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
      <a href="/login" className="text-primary-600 hover:text-primary-800">
        Go to Login
      </a>
    </div>
  </div>
);

function App() {
  const [setupComplete, setSetupComplete] = useState(false);

  // Check if we need to show initial setup
  const showSetup = !setupComplete && window.location.pathname === '/setup';

  if (showSetup) {
    return <InitialSetup onSetupComplete={() => setSetupComplete(true)} />;
  }

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            {/* Setup Route */}
            <Route path="/setup" element={<InitialSetup onSetupComplete={() => setSetupComplete(true)} />} />

            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register/:qrCode" element={<EventRegistration />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'temp_admin']}>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['temp_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/events/create"
              element={
                <ProtectedRoute allowedRoles={['temp_admin']}>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/events/:eventId/preview"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'temp_admin']}>
                  <EventPreview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/events/:eventId"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'temp_admin']}>
                  <EventPreview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/events/:eventId/edit"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'temp_admin']}>
                  <EditEvent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/events/:eventId/scan"
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'temp_admin']}>
                  <QRScanner />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                  <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                  <a href="/dashboard" className="text-primary-600 hover:text-primary-800">
                    Go to Dashboard
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
