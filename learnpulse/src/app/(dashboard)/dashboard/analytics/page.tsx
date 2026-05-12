import { redirect } from "next/navigation";

import { AnalyticsDashboardClient } from "../analytics-dashboard-client";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 120);

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      "id, course_id, mode, score, accuracy_pct, duration_seconds, correct_count, wrong_count, started_at, ended_at, checkpoints_total, metadata, courses(title)",
    )
    .eq("user_id", user.id)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: false });

  if (error) {
    return (
      <p className="text-center text-red-400">
        Could not load analytics: {error.message}
      </p>
    );
  }

  return <AnalyticsDashboardClient sessions={sessions ?? []} />;
}
