"use client";

import { toCsv } from "@/lib/utils/csv";

export default function DownloadCsvButton({
  rows,
  filename,
  label = "Download CSV",
}: {
  rows: Record<string, string | number>[];
  filename: string;
  label?: string;
}) {
  function handleDownload() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={rows.length === 0}
      className="rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm font-bold text-ink-700 shadow-card transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      ⬇ {label}
    </button>
  );
}
