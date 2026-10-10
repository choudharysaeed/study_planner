import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { BookOpen, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  const [statusText, setStatusText] = useState('Completing secure authentication...');

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      // 1. Check for error parameters in query string or hash
      const params = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.substring(1));

      const error = params.get('error') || hashParams.get('error');
      const errorDescription =
        params.get('error_description') ||
        hashParams.get('error_description') ||
        params.get('message');

      if (error || errorDescription) {
        if (mounted) {
          setErrorMsg(
            errorDescription ||
              (error ? `Authentication error: ${error.replace(/_/g, ' ')}` : 'Authentication failed.')
          );
        }
        return;
      }

      if (!isSupabaseConfigured) {
        if (mounted) {
          setErrorMsg('Supabase is not configured yet. Please configure your .env file.');
        }
        return;
      }

      // 2. PKCE code exchange if present in query parameters
      const code = params.get('code');
      if (code) {
        setStatusText('Exchanging authorization code for session...');
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            if (mounted) setErrorMsg(exchangeError.message);
            return;
          }
        } catch (err) {
          console.error('Exchange error:', err);
        }
      }

      // 3. Verify session
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (mounted) setErrorMsg(sessionError.message);
          return;
        }

        if (session) {
          if (mounted) {
            setStatusText('Session verified! Redirecting to dashboard...');
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 600);
          }
          return;
        }

        // Wait a brief moment for onAuthStateChange in case hash parsing is in progress
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!mounted) return;
          if (newSession) {
            subscription.unsubscribe();
            setStatusText('Welcome! Redirecting to dashboard...');
            navigate('/dashboard', { replace: true });
          }
        });

        // Timeout fallback if no session is captured
        setTimeout(() => {
          if (mounted && !errorMsg) {
            subscription.unsubscribe();
            // Check once more
            supabase.auth.getSession().then(({ data: { session: finalSession } }) => {
              if (finalSession) {
                navigate('/dashboard', { replace: true });
              } else {
                setErrorMsg('No active authentication session found. Please sign in again.');
              }
            });
          }
        }, 3500);

      } catch (err) {
        console.error('Auth verification error:', err);
        if (mounted) setErrorMsg(err.message || 'Authentication failed.');
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-6 text-[#131B2E]">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-8 text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center text-white shadow-lg shadow-[#4F46E5]/25">
          <BookOpen className="w-7 h-7" />
        </div>

        {errorMsg ? (
          <div className="animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#131B2E] mb-2">Authentication Failed</h2>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 mb-6 break-words">
              {errorMsg}
            </p>
            <Link
              to="/signin"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="py-4">
            <div className="relative w-10 h-10 mx-auto mb-4">
              <Loader2 className="w-10 h-10 text-[#4F46E5] animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-[#131B2E] tracking-tight">
              Verifying credentials
            </h2>
            <p className="text-sm text-[#464555] mt-1.5">{statusText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
