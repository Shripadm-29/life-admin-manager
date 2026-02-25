import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars via import.meta.env. Ensure your .env.local (or equivalent) defines
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README or Vite docs).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
