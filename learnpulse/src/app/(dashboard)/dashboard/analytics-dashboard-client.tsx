"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Download } from "lucide-react";

import {
  exportSessionsCsv,
  exportSessionsJson,
} from "@/lib/session-analytics";

type SessionRow = {
  id: string;
  course_id: string | null;
  mode: string | null;
  score: number | null;
  accuracy_pct: number | null;
  duration_seconds: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  started_at: string;
  ended_at: string | null;
  checkpoints_total: number | null;
  metadata?: unknown;
  courses?: { title?: string } | { title?: string }[] | null;
};

function courseTitleFromRow(s: SessionRow): string {
  const c = s.courses;
  if (!c) return "Course";
  if (Array.isArray(c)) return c[0]?.title ?? "Course";
  return c.title ?? "Course";
}

export function AnalyticsDashboardClient({ sessions }: { sessions: SessionRow[] }) {
  const [range, setRange] = useState<"30" | "90">("30");

  const filtered = useMemo(() => {
    const days = range === "30" ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return sessions.filter((s) => new Date(s.started_at).getTime() >= cutoff);
  }, [sessions, range]);

  const trend = useMemo(() => {
    const byDay = new Map<
      string,
      { scores: number[]; accs: number[]; count: number }
    >();
    for (const s of filtered) {
      if (!s.ended_at) continue;
      const key = s.started_at.slice(0, 10);
      const cur = byDay.get(key) ?? { scores: [], accs: [], count: 0 };
      if (s.score != null) cur.scores.push(s.score);
      if (s.accuracy_pct != null) cur.accs.push(Number(s.accuracy_pct));
      cur.count += 1;
      byDay.set(key, cur);
    }
    const keys = Array.from(byDay.keys()).sort();
    return keys.map((k) => {
      const v = byDay.get(k)!;
      const avgScore =
        v.scores.length === 0
          ? null
          : Math.round(v.scores.reduce((a: number, b: number) => a + b, 0) / v.scores.length);
      const avgAcc =
        v.accs.length === 0
          ? null
          : Math.round(v.accs.reduce((a: number, b: number) => a + b, 0) / v.accs.length);
      return { date: k, avgScore, avgAcc, sessions: v.count };
    });
  }, [filtered]);

  const rolling7 = useMemo(() => {
    const sorted = [...filtered]
      .filter((s) => s.ended_at)
      .sort(
        (a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
      );
    return sorted.map((s, i) => {
      const window = sorted.slice(Math.max(0, i - 6), i + 1);
      const accs = window
        .map((x) => x.accuracy_pct)
        .filter((x): x is number => x != null && !Number.isNaN(Number(x)));
      const avg =
        accs.length === 0
          ? null
          : Math.round(
              accs.reduce((a: number, b: number) => a + Number(b), 0) / accs.length,
            );
      return {
        label: s.started_at.slice(0, 10),
        roll7Acc: avg,
      };
    });
  }, [filtered]);

  const byCourse = useMemo(() => {
    const m = new Map<
      string,
      {
        title: string;
        sessions: number;
        totalSec: number;
        accs: number[];
        earlyExit: number;
      }
    >();
    for (const s of filtered) {
      if (!s.course_id) continue;
      const title = courseTitleFromRow(s);
      const cur =
        m.get(s.course_id) ??
        ({ title, sessions: 0, totalSec: 0, accs: [], earlyExit: 0 } as {
          title: string;
          sessions: number;
          totalSec: number;
          accs: number[];
          earlyExit: number;
        });
      cur.sessions += 1;
      cur.totalSec += s.duration_seconds ?? 0;
      if (s.accuracy_pct != null) cur.accs.push(Number(s.accuracy_pct));
      const meta = s.metadata as {
        analytics?: { events?: unknown[] };
      } | null;
      const evLen = meta?.analytics?.events?.length ?? 0;
      const total = s.checkpoints_total ?? 0;
      if (total > 0 && evLen > 0 && evLen < total * 0.45) cur.earlyExit += 1;
      m.set(s.course_id, cur);
    }
    return Array.from(m.entries()).map(([id, v]) => ({
      id,
      title: v.title,
      sessions: v.sessions,
      hours: Math.round((v.totalSec / 3600) * 10) / 10,
      avgAcc:
        v.accs.length === 0
          ? null
          : Math.round(v.accs.reduce((a: number, b: number) => a + b, 0) / v.accs.length),
      earlyExit: v.earlyExit,
    }));
  }, [filtered]);

  const wow = useMemo(() => {
    const now = Date.now();
    const d7 = now - 7 * 86400000;
    const d14 = now - 14 * 86400000;
    const acc = (rows: SessionRow[]) => {
      const xs = rows
        .filter((s) => s.ended_at && s.accuracy_pct != null)
        .map((s) => Number(s.accuracy_pct));
      if (!xs.length) return null;
      return Math.round(xs.reduce((a: number, b: number) => a + b, 0) / xs.length);
    };
    const last7 = sessions.filter(
      (s) => new Date(s.started_at).getTime() >= d7 && s.ended_at,
    );
    const prev7 = sessions.filter((s) => {
      const t = new Date(s.started_at).getTime();
      return t >= d14 && t < d7 && s.ended_at;
    });
    return {
      thisAcc: acc(last7),
      lastAcc: acc(prev7),
    };
  }, [sessions]);

  function downloadJson() {
    const blob = new Blob([exportSessionsJson(filtered as unknown as Record<string, unknown>[])], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pridepath-sessions.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const blob = new Blob(
      [exportSessionsCsv(filtered as unknown as Record<string, unknown>[])],
      { type: "text/csv" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pridepath-sessions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="app-panel flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-white">
            <BarChart3 className="h-8 w-8 text-emerald-400" />
            Analytics
          </h1>
          <p className="mt-1 text-zinc-400">
            Trends, course comparison, exports, and week-over-week signals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as "30" | "90")}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={downloadJson}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            <Download className="h-4 w-4" />
            JSON
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="app-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">You vs prior 7 days</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {wow.thisAcc != null ? `${wow.thisAcc}%` : "—"}
            <span className="text-base font-normal text-zinc-500"> last 7d avg</span>
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Prior 7d window:{" "}
            {wow.lastAcc != null ? `${wow.lastAcc}%` : "—"}
            {wow.thisAcc != null && wow.lastAcc != null && (
              <span className="ml-2 text-emerald-400">
                (Δ {wow.thisAcc >= wow.lastAcc ? "+" : ""}
                {wow.thisAcc - wow.lastAcc}%)
              </span>
            )}
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Multi-learner cohort benchmarks need shared infrastructure; this card compares
            your most recent week of sessions to the week before it.
          </p>
        </div>
        <div className="app-panel rounded-2xl p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Rolling 7-session accuracy
          </p>
          <div className="mt-2 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rolling7}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                  labelStyle={{ color: "#a1a1aa" }}
                />
                <Line
                  type="monotone"
                  dataKey="roll7Acc"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  name="Avg % (7)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="app-panel rounded-2xl p-6">
        <h2 className="text-lg font-medium text-white">Daily aggregates</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Average score and accuracy per calendar day (ended sessions only).
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: "#71717a", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgScore"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                name="Avg score"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgAcc"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                name="Avg accuracy %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="app-panel rounded-2xl p-6">
        <h2 className="text-lg font-medium text-white">Course comparison</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Time invested, session count, average accuracy, and possible early exits
          (answered fewer than ~45% of checkpoints with recorded events).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2 pr-4">Course</th>
                <th className="py-2 pr-4">Sessions</th>
                <th className="py-2 pr-4">Hours</th>
                <th className="py-2 pr-4">Avg acc</th>
                <th className="py-2">Early-exit-ish</th>
              </tr>
            </thead>
            <tbody>
              {byCourse.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-zinc-500">
                    No data in this range.
                  </td>
                </tr>
              ) : (
                byCourse.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-800/80">
                    <td className="py-2 pr-4">
                      <Link href={`/courses/${c.id}`} className="text-emerald-400 hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-zinc-300">{c.sessions}</td>
                    <td className="py-2 pr-4 text-zinc-300">{c.hours}</td>
                    <td className="py-2 pr-4 text-zinc-300">
                      {c.avgAcc != null ? `${c.avgAcc}%` : "—"}
                    </td>
                    <td className="py-2 text-zinc-400">{c.earlyExit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
