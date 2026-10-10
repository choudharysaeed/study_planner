import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Mail, 
  RotateCcw, 
  ArrowLeft, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthDebugPanel from '../components/AuthDebugPanel';

export default function ForgotPassword() {
  const { resetPassword, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);

  // 60-second cooldown timer
  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (submitting || resetCooldown > 0) return;

    if (!email.trim()) {
      setErrorMessage('Please enter a valid university or personal email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address format.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSuccessMessage('If an account exists, a reset link has been sent.');
      setResetCooldown(60);
    } catch (err) {
      console.error('[auth] Password reset error:', err);
      const rawMsg = err.message || '';
      const isRateLimit =
        rawMsg.toLowerCase().includes('rate limit') ||
        rawMsg.toLowerCase().includes('rate_limit') ||
        err.status === 429;

      if (isRateLimit) {
        setErrorMessage('Too many attempts. Please wait a few minutes and try again.');
        setResetCooldown(60);
      } else {
        setErrorMessage(rawMsg || 'Failed to send password reset email.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#131B2E] flex flex-col justify-between items-center py-12 px-4 sm:px-6 relative">
      {/* Dev-only debug panel */}
      <AuthDebugPanel />

      {/* Background Soft Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-[#4F46E5]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-2 mb-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center text-white shadow-lg shadow-[#4F46E5]/25">
          <BookOpen className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-xl tracking-tight text-[#131B2E]">StudyPlanner</span>
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EAEDFF] text-[#3525CD] uppercase">
            Account
          </span>
        </div>
      </div>

      {/* Center Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl shadow-slate-900/5 p-8 sm:p-10">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#131B2E]">
              Reset your password
            </h1>
            <div className="w-9 h-9 rounded-full bg-[#EAEDFF] text-[#3525CD] flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>

          <p className="text-sm text-[#464555] leading-relaxed mb-6">
            No worries! Enter the email associated with your Study Planner account and we&apos;ll send you a secure recovery link.
          </p>

          {/* Missing Config Notification */}
          {!isConfigured && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Supabase environment variables not detected. Please configure <code className="font-mono bg-amber-100 px-1">.env</code>.</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="font-medium text-red-800">{errorMessage}</p>
            </div>
          )}

          {/* Success State */}
          {successMessage ? (
            <div className="p-6 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-950">Reset link sent!</h3>
              <p className="text-xs text-emerald-800 mt-1 mb-4 leading-relaxed">
                {successMessage} Check your inbox and click the button to set your new password.
              </p>
              {resetCooldown > 0 && (
                <p className="text-[11px] text-emerald-700 mb-4">
                  Resend available in {resetCooldown}s
                </p>
              )}
              <Link
                to="/signin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#3525CD] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold text-[#131B2E] uppercase tracking-wider">
                    Email address
                  </label>
                  <span className="text-[11px] font-medium text-[#777587]">
                    Input required
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777587]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.morgan@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                </div>
              </div>

              {/* Informational Callout */}
              <div className="p-3 rounded-xl bg-[#F2F3FF] border border-[#E2E7FF] flex items-center gap-2.5 text-xs text-[#3525CD]">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#14B8A6]" />
                <span className="text-[#464555]">
                  Links expire after 15 minutes to preserve focus and student privacy.
                </span>
              </div>

              {/* Action Button with 60s cooldown */}
              <button
                type="submit"
                disabled={submitting || resetCooldown > 0}
                className="w-full py-3 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending reset link...</span>
                  </>
                ) : resetCooldown > 0 ? (
                  <span>Send reset link ({resetCooldown}s)</span>
                ) : (
                  <>
                    <span>Send reset link</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Sign In Link */}
          <div className="text-center mt-6 pt-6 border-t border-[#E2E8F0]">
            <Link
              to="/signin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#464555] hover:text-[#131B2E] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Academic Sprint Indicator */}
      <div className="mt-8 relative z-10">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#EAEDFF] border border-[#DAE2FD] text-xs text-[#131B2E] shadow-sm">
          <div className="w-6 h-6 rounded-full bg-[#14B8A6]/20 text-[#006B5F] flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#006B5F]" />
          </div>
          <div>
            <span className="font-semibold text-[#131B2E]">Fall Semester Sprint</span>
            <span className="text-[#464555] hidden sm:inline ml-2">
              Exam period active • Next study block in 42m
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sync Ready
          </span>
        </div>
      </div>
    </div>
  );
}
