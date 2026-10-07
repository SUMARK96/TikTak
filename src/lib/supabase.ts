import { createClient } from '@supabase/supabase-js';

// Default Supabase project URL and the publishable key provided by the user
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_YFxs0pUxRzhNgcJGXmiS5Q_1312YIav';

// Allow reading from localStorage or env vars, fallback to default
export const getStoredSupabaseConfig = () => {
  const customUrl = localStorage.getItem('TIKTAK_SUPABASE_URL') || import.meta.env.VITE_SUPABASE_URL || '';
  const customKey = localStorage.getItem('TIKTAK_SUPABASE_KEY') || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return {
    url: customUrl,
    key: customKey
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (url) localStorage.setItem('TIKTAK_SUPABASE_URL', url.trim());
  if (key) localStorage.setItem('TIKTAK_SUPABASE_KEY', key.trim());
};

const config = getStoredSupabaseConfig();

// Initialize client if URL is present; otherwise gracefully fallback
export const supabase = config.url && config.key
  ? createClient(config.url, config.key)
  : null;
