import { createBrowserClient } from "@supabase/ssr";

// createBrowserClient is called lazily (not at module evaluation time) so that
// Next.js static prerender does not attempt to instantiate the client before
// NEXT_PUBLIC_* env vars are available in the browser bundle.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
