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
    <div className="relative flex min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-8 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-2xl" />
        <div className="absolute right-0 top-20 h-52 w-52 rounded-full bg-cyan-500/10 blur-2xl" />
      </div>
      <DashboardNav />
      <main className="relative z-10 flex-1 overflow-auto p-6 sm:p-10">{children}</main>
      <RoomieBubble />
    </div>
  );
}
