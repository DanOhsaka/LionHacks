"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CourseSessionPoint = {
  id: string;
  started_at: string;
  accuracy_pct: number;
  score: number | null;
  mode: string | null;
  duration_seconds: number | null;
};

type RangeKey = "7" | "30" | "90" | "all";

function normalizeAccuracy(raw: number): number {
  if (raw > 0 && raw <= 1) return Math.round(raw * 100);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function CourseAccuracyChart({ points }: { points: CourseSessionPoint[] }) {
  const [range, setRange] = useState<RangeKey>("all");

  const filtered = useMemo(() => {
    const sorted = [...points].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );
    if (range === "all") return sorted;
    const days = range === "7" ? 7 : range === "30" ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return sorted.filter((p) => new Date(p.started_at).getTime() >= cutoff);
  }, [points, range]);

  const data = useMemo(
    () =>
      filtered.map((p, i) => ({
        ...p,
        label: new Date(p.started_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        idx: i + 1,
        acc: normalizeAccuracy(p.accuracy_pct),
      })),
    [filtered],
  );

  if (points.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Complete sessions with recorded accuracy to see your trend here.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {data.length} session{data.length === 1 ? "" : "s"} in view · chronological
        </p>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["7", "7d"],
              ["30", "30d"],
              ["90", "90d"],
              ["all", "All"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                range === key
                  ? "bg-gradient-to-r from-emerald-300 to-cyan-300 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:-translate-y-[1px] hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No sessions in this date range. Try &quot;All&quot; or play a session.
        </p>
      ) : (
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#71717a", fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#71717a", fontSize: 11 }}
                width={36}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof data)[0];
                  return (
                    <div className="rounded-lg border border-cyan-400/30 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl shadow-cyan-900/20">
                      <p className="font-medium text-white">
                        {new Date(p.started_at).toLocaleString()}
                      </p>
                      <p className="mt-1 text-emerald-300">Accuracy: {p.acc}%</p>
                      <p className="text-zinc-400">Score: {p.score ?? "—"}</p>
                      <p className="text-zinc-400 capitalize">Mode: {p.mode ?? "—"}</p>
                      <p className="text-zinc-400">
                        Duration:{" "}
                        {p.duration_seconds != null
                          ? `${Math.round(p.duration_seconds / 60)}m`
                          : "—"}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="acc"
                name="Accuracy"
                stroke="#22d3ee"
                strokeWidth={3}
                dot={{ r: 4, fill: "#34d399", stroke: "#0f172a", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#67e8f9" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
