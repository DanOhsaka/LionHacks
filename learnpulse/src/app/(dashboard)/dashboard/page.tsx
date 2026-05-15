import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { LearnerGoalsCard } from "./learner-goals-card";
import { Badge } from "@/components/ui/badge";
import { courseMasteryPercent } from "@/lib/course-completion";
import { computeStudyStreakUtc } from "@/lib/dashboard-stats";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BarChart3, BookOpen, Sparkles, Upload } from "lucide-react";
export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: courses } = await supabase
    .from("courses")
    .select("id,title,subject,completion_percent,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id,course_id,mode,score,accuracy_pct,duration_seconds,started_at,ended_at,courses(title)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(12);

  const { data: streakSessions } = await supabase
    .from("sessions")
    .select("ended_at")
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  const courseList = courses ?? [];
  const courseIds = courseList.map((c) => c.id);

  const { data: checkpointRows } =
    courseIds.length > 0
      ? await supabase.from("checkpoints").select("course_id").in("course_id", courseIds)
      : { data: [] as { course_id: string }[] };

  const checkpointTotalByCourse = new Map<string, number>();
  for (const row of checkpointRows ?? []) {
    checkpointTotalByCourse.set(
      row.course_id,
      (checkpointTotalByCourse.get(row.course_id) ?? 0) + 1,
    );
  }

  const { data: endedSessions } =
    courseIds.length > 0
      ? await supabase
          .from("sessions")
          .select("course_id, metadata, correct_count, wrong_count")
          .eq("user_id", user.id)
          .in("course_id", courseIds)
          .not("ended_at", "is", null)
      : { data: [] as { course_id: string; metadata: unknown; correct_count: number | null; wrong_count: number | null }[] };

  const sessionsByCourse = new Map<
    string,
    { metadata?: unknown; correct_count?: number | null; wrong_count?: number | null }[]
  >();
  for (const s of endedSessions ?? []) {
    const list = sessionsByCourse.get(s.course_id) ?? [];
    list.push(s);
    sessionsByCourse.set(s.course_id, list);
  }

  const masteryByCourse = new Map<string, number>();
  for (const c of courseList) {
    const totalCp = checkpointTotalByCourse.get(c.id) ?? 0;
    const sessions = sessionsByCourse.get(c.id) ?? [];
    masteryByCourse.set(c.id, courseMasteryPercent(totalCp, sessions));
  }

  const activeCourses = courseList
    .filter((c) => (masteryByCourse.get(c.id) ?? 0) < 100)
    .slice(0, 6);
  const avgCompletion =
    courseList.length === 0
      ? 0
      : Math.round(
          courseList.reduce((a, c) => a + (masteryByCourse.get(c.id) ?? 0), 0) / courseList.length,
        );

  const { data: totals } = await supabase
    .from("sessions")
    .select("duration_seconds")
    .eq("user_id", user.id);

  const totalSeconds =
    totals?.reduce((acc, r) => acc + (r.duration_seconds ?? 0), 0) ?? 0;
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  const streak = computeStudyStreakUtc(streakSessions ?? []);

  return (
    <div className="app-container-dashboard">
      <PageHeader
        title="Dashboard"
        description="Your pulse on progress, time, and momentum."
        titleGradient
        action={
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <Badge className="w-fit justify-center sm:justify-end">Academic analytics workspace</Badge>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] hover:scale-[1.045] hover:-translate-y-[1px] hover:from-emerald-500/30 hover:to-cyan-500/30"
            >
              <BarChart3 className="h-4 w-4 shrink-0" strokeWidth={2} />
              Open analytics
            </Link>
          </div>
        }
      />

      <LearnerGoalsCard />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active courses" value={String(activeCourses.length || courseList.length)} />
        <StatCard
          label="Avg mastery"
          value={`${avgCompletion}%`}
          hint="Average share of checkpoints you've answered correctly at least once, across your courses."
        />
        <StatCard label="Time invested" value={`${totalHours}h`} />
        <StatCard label="Current streak" value={`${streak}d`} highlight />
      </section>

      <section className="app-panel rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 text-emerald-200">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-medium text-white">Upload new material</h2>
              <p className="text-sm text-zinc-500">
                PDFs, slides, notes — we turn them into a quiz game.
              </p>
            </div>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] hover:scale-[1.045] hover:-translate-y-[1px] hover:from-emerald-300 hover:to-cyan-200"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Link>
        </div>
      </section>

      <section>
        <h2 className="app-section-title mb-4">Active subjects</h2>
        {activeCourses.length === 0 && courseList.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Upload notes, slides, or a syllabus — we turn them into checkpoints you can play in Speed, Zen, or Story mode."
            action={
              <Link
                href="/upload"
                className="pp-hover-grow inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:from-emerald-300 hover:to-cyan-200"
              >
                <Upload className="h-4 w-4 shrink-0" strokeWidth={2} />
                Upload your first deck
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {(activeCourses.length ? activeCourses : courseList.slice(0, 6)).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/courses/${c.id}`}
                  className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] hover:scale-[1.045] hover:-translate-y-[1px] hover:border-cyan-400/40 hover:bg-zinc-900/70"
                >
                  <div>
                    <p className="font-medium text-white">{c.title}</p>
                    <p className="text-xs text-zinc-500">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>{masteryByCourse.get(c.id) ?? 0}%</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="app-section-title mb-4">Recent sessions</h2>
        {!sessions?.length ? (
          <EmptyState
            icon={Sparkles}
            title="No sessions yet"
            description="Open a course and start a session — your recent runs and scores will land here."
            action={
              <Link
                href="/courses"
                className="pp-hover-grow inline-flex rounded-xl border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-cyan-500/40 hover:bg-zinc-800/80"
              >
                Browse courses
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800/80 bg-zinc-900/40">
            {sessions.map((s) => {
              const title =
                (s.courses as { title?: string } | null)?.title ?? "Course";
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition hover:bg-zinc-800/40"
                >
                  <div>
                    <p className="text-white">{title}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(s.started_at).toLocaleString()} · {s.mode}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-400">
                    {s.score != null && <span className="text-emerald-400">{s.score} pts</span>}
                    {s.accuracy_pct != null && (
                      <span className="ml-2">{Math.round(Number(s.accuracy_pct))}% acc</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  hint?: string;
}) {
  const numeric = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  const progress = Number.isFinite(numeric) ? Math.max(8, Math.min(100, numeric)) : 20;
  return (
    <div
      title={hint}
      className={`rounded-2xl border p-4 shadow-lg transition hover:-translate-y-[1px] ${
        highlight
          ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 shadow-emerald-900/20"
          : "border-zinc-800/80 bg-zinc-900/50 shadow-black/20"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-app-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <div className="mt-3 h-1.5 rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${highlight ? "bg-emerald-300" : "bg-cyan-300/80"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
