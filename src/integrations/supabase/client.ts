import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

declare global {
  const __SUPABASE_URL__: string | undefined;
  const __SUPABASE_KEY__: string | undefined;
}

// We try several sources for the configuration to be as resilient as possible
const getSupabaseConfig = () => {
  // 1. Try Vite env variables (prefixed with VITE_)
  let url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  let key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '';

  // 2. Try global constants injected by Vite define
  if (!url && typeof __SUPABASE_URL__ !== 'undefined') url = __SUPABASE_URL__;
  if (!key && typeof __SUPABASE_KEY__ !== 'undefined') key = __SUPABASE_KEY__;

  // 3. Try process.env (for compatibility if any)
  if (!url && typeof process !== 'undefined') url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!key && typeof process !== 'undefined') key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  // 4. Hardcoded fallback for the URL suggested by the user
  if (!url || url === '') {
    url = 'https://qulzmvehcjcwbvhqtitf.supabase.co';
  }

  return { url, key };
};

const config = getSupabaseConfig();
export const SUPABASE_URL = config.url;
export const SUPABASE_PUBLISHABLE_KEY = config.key;

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
  : new Proxy({} as Record<string, unknown>, {
      get(_, prop) {
        if (prop === 'auth') {
          return {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getSession: () => Promise.resolve({ data: { session: null } }),
            getUser: () => Promise.resolve({ data: { user: null } }),
            signInWithOAuth: () => Promise.reject(new Error("Supabase is not configured")),
            signInWithPassword: () => Promise.reject(new Error("Supabase is not configured")),
            signUp: () => Promise.reject(new Error("Supabase is not configured")),
            signOut: () => Promise.resolve(),
          };
        }
        if (prop === 'from') {
          return () => {
            const chain: Record<string, unknown> = {
              select: () => chain,
              insert: () => Promise.reject(new Error("Supabase is not configured")),
              update: () => chain,
              upsert: () => Promise.reject(new Error("Supabase is not configured")),
              delete: () => chain,
              eq: () => chain,
              neq: () => chain,
              gt: () => chain,
              lt: () => chain,
              gte: () => chain,
              lte: () => chain,
              like: () => chain,
              ilike: () => chain,
              is: () => chain,
              in: () => chain,
              contains: () => chain,
              containedBy: () => chain,
              rangeGt: () => chain,
              rangeGte: () => chain,
              rangeLt: () => chain,
              rangeLte: () => chain,
              rangeAdjacent: () => chain,
              overlaps: () => chain,
              textSearch: () => chain,
              match: () => chain,
              not: () => chain,
              or: () => chain,
              filter: () => chain,
              order: () => chain,
              limit: () => chain,
              range: () => chain,
              abortSignal: () => chain,
              single: () => Promise.resolve({ data: null, error: null }),
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              then: (onfulfilled: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(onfulfilled)
            };
            return chain;
          };
        }
        if (prop === 'functions') {
          return {
            invoke: () => Promise.reject(new Error("Supabase is not configured")),
          };
        }
        if (prop === 'storage') {
          return {
            from: () => ({
              upload: () => Promise.reject(new Error("Supabase is not configured")),
              download: () => Promise.reject(new Error("Supabase is not configured")),
              remove: () => Promise.reject(new Error("Supabase is not configured")),
            })
          };
        }
        return () => Promise.reject(new Error("Supabase is not configured"));
      }
    });
