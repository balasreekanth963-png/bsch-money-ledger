/**
 * Thin wrapper around the Resend API. Deliberately fails soft: if
 * RESEND_API_KEY isn't set yet, every call just logs a warning and
 * returns { skipped: true } instead of throwing — so nothing else in
 * the app breaks while you're still setting up the account. Once you
 * add the key to .env.local (and Vercel's env vars for production),
 * sending starts working with zero other code changes.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ skipped: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipped sending "${subject}" to ${
        Array.isArray(to) ? to.join(", ") : to
      }`
    );
    return { skipped: true };
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { skipped: true, error: "No valid recipient email addresses." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Resend's shared sandbox sender works with zero setup for testing.
        // Once you verify your own domain in Resend, switch this to
        // something like "Sodhara Investments <updates@sodharainvestments.com>"
        // via the RESEND_FROM_EMAIL env var.
        from: process.env.RESEND_FROM_EMAIL || "Sodhara Investments <onboarding@resend.dev>",
        to: recipients,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] Resend send failed:", res.status, text);
      return { skipped: false, error: text || `HTTP ${res.status}` };
    }

    return { skipped: false };
  } catch (err) {
    console.error("[email] Network error sending email:", err);
    return { skipped: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
