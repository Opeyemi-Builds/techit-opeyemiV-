import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://avgfdwagvkaovtjbqvkz.supabase.co";

// Supabase changed anon key format from "eyJ..." to "sb_publishable_..."
// Both formats work with @supabase/supabase-js v2.50+
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_Ruljr_uVNsbBW-1Gr6oCQQ_ed6WEXEH";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "techit-auth",
  },
  global: {
    headers: { "x-application-name": "techit-network" },
  },
});

export default supabase;
