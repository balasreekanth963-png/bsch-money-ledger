import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import BSCHFooter from "@/components/BSCHFooter";
import SignOutButton from "@/components/SignOutButton";
import SodharaBrand from "@/components/SodharaBrand";
import DesktopNav from "@/components/DesktopNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-brand-gradient shadow-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <SodharaBrand size="sm" variant="light" />
          <SignOutButton />
        </div>
        <DesktopNav />
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5">
        {children}
      </main>

      <div className="hidden md:block">
        <BSCHFooter />
      </div>

      <BottomNav />
    </div>
  );
}
