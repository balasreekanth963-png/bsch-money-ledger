"use client";

import { useState } from "react";
import ManageLoginModal from "@/components/ManageLoginModal";

export default function ManageTeamLoginButton({
  profileId,
  fullName,
}: {
  profileId: string;
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
          apiBasePath={`/api/profiles/${profileId}`}
          fullName={fullName}
          allowCreateAccount={false}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
