import { createClient } from '@supabase/supabase-js';

// Live Supabase project credentials for TikTak platform cross-device real-time sync
export const DEFAULT_SUPABASE_URL = 'https://bhxhrigfwoanhmwacljm.supabase.co';
export const DEFAULT_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeGhyaWdmd29hbmhtd2FjbGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzAzNjMsImV4cCI6MjEwNjk0NjM2M30.V5asmXVOI3xFLCtWxOoVqm2Bc6x5dgH4Ic8281lwNxQ';

// Read from localStorage, environment variables, or hardcoded cloud defaults
export const getStoredSupabaseConfig = () => {
  const customUrl =
    localStorage.getItem('TIKTAK_SUPABASE_URL') ||
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const customKey =
    localStorage.getItem('TIKTAK_SUPABASE_KEY') ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  return {
    url: customUrl.trim(),
    key: customKey.trim(),
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (url) localStorage.setItem('TIKTAK_SUPABASE_URL', url.trim());
  if (key) localStorage.setItem('TIKTAK_SUPABASE_KEY', key.trim());
};

const config = getStoredSupabaseConfig();

// Initialize client with realtime channel capabilities
export const supabase = config.url && config.key
  ? createClient(config.url, config.key, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;
