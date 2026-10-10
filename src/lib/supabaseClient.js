import { createClient } from '@supabase/supabase-js';

// Read Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate whether configuration is present and not a placeholder
const isUrlConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseUrl.startsWith('https://');

const isKeyConfigured =
  Boolean(supabaseAnonKey) &&
  !supabaseAnonKey.includes('your-anon-key') &&
  supabaseAnonKey.length > 20;

export const isSupabaseConfigured = isUrlConfigured && isKeyConfigured;

export const configError = !isSupabaseConfigured
  ? 'Missing or incomplete Supabase environment variables. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  : null;

// Initialize Supabase Client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    })
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key-min-length-required-for-client-init-321',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
