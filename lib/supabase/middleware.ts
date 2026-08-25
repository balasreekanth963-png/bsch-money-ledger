import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and decides
 * whether a route needs a logged-in BSCH client (tenant) to proceed.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedRoute = path.startsWith("/dashboard");
  const isLoginRoute = path.startsWith("/login");
  const isChangePasswordRoute = path.startsWith("/dashboard/change-password");

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Forced password change gate. Only investors coming off a temporary
  // password get flagged, and this is the single place that enforces it —
  // every /dashboard/* page benefits without needing its own check.
  if (user && isProtectedRoute && !isChangePasswordRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.must_change_password) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard/change-password";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
