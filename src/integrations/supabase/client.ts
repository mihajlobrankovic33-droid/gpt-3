import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Check if credentials are valid before initializing
export const isConfigValid = () => 
  !!(SUPABASE_URL && 
  SUPABASE_URL.startsWith('http') && 
  SUPABASE_PUBLISHABLE_KEY);

const configValid = isConfigValid();

if (!configValid && typeof window !== 'undefined') {
  console.warn(
    "Supabase configuration is missing or invalid. " +
    "Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment variables."
  );
}

export const supabase = configValid
  ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : new Proxy({} as Record<string, any>, {
      get(_, prop) {
        if (prop === 'auth') {
          return {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getSession: () => Promise.resolve({ data: { session: null } }),
            signInWithOAuth: () => Promise.reject(new Error("Supabase is not configured")),
            signInWithPassword: () => Promise.reject(new Error("Supabase is not configured")),
            signUp: () => Promise.reject(new Error("Supabase is not configured")),
            signOut: () => Promise.resolve(),
          };
        }
        if (prop === 'from') {
          return () => ({
            select: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null })
                })
              })
            }),
            insert: () => Promise.reject(new Error("Supabase is not configured")),
            update: () => ({ eq: () => Promise.reject(new Error("Supabase is not configured")) }),
          });
        }
        if (prop === 'functions') {
          return {
            invoke: () => Promise.reject(new Error("Supabase is not configured")),
          };
        }
        return () => Promise.reject(new Error("Supabase is not configured"));
      }
    });
