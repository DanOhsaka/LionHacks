"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { SessionAnalyticsV1 } from "@/lib/session-analytics";
import {
  exportSessionsJson,
  extractEventsFromSessionMetadata,
  retentionSnapshot,
  spacedRepetitionHints,
} from "@/lib/session-analytics";

export interface SessionRecapModel {
  sessionId: string;
  courseId: string;
  courseTitle: string;
  score: number;
  accuracy: number;
  durationSeconds: number;
  analytics: SessionAnalyticsV1;
}

export function SessionRecapPanel({ recap }: { recap: SessionRecapModel }) {
  const { analytics } = recap;
  const [misconceptions, setMisconceptions] = useState<string[]>([]);
  const [studyPlan, setStudyPlan] = useState<string>("");
  const [retention, setRetention] = useState<
    { checkpoint_id: string; first_try_correct: boolean; repeat_attempts: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/analytics/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: analytics.events,
            course_title: recap.courseTitle,
          }),
        });
        const data = (await res.json()) as {
          misconceptions?: string[];
          study_plan?: string;
        };
        if (cancelled) return;
        setMisconceptions(Array.isArray(data.misconceptions) ? data.misconceptions : []);
        setStudyPlan(typeof data.study_plan === "string" ? data.study_plan : "");
      } catch {
        if (!cancelled) {
          setMisconceptions([]);
          setStudyPlan("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analytics.events, recap.courseTitle]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/sessions?course_id=${encodeURIComponent(recap.courseId)}`,
        );
        const data = (await res.json()) as {
          sessions?: { id: string; metadata?: unknown }[];
        };
        if (cancelled || !data.sessions) return;
        const prior: { checkpoint_id: string; outcome: "correct" | "wrong" | "timeout" }[] =
          [];
        for (const s of data.sessions) {
          if (s.id === recap.sessionId) continue;
          const ev = extractEventsFromSessionMetadata(s.metadata);
          for (const e of ev) {
            prior.push({ checkpoint_id: e.checkpoint_id, outcome: e.outcome });
          }
        }
        setRetention(retentionSnapshot(prior, analytics.events));
      } catch {
        if (!cancelled) setRetention([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recap.courseId, recap.sessionId, analytics.events]);

  const maxChapterAttempts = useMemo(
    () =>
      Math.max(
        1,
        ...analytics.chapter_rollup.map((c) => c.correct + c.wrong + c.timeout),
      ),
    [analytics.chapter_rollup],
  );

  function downloadJson() {
    const blob = new Blob(
      [
        exportSessionsJson([
          {
            id: recap.sessionId,
            course_id: recap.courseId,
            score: recap.score,
            accuracy_pct: recap.accuracy,
            duration_seconds: recap.durationSeconds,
            metadata: { analytics },
          },
        ]),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${recap.sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const dq = analytics.data_quality;
  const spaced = spacedRepetitionHints(analytics.chapter_rollup);

  return (
    <div className="mx-auto mt-6 max-w-2xl space-y-6 text-left">
      <div>
        <h2 className="text-xl font-semibold text-white">Session recap</h2>
        <p className="mt-1 text-sm text-zinc-500">{recap.courseTitle}</p>
      </div>

      {dq.flag !== "ok" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium">Data quality: {dq.flag.replace(/_/g, " ")}</p>
          <ul className="mt-1 list-inside list-disc text-amber-100/90">
            {dq.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accuracy" value={`${recap.accuracy}%`} />
        <Stat label="Score" value={String(recap.score)} />
        <Stat label="Duration" value={`${recap.durationSeconds}s`} />
        <Stat
          label="Wrong / timeout / browse"
          value={`${analytics.wrong_count} / ${analytics.timeout_count} / ${analytics.browse_skips}`}
        />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-medium text-white">Chapter strength</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Green = share correct; width = attempts in this session.
        </p>
        <ul className="mt-4 space-y-3">
          {analytics.chapter_rollup.map((c) => {
            const total = c.correct + c.wrong + c.timeout;
            const acc = total ? Math.round((c.correct / total) * 100) : 0;
            const w = Math.round((total / maxChapterAttempts) * 100);
            return (
              <li key={`${c.chapter_index}-${c.chapter_title}`}>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span className="truncate pr-2 text-zinc-200">
                    {c.chapter_title || "Chapter"}
                  </span>
                  <span>{acc}% · {total} tries</span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800"
                  style={{ width: `${w}%`, maxWidth: "100%" }}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{ width: `${acc}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {spaced.length > 0 && (
        <section className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <h3 className="text-sm font-medium text-violet-100">Spaced repetition</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-violet-100/90">
            {spaced.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {retention.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="text-sm font-medium text-white">Retention (vs prior runs)</h3>
          <p className="mt-1 text-xs text-zinc-500">
            First try this session vs items you had missed before in this course.
          </p>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-300">
            {retention.slice(0, 12).map((r) => (
              <li key={r.checkpoint_id} className="flex justify-between gap-2">
                <span className="truncate font-mono text-zinc-500">
                  {r.checkpoint_id.slice(0, 8)}…
                </span>
                <span>
                  {r.first_try_correct ? "✓ first try" : "— miss"}{" "}
                  {r.repeat_attempts > 0 ? `· repeats ${r.repeat_attempts}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(misconceptions.length > 0 || studyPlan) && (
        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          {misconceptions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white">Misconception themes</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-zinc-300">
                {misconceptions.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {studyPlan && (
            <div>
              <h3 className="text-sm font-medium text-white">Suggested study plan</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{studyPlan}</p>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={downloadJson}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Export this session (JSON)
        </button>
        <Link
          href={`/courses/${recap.courseId}`}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
        >
          Back to course
        </Link>
        <Link
          href="/dashboard/analytics"
          className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10"
        >
          Full analytics
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
