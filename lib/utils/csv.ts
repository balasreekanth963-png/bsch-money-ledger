export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);

  const escape = (val: string | number) => {
    const str = String(val ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}
