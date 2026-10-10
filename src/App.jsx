import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import MissingEnvPage from './components/MissingEnvPage';
import Layout from './components/Layout';
import { isSupabaseConfigured } from './lib/supabaseClient';

// Pages
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Tasks from './pages/Tasks';
import Timer from './pages/Timer';
import Progress from './pages/Progress';
import Placeholder from './pages/Placeholder';

export default function App() {
  // If either VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing, show visible error page
  if (!isSupabaseConfigured) {
    return <MissingEnvPage />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col font-['Inter',sans-serif]">
          <Routes>
            {/* PUBLIC ONLY ROUTES (Redirects logged-in users to /dashboard) */}
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              }
            />
            <Route
              path="/signin"
              element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />

            {/* PASSWORD RESET RECOVERY (Accessible directly from email recovery links) */}
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* AUTH CALLBACK (Handles Google OAuth and email confirmation redirects) */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* PROTECTED ROUTES (Requires valid Supabase session and renders inside Layout) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/timer" element={<Timer />} />
              <Route path="/progress" element={<Progress />} />
            </Route>

            {/* ROOT ROUTE -> Redirect to /dashboard (which routes to /signin if unauthenticated) */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* CATCH-ALL ROUTE -> Redirect to /signin */}
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
