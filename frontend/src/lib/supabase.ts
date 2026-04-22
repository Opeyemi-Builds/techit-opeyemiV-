import { createClient } from "@supabase/supabase-js";

// Use the ENV variables exclusively to ensure you're on the right project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This helps you debug if Vite is failing to read your .env file
  console.error("❌ Supabase Env Vars Missing! Check your .env file in the frontend folder.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "techit-auth-v2", // Updated key to clear any old corrupted cache
  },
});

export default supabase;