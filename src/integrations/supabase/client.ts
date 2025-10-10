import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://eqaxlptaokejbcftvjnu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYXhscHRhb2tlamJjZnR2am51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MzIwMTksImV4cCI6MjA3NDEwODAxOX0.IC0RR9hCJz4kE2wW0X3thzF3EK1MDtKKDW5-DKVdJZM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // garde la session en localStorage
    autoRefreshToken: true,     // rafraîchit automatiquement le JWT
    detectSessionInUrl: true,   // utile si tu fais un login via redirect OAuth
  },
});

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    localStorage.setItem("supabase.auth.token", JSON.stringify(session));
  } else {
    localStorage.removeItem("supabase.auth.token");
  }
});
