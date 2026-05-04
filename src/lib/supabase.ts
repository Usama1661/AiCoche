import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined)
    ?.supabaseUrl ??
  '';
const anon =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra as { supabaseAnonKey?: string } | undefined)
    ?.supabaseAnonKey ??
  '';

/**
 * Client is real; without env vars, invocations fail gracefully and UI uses __DEV__ mocks.
 */
export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function hasSupabaseConfig(): boolean {
  const looksReal =
    Boolean(url && anon) &&
    url.includes('http') &&
    !url.includes('placeholder') &&
    anon.length > 20 &&
    anon !== 'placeholder';
  return looksReal;
}
