import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  KeyRound,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, isPasswordRecovery } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkRecoveryAccess = async () => {
      // 1. If already flagged by AuthContext PASSWORD_RECOVERY event
      if (isPasswordRecovery) {
        if (isMounted) {
          setHasValidSession(true);
          setCheckingSession(false);
        }
        return;
      }

      // 2. Check current session or URL hash containing recovery tokens
      const hash = window.location.hash;
      const search = window.location.search;
      const isRecoveryInUrl = 
        hash.includes('type=recovery') || 
        hash.includes('access_token=') || 
        search.includes('code=');

      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session || isRecoveryInUrl) {
            if (isMounted) {
              setHasValidSession(true);
              setCheckingSession(false);
            }
            return;
          }
        } catch (e) {
          console.error('Session verification error:', e);
        }
      }

      // Small delay to allow Supabase listener to finish parsing tokens
      const timer = setTimeout(async () => {
        if (!isMounted) return;
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setHasValidSession(true);
          } else {
            setHasValidSession(false);
          }
        } else {
          // If not configured, allow testing UI
          setHasValidSession(false);
        }
        setCheckingSession(false);
      }, 1000);

      return () => clearTimeout(timer);
    };

    checkRecoveryAccess();

    return () => {
      isMounted = false;
    };
  }, [isPasswordRecovery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error updating password:', err);
      setErrorMsg(err.message || 'Failed to update password. Link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#131B2E] flex flex-col justify-center items-center py-12 px-4 sm:px-6 relative">
      {/* Background Soft Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-[#4F46E5]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-2 mb-8 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center text-white shadow-lg shadow-[#4F46E5]/25">
          <BookOpen className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight text-[#131B2E]">StudyPlanner</span>
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EAEDFF] text-[#3525CD] uppercase">
            Security
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl shadow-slate-900/5 p-8 sm:p-10">
          {checkingSession ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-[#131B2E]">Verifying recovery session...</p>
              <p className="text-xs text-[#777587] mt-1">Checking secure cryptographic tokens</p>
            </div>
          ) : !hasValidSession ? (
            /* Expired / Invalid Link Warning */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-[#131B2E] tracking-tight mb-2">
                This reset link is invalid or has expired
              </h2>
              <p className="text-sm text-[#464555] leading-relaxed mb-6">
                Password recovery links can only be used once and expire quickly to protect student account security.
              </p>
              <Link
                to="/forgot-password"
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all"
              >
                Request a new reset link
              </Link>
              <div className="mt-4">
                <Link to="/signin" className="text-xs text-[#777587] hover:text-[#131B2E] underline">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : success ? (
            /* Success Feedback */
            <div className="text-center py-6 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[#131B2E] mb-2">Password updated!</h2>
              <p className="text-sm text-[#464555] mb-6">
                Your password has been successfully updated. Redirecting you to your Study Planner dashboard...
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] text-white font-semibold text-sm hover:bg-[#4338CA] transition-colors"
              >
                <span>Go to Dashboard now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Form View */
            <>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#131B2E]">
                  Create new password
                </h1>
                <div className="w-9 h-9 rounded-full bg-[#EAEDFF] text-[#3525CD] flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>
              <p className="text-sm text-[#464555] mb-6">
                Please enter a secure password with at least 8 characters.
              </p>

              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="font-medium text-red-800">{errorMsg}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-xs font-semibold text-[#131B2E] mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777587]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#777587] hover:text-[#131B2E]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confirmNewPassword" className="block text-xs font-semibold text-[#131B2E] mb-1.5 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777587]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#777587] hover:text-[#131B2E]"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
