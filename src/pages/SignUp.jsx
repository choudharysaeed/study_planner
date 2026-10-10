import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthDebugPanel from '../components/AuthDebugPanel';

export default function SignUp() {
  const { signUp, signInWithGoogle, resendVerification, isConfigured } = useAuth();

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Feedback state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [supabaseError, setSupabaseError] = useState('');
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // 60-second countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Field-level validators
  const validateField = (field, value, allValues = {}) => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email address is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        const targetPass = allValues.password !== undefined ? allValues.password : password;
        if (value !== targetPass) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, { fullName, email, password, confirmPassword }[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field, value) => {
    if (field === 'fullName') setFullName(value);
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'confirmPassword') setConfirmPassword(value);

    // Dynamic error clearing if touched
    if (touched[field]) {
      const allVals = { fullName, email, password, confirmPassword, [field]: value };
      const err = validateField(field, value, allVals);
      setErrors(prev => ({ ...prev, [field]: err }));

      if (field === 'password' && touched.confirmPassword) {
        const confirmErr = validateField('confirmPassword', confirmPassword, allVals);
        setErrors(prev => ({ ...prev, confirmPassword: confirmErr }));
      }
    }
  };

  // Password Strength Calculation
  const hasMinLength = password.length >= 8;
  const hasNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(password);
  const isEduEmail = email.toLowerCase().endsWith('.edu');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSupabaseError('');

    // Guard against multiple concurrent submissions / double-clicks
    if (submitting) return;

    // Mark all as touched
    const allTouched = { fullName: true, email: true, password: true, confirmPassword: true };
    setTouched(allTouched);

    const nameErr = validateField('fullName', fullName);
    const emailErr = validateField('email', email);
    const passErr = validateField('password', password);
    const confirmErr = validateField('confirmPassword', confirmPassword, { password });

    const newErrors = {
      fullName: nameErr,
      email: emailErr,
      password: passErr,
      confirmPassword: confirmErr,
    };

    setErrors(newErrors);

    if (nameErr || emailErr || passErr || confirmErr) {
      return;
    }

    setSubmitting(true);
    try {
      const data = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      // Check if user already exists (Supabase returns empty identities array for existing users when email confirmation is on)
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setSupabaseError('An account with this email address is already registered. Please sign in with your password.');
        return;
      }

      // If user session exists immediately, do NOT call navigate('/dashboard') manually.
      // The onAuthStateChange event triggers, and PublicRoute handles the redirect to /dashboard cleanly.
      if (data?.session) {
        return;
      }

      // If no session returned, email confirmation is required by Supabase
      setEmailVerificationSent(true);
      setResendCooldown(60);
    } catch (err) {
      console.error('[auth] Sign up error:', err);
      const rawMsg = err.message || '';
      const isRateLimit =
        rawMsg.toLowerCase().includes('rate limit') ||
        rawMsg.toLowerCase().includes('rate_limit') ||
        err.status === 429;

      if (isRateLimit) {
        // Show friendly user message per specification
        setSupabaseError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setSupabaseError(rawMsg || 'Failed to create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setSupabaseError('');
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
        setSupabaseError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setSupabaseError(err.message || 'Failed to sign in with Google');
      }
      setGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || resendCooldown > 0 || resendingEmail) return;
    setResendingEmail(true);
    try {
      await resendVerification(email.trim());
      setResendCooldown(60);
    } catch (err) {
      console.error('[auth] Resend error:', err);
      const isRateLimit =
        err.message?.toLowerCase().includes('rate limit') ||
        err.message?.toLowerCase().includes('rate_limit') ||
        err.status === 429;
      if (isRateLimit) {
        setSupabaseError('Too many attempts. Please wait a few minutes and try again.');
        setResendCooldown(60);
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
        {/* Subtle decorative background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4F46E5]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#14B8A6]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center shadow-lg shadow-[#4F46E5]/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight">StudyPlanner</span>
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-[#C7C4D8] uppercase">
                Student Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/30 text-[#6DF5E1] text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
            Autumn Quarter Exam Sprint
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Master your academic flow with intention.
          </h1>

          <p className="text-[#DAE2FD] text-lg leading-relaxed mb-8">
            Organize courses, automate study intervals, and turn stress into structured daily momentum alongside 40,000+ top students.
          </p>

          {/* Social Proof */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-2">
              <div className="w-9 h-9 rounded-full bg-[#3525CD] border-2 border-[#1E1B4B] flex items-center justify-center text-xs font-semibold">JD</div>
              <div className="w-9 h-9 rounded-full bg-[#006B5F] border-2 border-[#1E1B4B] flex items-center justify-center text-xs font-semibold">SK</div>
              <div className="w-9 h-9 rounded-full bg-[#4F46E5] border-2 border-[#1E1B4B] flex items-center justify-center text-xs font-semibold">AL</div>
              <div className="w-9 h-9 rounded-full bg-[#14B8A6] text-[#0F172A] border-2 border-[#1E1B4B] flex items-center justify-center text-[10px] font-bold">+40k</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-300 text-sm font-semibold">
                <span>4.9 / 5.0</span>
                <span>★</span>
              </div>
              <p className="text-xs text-[#C7C4D8]">Endorsed across 180+ universities</p>
            </div>
          </div>
        </div>

        {/* Bottom Testimonial / Active Deep Work HUD */}
        <div className="relative z-10 p-5 rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-3 text-xs text-[#6DF5E1]">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#14B8A6]" /> Active Deep Work HUD
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#14B8A6]/20 text-[#6DF5E1] text-[11px] font-semibold">
              🔥 4-day streak
            </span>
          </div>
          <p className="text-sm italic text-white/90 leading-relaxed mb-2">
            &ldquo;PHYS 150 Electromagnetism prep finished 2 days early. The visual interval pacing makes studying feel lightweight.&rdquo;
          </p>
          <div className="flex items-center justify-between text-xs text-[#C7C4D8]">
            <span>Alex Morgan • Stanford &apos;26</span>
            <span className="font-mono text-[#6DF5E1]">Target: 8 Pomodoros / day</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form */}
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
          {/* Tab Switcher for easy navigation */}
          <div className="flex p-1 bg-[#EAEDFF] rounded-xl mb-8">
            <button
              type="button"
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-white text-[#3525CD] shadow-sm transition-all"
            >
              Create Account
            </button>
            <Link
              to="/signin"
              className="flex-1 py-2 text-sm font-medium text-[#464555] hover:text-[#131B2E] text-center transition-all"
            >
              Sign In
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#131B2E]">
              Create your account
            </h2>
            <p className="text-[#464555] text-sm mt-1.5">
              Join students hitting their midterm milestones with focused structure.
            </p>
          </div>

          {/* Missing Env Configuration Warning */}
          {!isConfigured && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
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

          {/* Supabase Error Alert */}
          {supabaseError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">{supabaseError}</p>
                  {supabaseError.toLowerCase().includes('already registered') && (
                    <div className="mt-2">
                      <Link to="/signin" className="text-xs font-semibold text-red-700 hover:underline inline-flex items-center gap-1">
                        Already registered? Click here to Sign In with your password →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Verification Sent Success View */}
          {emailVerificationSent ? (
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm text-center animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#131B2E]">Check your email to verify</h3>
              <p className="text-sm text-[#464555] mt-2 mb-4 leading-relaxed">
                Supabase sent a confirmation link to <span className="font-semibold text-[#131B2E]">{email}</span>. Click the link in your email to activate your account and access the dashboard.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingEmail || resendCooldown > 0}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#131B2E] text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {resendingEmail ? (
                    'Resending verification...'
                  ) : resendCooldown > 0 ? (
                    `Resend verification in ${resendCooldown}s`
                  ) : (
                    'Resend verification email'
                  )}
                </button>

                <Link
                  to="/signin"
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors"
                >
                  Go to Sign In
                </Link>

                <button
                  type="button"
                  onClick={() => setEmailVerificationSent(false)}
                  className="w-full text-xs text-[#464555] hover:text-[#131B2E] underline"
                >
                  Need to change email or edit details? Back to form
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-[#131B2E] mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777587]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      placeholder="Alex Morgan"
                      className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:ring-2 ${
                        touched.fullName && errors.fullName
                          ? 'border-red-500 focus:ring-red-400/30'
                          : touched.fullName && !errors.fullName
                          ? 'border-emerald-500 focus:ring-emerald-400/20'
                          : 'border-[#CBD5E1] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20'
                      }`}
                    />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="email" className="block text-xs font-semibold text-[#131B2E] uppercase tracking-wider">
                      Student or Personal Email
                    </label>
                    {isEduEmail && (
                      <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" /> .edu perk applied
                      </span>
                    )}
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
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="alex.morgan@university.edu"
                      className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:ring-2 ${
                        touched.email && errors.email
                          ? 'border-red-500 focus:ring-red-400/30'
                          : touched.email && !errors.email
                          ? 'border-emerald-500 focus:ring-emerald-400/20'
                          : 'border-[#CBD5E1] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20'
                      }`}
                    />
                    {touched.email && !errors.email && (
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-500 pointer-events-none">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  {touched.email && errors.email && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-[#131B2E] uppercase tracking-wider">
                      Password
                    </label>
                    <span className="text-xs text-[#777587]">
                      {password.length >= 8 ? (hasNumberOrSymbol ? 'Strong' : 'Good') : 'Min 8 chars'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777587]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:ring-2 ${
                        touched.password && errors.password
                          ? 'border-red-500 focus:ring-red-400/30'
                          : touched.password && !errors.password
                          ? 'border-emerald-500 focus:ring-emerald-400/20'
                          : 'border-[#CBD5E1] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#777587] hover:text-[#131B2E] transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.password}
                    </p>
                  )}

                  {/* Password helper indicators */}
                  <div className="mt-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-[#464555]">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        ✓
                      </span>
                      <span className={hasMinLength ? 'text-emerald-700 font-medium' : ''}>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#464555]">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasNumberOrSymbol ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        ✓
                      </span>
                      <span className={hasNumberOrSymbol ? 'text-emerald-700 font-medium' : ''}>Includes numbers or symbols</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#131B2E] mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777587]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="••••••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-sm text-[#131B2E] placeholder-[#777587] transition-all focus:outline-none focus:ring-2 ${
                        touched.confirmPassword && errors.confirmPassword
                          ? 'border-red-500 focus:ring-red-400/30'
                          : touched.confirmPassword && !errors.confirmPassword
                          ? 'border-emerald-500 focus:ring-emerald-400/20'
                          : 'border-[#CBD5E1] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#777587] hover:text-[#131B2E] transition-colors cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
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

              {/* Already have an account */}
              <p className="text-center text-xs text-[#464555] mt-6">
                Already have an account?{' '}
                <Link to="/signin" className="font-semibold text-[#4F46E5] hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}

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
