import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Disable all caching for API health check
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/json');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bhxhrigfwoanhmwacljm.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeGhyaWdmd29hbmhtd2FjbGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzAzNjMsImV4cCI6MjEwNjk0NjM2M30.V5asmXVOI3xFLCtWxOoVqm2Bc6x5dgH4Ic8281lwNxQ';

  const hasEnvVars = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
  let dbConnected = false;
  let eventsCount = 0;
  let errorDetails: string | null = null;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, count, error } = await supabase.from('events').select('*', { count: 'exact' });
    if (!error) {
      dbConnected = true;
      eventsCount = count ?? (data?.length || 0);
    } else {
      errorDetails = error.message;
    }
  } catch (err: any) {
    errorDetails = err?.message || 'Database connection error';
  }

  return res.status(200).json({
    has_env_vars: hasEnvVars,
    db_connected: dbConnected,
    events_count: eventsCount,
    error: errorDetails,
    timestamp: new Date().toISOString(),
  });
}
