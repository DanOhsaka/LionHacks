import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { RoomieBubble } from "@/components/wellness/RoomieBubble";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardGroupLayout({
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
    <div
      className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground sm:flex-row sm:overflow-hidden"
      style={{ backgroundColor: "#070b14", color: "#e8eaef", minHeight: "100dvh" }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-24 left-8 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-2xl" />
        <div className="absolute right-0 top-20 h-52 w-52 rounded-full bg-cyan-500/10 blur-2xl" />
      </div>
      <DashboardNav />
      {/* Main above aside so fixed UI inside children (e.g. session coach) is not trapped under the nav */}
      <main className="relative z-20 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-10">
        {children}
      </main>
      <RoomieBubble />
    </div>
  );
}
