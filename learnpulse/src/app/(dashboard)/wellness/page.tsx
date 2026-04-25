"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Log = { id: string; mood: number; notes: string | null; logged_at: string };

export default function WellnessPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [coach, setCoach] = useState("");
  const [breakOn, setBreakOn] = useState(true);
  const [mood, setMood] = useState(3);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const res = await fetch("/api/wellness");
    const d = (await res.json()) as {
      logs?: Log[];
      coachInsights?: string;
      breakRemindersEnabled?: boolean;
      error?: string;
    };
    if (!res.ok) {
      toast.error(d.error ?? "Could not load wellness");
      return;
    }
    setLogs(d.logs ?? []);
    setCoach(d.coachInsights ?? "");
    if (typeof d.breakRemindersEnabled === "boolean") setBreakOn(d.breakRemindersEnabled);
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, []);

  async function logMood(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/wellness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, notes: notes.trim() || undefined }),
    });
    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      toast.error(d.error ?? "Could not log mood");
      return;
    }
    toast.success("Mood logged");
    setNotes("");
    void refresh();
  }

  async function toggleBreak(next: boolean) {
    const res = await fetch("/api/wellness", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ break_reminders_enabled: next }),
    });
    if (!res.ok) {
      toast.error("Could not update settings");
      return;
    }
    setBreakOn(next);
    toast.success(next ? "Break reminders on" : "Break reminders off");
  }

  const weekBuckets = buildWeeklyBuckets(logs);

  if (loading) return <p className="text-zinc-500">Loading wellness…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Wellness</h1>
        <p className="mt-1 text-zinc-400">Mood history, trends, and gentle coaching.</p>
      </header>

      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => void logMood(e)}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
      >
        <h2 className="font-medium text-white">Log mood</h2>
        <p className="text-sm text-zinc-500">1 = low, 5 = great — before you dive in.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMood(n)}
              className={`h-10 w-10 rounded-full text-sm font-semibold ${
                mood === n
                  ? "bg-emerald-500 text-emerald-950"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          rows={2}
          placeholder="Optional note"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          type="submit"
          className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
        >
          Save entry
        </button>
      </motion.form>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-medium text-white">Weekly mood trend</h2>
        <p className="text-sm text-zinc-500">Average mood per weekday (last 7 days)</p>
        <div className="mt-6 flex h-40 items-end justify-between gap-2">
          {weekBuckets.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full max-w-[48px] rounded-t-lg bg-emerald-500/70"
                style={{ height: `${Math.max(6, b.avg * 18)}%` }}
                title={`Avg ${b.avg.toFixed(1)}`}
              />
              <span className="text-[10px] uppercase text-zinc-500">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-medium text-white">Coach insights</h2>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
          {coach}
        </pre>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-medium text-white">Break reminder settings</h2>
        <p className="text-sm text-zinc-500">
          After three hours in a session, we suggest a breathing break.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-600"
            checked={breakOn}
            onChange={(e) => void toggleBreak(e.target.checked)}
          />
          Enable break prompts after long sessions
        </label>
      </section>

      <section>
        <h2 className="mb-3 font-medium text-white">Mood history</h2>
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {logs.length === 0 ? (
            <li className="px-4 py-6 text-sm text-zinc-500">No entries yet.</li>
          ) : (
            logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-zinc-400">
                  {new Date(l.logged_at).toLocaleString()}
                </span>
                <span className="font-medium text-emerald-300">Mood {l.mood}</span>
                {l.notes && <span className="max-w-xs truncate text-zinc-500">{l.notes}</span>}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function buildWeeklyBuckets(logs: Log[]) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const buckets = labels.map((label, dayIndex) => ({ label, avg: 0, n: 0, dayIndex }));

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);

  for (const l of logs) {
    const d = new Date(l.logged_at);
    if (d < cutoff) continue;
    const idx = d.getDay();
    const b = buckets[idx];
    if (!b) continue;
    b.avg += l.mood;
    b.n += 1;
  }

  return buckets.map((b) => ({
    label: b.label,
    avg: b.n ? b.avg / b.n : 0,
  }));
}
