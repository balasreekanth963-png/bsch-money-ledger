import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use inside Server Components, Route Handlers,
 * and Server Actions. Reads/writes the auth session via cookies.
 *
 * Still uses only the public anon key. Every query made with this
 * client is still subject to Row Level Security using the logged-in
 * user's identity — it is NOT an admin/service-role client.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no request context.
            // Safe to ignore when middleware handles session refresh.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above — safe to ignore in this context.
          }
        },
      },
    }
  );
}
