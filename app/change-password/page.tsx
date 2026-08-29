import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./ChangePasswordForm";
import SodharaBrand from "@/components/SodharaBrand";

export default async function ChangePasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile?.must_change_password) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <div className="flex justify-center">
            <SodharaBrand size="sm" />
          </div>
          <p className="mt-4 text-lg font-bold text-ink-900">
            Your temporary password must be changed before continuing.
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Set a new password to access your dashboard.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}