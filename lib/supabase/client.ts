"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Diagnostics: log env var presence in browser runtime only (not during SSR/build).
if (typeof window !== "undefined") {
  console.log("[RefEval] NEXT_PUBLIC_SUPABASE_URL present:", !!supabaseUrl, "| length:", supabaseUrl?.length ?? 0);
  console.log("[RefEval] NEXT_PUBLIC_SUPABASE_ANON_KEY present:", !!supabaseAnonKey, "| length:", supabaseAnonKey?.length ?? 0);
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
