import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, getUserRole } from '../lib/api';

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const token = getToken();
  const role = getUserRole();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={`/${role?.toLowerCase() || 'login'}`} replace />;
  }

  return children;
}