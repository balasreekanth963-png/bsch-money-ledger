"use client";

import { useState } from "react";
import ManageLoginModal from "./ManageLoginModal";

export default function ManageLoginButton({
  investorId,
  fullName,
}: {
  investorId: string;
  fullName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-700"
      >
        Manage Login
      </button>
      {open && (
        <ManageLoginModal
          investorId={investorId}
          fullName={fullName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
