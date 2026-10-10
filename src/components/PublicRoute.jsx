import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullPageLoader from './FullPageLoader';

export default function PublicRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <FullPageLoader message="Checking existing session..." />;
  }

  if (session) {
    // If user is already authenticated, redirect away to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
