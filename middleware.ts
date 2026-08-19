import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static files and images,
     * so the auth session is refreshed everywhere it matters.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};
