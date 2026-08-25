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

  // Middleware already enforces this gate for every /dashboard/* route,
  // but a direct hit on this page when it isn't actually required should
  // just bounce home rather than show a pointless form.
  if (!profile?.must_change_password) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-sm">
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
  );
}
