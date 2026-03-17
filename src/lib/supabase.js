import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabaseConfigMessage = supabaseConfigured
  ? ''
  : 'VITE_SUPABASE_URL または VITE_SUPABASE_PUBLISHABLE_KEY が未設定です。README の手順に従って .env.local を作成してください。';

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
