"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use inside Client Components.
 * Uses only the public anon key — safe for the browser.
 * Row Level Security in Postgres is what actually protects tenant data,
 * not this client's configuration.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
