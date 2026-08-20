/**
 * Builds a wa.me click-to-chat link — opens WhatsApp (app or web) with
 * the message pre-typed. The admin still has to tap Send themselves;
 * this is NOT automated sending, it requires no Meta approval, no
 * account, and no cost, and works the moment someone clicks it.
 */
export function buildWhatsAppLink(
  mobile: string | null | undefined,
  message: string
): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, "");
  if (!digits) return null;

  // Assume 10-digit numbers are Indian and missing their country code.
  // Numbers already including a country code (11+ digits) are left as-is.
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;

  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
