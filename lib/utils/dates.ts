/**
 * Adds `months` calendar months to a YYYY-MM-DD date string, in UTC, and
 * returns a new YYYY-MM-DD string. Shared by investment create + edit
 * routes so maturity-date math never drifts between the two.
 */
export function addMonthsUTC(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}
