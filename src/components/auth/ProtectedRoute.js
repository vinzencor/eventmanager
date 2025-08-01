import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, allowedRoles = [] }) => {
  const { currentUser, userRole } = useAuth();

  console.log('ProtectedRoute - currentUser:', currentUser?.email, 'userRole:', userRole);

  if (!currentUser) {
    console.log('No current user, redirecting to login');
    return <Navigate to="/login" />;
  }

  // Show loading while role is being determined
  if (currentUser && !userRole) {
    console.log('User exists but role not loaded yet, showing loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if user has required role
  if (requiredRole && userRole !== requiredRole) {
    console.log('User role mismatch, required:', requiredRole, 'actual:', userRole);
    return <Navigate to="/unauthorized" />;
  }

  // Check if user has one of the allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    console.log('User role not in allowed roles:', allowedRoles, 'actual:', userRole);
    return <Navigate to="/unauthorized" />;
  }

  console.log('Access granted, rendering children');
  return children;
};

export default ProtectedRoute;
