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
  if (!url || url === 'undefined' || url === 'null') {
    if (typeof __SUPABASE_URL__ !== 'undefined' && __SUPABASE_URL__) url = __SUPABASE_URL__;
  }
  if (!key || key === 'undefined' || key === 'null') {
    if (typeof __SUPABASE_KEY__ !== 'undefined' && __SUPABASE_KEY__) key = __SUPABASE_KEY__;
  }

  // 3. Try process.env (for compatibility if any)
  try {
    if ((!url || url === 'undefined' || url === 'null') && typeof process !== 'undefined' && process.env) {
      url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    }
    if ((!key || key === 'undefined' || key === 'null') && typeof process !== 'undefined' && process.env) {
      key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
    }
  } catch (e) {
    // Ignore process errors
  }

  // Swap detection: if URL is long and doesn't start with http, and KEY starts with http
  if (url && key && !url.startsWith('http') && key.startsWith('http')) {
    const temp = url;
    url = key;
    key = temp;
  }

  // Hardcoded fallback for the URL suggested by the user
  if (!url || url === '' || url === 'undefined' || url === 'null' || !url.startsWith('http')) {
    url = 'https://qulzmvehcjcwbvhqtitf.supabase.co';
  }

  // Final sanitization: if the URL looks like a key (long string, no dots/slashes), it's probably wrong
  if (url.length > 50 && !url.includes('.') && !url.includes('/')) {
    // This is likely a key being passed as a URL
    url = 'https://qulzmvehcjcwbvhqtitf.supabase.co';
  }

  // Debug logging
  if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
    console.log("Supabase URL resolved to:", url);
    console.log("Supabase Key length:", key?.length || 0);
  }

  return { url, key };
};

const config = getSupabaseConfig();
export const SUPABASE_URL = config.url;
export const SUPABASE_PUBLISHABLE_KEY = config.key;

// Check if credentials are valid before initializing
export const isConfigValid = () => {
  const hasUrl = !!SUPABASE_URL && SUPABASE_URL.length > 0;
  const isUrlValid = hasUrl && SUPABASE_URL.startsWith('http');
  const hasKey = !!SUPABASE_PUBLISHABLE_KEY && SUPABASE_PUBLISHABLE_KEY.length > 0;
  
  return isUrlValid && hasKey;
};

const configValid = isConfigValid();

// Initialize the client even if config is technically "invalid" to see actual errors from Supabase
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_PUBLISHABLE_KEY || 'placeholder',
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

