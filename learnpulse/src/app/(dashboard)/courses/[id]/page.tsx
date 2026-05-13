import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  moduleConfidencePercent,
  normalizeModuleStats,
} from "@/lib/module-confidence";
import { createClient } from "@/lib/supabase/server";
import { BarChart3, BookMarked } from "lucide-react";

import { CourseAccuracyChart } from "./course-accuracy-chart";
import { CourseSessionStarter } from "./session-starter";

type PageProps = { params: Promise<{ id: string }> };

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !course) notFound();

  const { data: checkpoints } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("course_id", id)
    .order("position", { ascending: true });

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("course_id", id)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(40);

  const cps = checkpoints ?? [];
  const byChapter = new Map<number, typeof cps>();
  for (const cp of cps) {
    const ch = cp.chapter_index ?? 0;
    if (!byChapter.has(ch)) byChapter.set(ch, []);
    byChapter.get(ch)!.push(cp);
  }
  const chapterKeys = Array.from(byChapter.keys()).sort((a, b) => a - b);

  const sess = sessions ?? [];
  const moduleStats = normalizeModuleStats(course.module_stats);

  const chartPoints = sess
    .filter((s) => s.ended_at != null && s.accuracy_pct != null)
    .map((s) => ({
      id: s.id as string,
      started_at: s.started_at as string,
      accuracy_pct: Number(s.accuracy_pct),
      score: (s.score as number | null) ?? null,
      mode: (s.mode as string | null) ?? null,
      duration_seconds: (s.duration_seconds as number | null) ?? null,
    }));

  const crumbTitle =
    course.title.length > 30 ? `${course.title.slice(0, 29)}…` : course.title;

  return (
    <div className="app-container-dashboard">
      <PageHeader
        title={course.title}
        description={`Completion ${Math.round(Number(course.completion_percent ?? 0))}% · Streak ${course.current_streak ?? 0} days`}
        breadcrumbs={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/courses", label: "Courses" },
          { label: crumbTitle },
        ]}
        action={<Badge className="w-fit shrink-0">{course.subject}</Badge>}
      />

      <CourseSessionStarter courseId={course.id} />

      <section>
        <h2 className="app-section-title mb-4 flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-emerald-400" />
          Checkpoints by chapter
        </h2>
        <div className="space-y-6">
          {chapterKeys.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="No checkpoints yet"
              description="We could not derive quiz items from this upload yet. Try uploading again with clearer text, or start a session once generation completes."
            />
          ) : (
            chapterKeys.map((ch) => {
              const items = byChapter.get(ch)!;
              const title = items[0]?.chapter_title || `Chapter ${ch + 1}`;
              const confidence = moduleConfidencePercent(moduleStats, ch);
              return (
                <div key={ch} className="app-panel rounded-2xl p-4 transition hover:border-cyan-400/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium text-white">{title}</h3>
                    {confidence != null ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                        {confidence}% confidence
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Confidence builds as you complete sessions here
                      </span>
                    )}
                  </div>
                  {confidence != null && (
                    <div className="mt-3 h-1.5 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
                        style={{ width: `${Math.max(8, confidence)}%` }}
                      />
                    </div>
                  )}
                  <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                    {items.map((cp, i) => (
                      <li key={cp.id} className="flex gap-2">
                        <span className="text-zinc-600">{i + 1}.</span>
                        <span className="text-zinc-300">{cp.question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <h2 className="app-section-title mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          Accuracy trend
        </h2>
        <CourseAccuracyChart points={chartPoints} />
      </section>

      <section>
        <h2 className="app-section-title mb-4">Session history</h2>
        {sess.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No sessions yet"
            description="Play a round from this course — accuracy and duration will show up in this table."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sess.map((s) => (
                  <tr key={s.id} className="bg-zinc-900/20 transition hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-400">{s.mode}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {s.accuracy_pct != null
                        ? `${Math.round(Number(s.accuracy_pct))}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-emerald-300">{s.score ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {s.duration_seconds != null
                        ? `${Math.round(s.duration_seconds / 60)}m`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link
        href="/courses"
        className="pp-hover-grow inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
      >
        ← Back to library
      </Link>
    </div>
  );
}
