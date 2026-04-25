import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { BarChart3, BookMarked } from "lucide-react";

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
  const accuracySeries = [...sess]
    .filter((s) => s.accuracy_pct != null && s.ended_at)
    .reverse()
    .slice(-14)
    .map((s) => Number(s.accuracy_pct));

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-emerald-400">{course.subject}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{course.title}</h1>
        <p className="text-zinc-400">
          Completion {Math.round(Number(course.completion_percent ?? 0))}% · Streak{" "}
          {course.current_streak ?? 0} days
        </p>
      </header>

      <CourseSessionStarter courseId={course.id} />

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
          <BookMarked className="h-5 w-5 text-emerald-400" />
          Checkpoints by chapter
        </h2>
        <div className="space-y-6">
          {chapterKeys.length === 0 ? (
            <p className="text-sm text-zinc-500">No checkpoints for this course.</p>
          ) : (
            chapterKeys.map((ch) => {
              const items = byChapter.get(ch)!;
              const title = items[0]?.chapter_title || `Chapter ${ch + 1}`;
              return (
                <div key={ch} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h3 className="font-medium text-white">{title}</h3>
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
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          Accuracy trend
        </h2>
        {accuracySeries.length === 0 ? (
          <p className="text-sm text-zinc-500">Play a few sessions to see your trend.</p>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex h-28 items-end gap-1">
              {accuracySeries.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-emerald-500/70 transition hover:bg-emerald-400"
                  style={{ height: `${Math.max(8, v)}%` }}
                  title={`${Math.round(v)}%`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Last up to 14 completed sessions (chronological)</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-white">Session history</h2>
        {sess.length === 0 ? (
          <p className="text-sm text-zinc-500">No sessions for this course yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sess.map((s) => (
                  <tr key={s.id} className="bg-zinc-900/20">
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-400">{s.mode}</td>
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
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
      >
        ← Back to library
      </Link>
    </div>
  );
}
