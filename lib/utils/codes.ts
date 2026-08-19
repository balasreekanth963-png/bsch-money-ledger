/**
 * Generates a short, human-readable, extremely-low-collision-odds code
 * for investor_code / investment_code (both are globally unique columns).
 * Not a database sequence — fine for this scale, avoids an extra round
 * trip to check for collisions before insert.
 */
export function generateCode(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

/** Generates a random temporary password shown once to the admin. */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
