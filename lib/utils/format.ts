/**
 * Formats a number/string as Indian Rupees, e.g. 50000 -> "₹50,000".
 * Accepts strings because financial amounts round-trip through
 * PostgreSQL NUMERIC as strings to avoid floating-point precision loss.
 */
export function formatRupees(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
