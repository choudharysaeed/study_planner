import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullPageLoader from './FullPageLoader';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoader message="Authenticating session..." />;
  }

  if (!session) {
    // Redirect to /signin while preserving previous location in state
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
