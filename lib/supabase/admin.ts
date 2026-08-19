import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * NEVER import this file into a Client Component ("use client") or any
 * code that ships to the browser — it would expose the service role key.
 * Only import it inside Route Handlers (app/api/.../route.ts) or Server
 * Actions, and always check the caller's own role/company via the normal
 * RLS-scoped client BEFORE using this one to do anything privileged.
 *
 * Used for operations Supabase Auth requires elevated privileges for,
 * e.g. an admin creating a login for a new investor directly (rather
 * than the investor self-signing-up through the public /login flow).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
