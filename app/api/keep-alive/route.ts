import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keep-alive endpoint for Supabase's free tier.
 *
 * Supabase pauses free-tier projects after 7 days with zero database
 * activity. This route does one trivial, harmless read — just enough for
 * Postgres to register activity and reset that 7-day clock. It exposes no
 * data (the response never includes the query result, just a status), and
 * costs nothing extra: reads are unlimited on the free tier, this is one
 * tiny query, at most once a day.
 *
 * Intended to be called on a schedule from outside the app — see
 * .github/workflows/keep-alive.yml, which pings this every 3 days (well
 * inside the 7-day window, so a couple of missed runs still won't matter).
 *
 * This uses the service-role client specifically so it works regardless
 * of RLS policies on any given table — the query result itself is
 * discarded; only "did this succeed" matters.
 *
 * IMPORTANT: this is a workaround, not a permanent fix. It keeps the
 * project from pausing, but doesn't remove any other free-tier limit
 * (storage, bandwidth, compute). Upgrading to Supabase Pro removes the
 * pause behavior entirely and is the right long-term fix once budget
 * allows — see the note left in the BSCH proposal's support section.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").select("id").limit(1);

    if (error) {
      return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", checkedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
