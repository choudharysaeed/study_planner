import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthDebugPanel from '../components/AuthDebugPanel';

export default function SignIn() {
  const { signIn, signInWithGoogle, resendVerification, isConfigured } = useAuth();

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Feedback state
  const [errorMsg, setErrorMsg] = useState('');
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // 60-second cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsEmailUnconfirmed(false);
    setResendSuccess(false);

    if (loading) return;

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    try {
      await signIn({
        email: email.trim(),
        password,
      });
      // NOTE: Do NOT call navigate('/dashboard') manually.
      // Let the onAuthStateChange event update AuthContext, and PublicRoute will
      // redirect to /dashboard cleanly, preventing navigation loops.
    } catch (err) {
      console.error('[auth] Sign in error:', err);
      const rawMsg = err.message || '';
      const isRateLimit =
        rawMsg.toLowerCase().includes('rate limit') ||
        rawMsg.toLowerCase().includes('rate_limit') ||
        err.status === 429;

      if (isRateLimit) {
        setErrorMsg('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setErrorMsg(rawMsg || 'Invalid login credentials.');
      }

      // Detect unconfirmed email condition
      if (
        rawMsg.toLowerCase().includes('email not confirmed') ||
        rawMsg.toLowerCase().includes('email_not_confirmed') ||
        rawMsg.toLowerCase().includes('confirm your email')
      ) {
        setIsEmailUnconfirmed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      // Google redirects via browser OAuth flow to /auth/callback
    } catch (err) {
      console.error('[auth] Google Sign In error:', err);
      const isRateLimit =
        err.message?.toLowerCase().includes('rate limit') ||
        err.message?.toLowerCase().includes('rate_limit') ||
        err.status === 429;
      if (isRateLimit) {
        setErrorMsg('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setErrorMsg(err.message || 'Failed to authenticate with Google.');
      }
      setGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address to resend verification.');
      return;
    }
    if (resendCooldown > 0 || resendingEmail) return;

    setResendingEmail(true);
    try {
      await resendVerification(email.trim());
      setResendSuccess(true);
      setResendCooldown(60);
    } catch (err) {
      console.error('[auth] Resend verification error:', err);
      const isRateLimit =
        err.message?.toLowerCase().includes('rate limit') ||
        err.message?.toLowerCase().includes('rate_limit') ||
        err.status === 429;

      if (isRateLimit) {
        setErrorMsg('Too many attempts. Please wait a few minutes and try again.');
        setResendCooldown(60);
      } else {
        setErrorMsg(err.message || 'Failed to resend verification email.');
      }
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#131B2E] flex flex-col lg:flex-row">
      {/* Dev-only debug panel */}
      <AuthDebugPanel />

      {/* LEFT PANEL - Academic Sanctuary Showcase (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E1B4B] via-[#1E255E] to-[#0F172A] p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Ambient decorative glow circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4F46E5]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#14B8A6]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center shadow-lg shadow-[#4F46E5]/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight">StudyPlanner</span>
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#C7C4D8] uppercase">
              Academic Sanctuary
            </span>
          </div>
        </div>

        {/* Center Hero */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Welcome back to your study sanctuary.
          </h1>
          <p className="text-[#DAE2FD] text-lg leading-relaxed mb-8">
            Pick up your Pomodoro streaks and course deadlines right where you left off.
          </p>

          {/* Active Session Card Preview */}
          <div className="p-5 rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-xl">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="flex items-center gap-2 text-white font-medium">
                <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-ping" />
                Active Session
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-1 text-[11px]">
                <Flame className="w-3.5 h-3.5 fill-amber-300" /> 4-day streak
              </span>
            </div>

            <div className="mb-3">
              <h4 className="text-base font-bold text-white tracking-tight">
                CS 201: Binary Trees & Heaps
              </h4>
              <p className="text-xs text-[#C7C4D8] mt-0.5">
                Stanford Autumn Quarter • Midterm Sprint
              </p>
            </div>

            {/* Target Progress Bar */}
            <div>
              <div className="flex justify-between text-xs text-[#DAE2FD] mb-1.5 font-mono">
                <span>Interval 6 of 8 blocks</span>
                <span className="text-[#6DF5E1] font-semibold">75% Target</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#14B8A6] to-[#6DF5E1] rounded-full w-3/4 transition-all duration-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Student Testimonial */}
        <div className="relative z-10 flex items-center gap-3.5 pt-4 text-xs text-white/80">
          <div className="w-9 h-9 rounded-full bg-[#3525CD] border border-white/20 flex items-center justify-center font-bold text-white text-xs shrink-0">
            ML
          </div>
          <div>
            <p className="italic text-[#DAE2FD]">
              &ldquo;The focus timer and urgent deadline ranking kept my 3.9 GPA through midterms.&rdquo;
            </p>
            <p className="text-[#C7C4D8] font-medium mt-0.5">
              Maya Lin • Bioengineering Sophomore
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Sign In Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        {/* Mobile Header */}
        <div className="flex items-center justify-between lg:hidden mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-[#131B2E]">StudyPlanner</span>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EAEDFF] text-[#3525CD]">
            Academic Flow
          </span>
        </div>

        <div className="max-w-md w-full mx-auto">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-[#EAEDFF] rounded-xl mb-8">
            <Link
              to="/signup"
              className="flex-1 py-2 text-sm font-medium text-[#464555] hover:text-[#131B2E] text-center transition-all"
            >
              Create Account
            </Link>
            <button
              type="button"
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-white text-[#3525CD] shadow-sm transition-all"
            >
              Sign In
            </button>
          </div>

          <div className="mb-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAEDFF] text-[#3525CD] text-[11px] font-semibold mb-3">
              <Lock className="w-3 h-3" /> Encrypted Student Session
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#131B2E]">
              Sign in to Study Planner
            </h2>
            <p className="text-[#464555] text-sm mt-1.5">
              Welcome back! Please enter your university or personal credentials.
            </p>
          </div>

          {/* Missing Env Configuration Warning */}
          {!isConfigured && (
            <div className="mt-4 mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Supabase Credentials Needed</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Please provide <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> in your <code className="font-mono">.env</code> file.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mt-4 mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">{errorMsg}</p>

                  {/* Unconfirmed Email Action with 60-Second Cooldown */}
                  {isEmailUnconfirmed && (
                    <div className="mt-2.5 pt-2 border-t border-red-200 space-y-2">
                      <p className="text-xs text-red-700">
                        Your account requires email verification before signing in.
                      </p>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendingEmail || resendCooldown > 0}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {resendingEmail ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resending...
                          </>
                        ) : resendCooldown > 0 ? (
                          `Resend in ${resendCooldown}s`
                        ) : (
                          'Resend verification email'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resend Verification Success Feedback */}
          {resendSuccess && (
            <div className="mt-4 mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-emerald-800">
                A fresh verification link has been sent to your email. Check your inbox and spam folder.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#131B2E] mb-1.5 uppercase tracking-wider">
                Email address
              </label>
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
              <p className="text-[11px] text-[#777587] mt-1">
                Connected with University Single-Sign-On auto-detect.
              </p>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-[#131B2E] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-[#4F46E5] hover:text-[#3525CD] font-medium flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Show
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777587]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#4F46E5] focus:ring-[#4F46E5]"
                />
                <span className="text-xs text-[#464555] font-medium">Remember for 30 days</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-[#4F46E5] hover:text-[#3525CD] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* OR Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#FAF8FF] px-3 text-[#777587] font-medium">Or</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#131B2E] shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#4F46E5]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* New here? Create an account */}
          <p className="text-center text-xs text-[#464555] mt-6">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-[#4F46E5] hover:underline">
              Create an account
            </Link>
          </p>

          {/* Academic Trust Badges */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-center gap-6 text-[11px] text-[#777587]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#14B8A6]" /> FERPA Compliant
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" /> LMS Auto-Sync
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#777587]" /> 256-bit TLS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
