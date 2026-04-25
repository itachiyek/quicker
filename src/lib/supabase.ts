import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// We use the schema option so all `from()` calls land in `quicker.*`. The
// generic `SupabaseClient` (no Database type) keeps query types loose.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
