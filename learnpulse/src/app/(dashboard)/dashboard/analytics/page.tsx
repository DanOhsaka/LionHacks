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

  const fullSelect =
    "id, course_id, mode, score, accuracy_pct, duration_seconds, correct_count, wrong_count, started_at, ended_at, checkpoints_total, metadata, courses(title)";
  const legacySelect =
    "id, course_id, mode, score, accuracy_pct, duration_seconds, correct_count, started_at, ended_at, checkpoints_total, metadata, courses(title)";

  let { data: sessions, error } = await supabase
    .from("sessions")
    .select(fullSelect)
    .eq("user_id", user.id)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: false });

  if (
    error &&
    typeof error.message === "string" &&
    error.message.includes("wrong_count")
  ) {
    const retry = await supabase
      .from("sessions")
      .select(legacySelect)
      .eq("user_id", user.id)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false });
    // Legacy DB without wrong_count column — same row shape after normalization below.
    sessions = retry.data as typeof sessions;
    error = retry.error;
  }

  if (sessions) {
    sessions = sessions.map((row) => ({
      ...row,
      wrong_count:
        row && typeof row === "object" && "wrong_count" in row
          ? (row as { wrong_count?: number | null }).wrong_count ?? null
          : null,
    }));
  }

  if (error) {
    return (
      <p className="text-center text-red-400">
        Could not load analytics: {error.message}
      </p>
    );
  }

  return <AnalyticsDashboardClient sessions={sessions ?? []} />;
}
