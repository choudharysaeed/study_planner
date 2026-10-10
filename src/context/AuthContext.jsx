import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured, configError } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(configError || null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // 1. Subscribe to onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log(`[auth] onAuthStateChange event: ${event}`, {
          hasSession: Boolean(currentSession),
          userEmail: currentSession?.user?.email || null,
        });

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        } else if (event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
          setSession(null);
          setUser(null);
        }
      }
    );

    // 2. Fetch initial session via getSession()
    // loading = false is ONLY set after this initial getSession finishes
    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        console.log('[auth] initial getSession result:', {
          hasSession: Boolean(initialSession),
          userEmail: initialSession?.user?.email || null,
          error: error?.message || null,
        });

        if (!mounted) return;

        if (error) {
          console.error('[auth] Error fetching initial session:', error.message);
          setAuthError(error.message);
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      })
      .catch((err) => {
        console.error('[auth] Unexpected error in getSession:', err);
        if (mounted) {
          setAuthError(err.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Sign Up with Email, Password and full_name metadata
   */
  const signUp = async ({ email, password, fullName }) => {
    if (!isSupabaseConfigured) {
      throw new Error(configError || 'Supabase is not configured.');
    }

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) throw error;
    return data;
  };

  /**
   * Sign In with Email & Password
   */
  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      throw new Error(configError || 'Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  /**
   * Sign In with Google OAuth
   */
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error(configError || 'Supabase is not configured.');
    }

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return data;
  };

  /**
   * Sign Out
   */
  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
    setIsPasswordRecovery(false);
  };

  /**
   * Request Password Reset for Email
   */
  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error(configError || 'Supabase is not configured.');
    }

    const redirectUrl = `${window.location.origin}/reset-password`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) throw error;
    return data;
  };

  /**
   * Update Password (used after password recovery link clicked)
   */
  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured) {
      throw new Error(configError || 'Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    setIsPasswordRecovery(false);
    return data;
  };

  /**
   * Resend signup verification email
   */
  const resendVerification = async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error(configError || 'Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      authError,
      isConfigured: isSupabaseConfigured,
      configError,
      isPasswordRecovery,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
      resendVerification,
    }),
    [user, session, loading, authError, isPasswordRecovery]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
