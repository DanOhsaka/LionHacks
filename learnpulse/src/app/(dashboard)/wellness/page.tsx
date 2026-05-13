"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/PageHeader";

type Log = { id: string; mood: number; notes: string | null; logged_at: string };

const INTRO_TEXT =
  "Hello fellow student, I'm Roomie. Welcome to PridePath. I'm here to help you navigate your mental health in order for you to have a smooth and fun study session. Tell me how you're feeling today.";

const MOODS = [
  { value: 1, emoji: "😢", label: "Terrible" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Amazing" },
] as const;

function segmentStroke(m1: number, m2: number): string {
  const avg = (m1 + m2) / 2;
  if (avg < 2.5) return "#ef4444";
  if (avg < 3.5) return "#eab308";
  return "#22c55e";
}

function filterLogsLast14Days(logs: Log[]): Log[] {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);
  return logs.filter((l) => {
    const d = new Date(l.logged_at);
    return d >= start && d <= end;
  });
}

function buildDailyChartData(logs: Log[]) {
  const inRange = filterLogsLast14Days(logs);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  const byDay = new Map<string, number[]>();
  for (const l of inRange) {
    const d = new Date(l.logged_at);
    const key = d.toISOString().slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(l.mood);
    byDay.set(key, arr);
  }

  const points: { date: string; mood: number; label: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const moods = byDay.get(key);
    if (moods?.length) {
      const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
      points.push({
        date: key,
        mood: Math.round(avg * 10) / 10,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }
  }
  return points;
}

function buildSegmentChartRows(points: { date: string; mood: number; label: string }[]) {
  if (points.length === 0) return [];
  const rows = points.map((p, idx) => {
    const row: Record<string, string | number | null> = {
      label: p.label,
      date: p.date,
      mood: p.mood,
    };
    for (let s = 0; s < points.length - 1; s++) {
      row[`seg_${s}`] = idx === s || idx === s + 1 ? p.mood : null;
    }
    return row;
  });
  return rows;
}

export default function WellnessPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [loggingMood, setLoggingMood] = useState(false);

  const [introTyped, setIntroTyped] = useState("");
  const [introDone, setIntroDone] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const chartPoints = useMemo(() => buildDailyChartData(logs), [logs]);
  const segmentRows = useMemo(() => buildSegmentChartRows(chartPoints), [chartPoints]);
  const segmentCount = Math.max(0, chartPoints.length - 1);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/wellness");
    const d = (await res.json()) as { logs?: Log[]; error?: string };
    if (!res.ok) {
      toast.error(d.error ?? "Could not load wellness");
      return;
    }
    setLogs(d.logs ?? []);
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (introDone) return;
    if (introTyped.length >= INTRO_TEXT.length) {
      setIntroDone(true);
      setChatMessages([{ role: "assistant", content: INTRO_TEXT }]);
      return;
    }
    const t = window.setTimeout(() => {
      setIntroTyped(INTRO_TEXT.slice(0, introTyped.length + 1));
    }, 30);
    return () => window.clearTimeout(t);
  }, [introTyped, introDone]);

  useEffect(() => {
    const scroller = chatScrollRef.current;
    if (!scroller || !stickToBottomRef.current) return;
    chatEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [chatMessages, chatLoading, introDone]);

  async function logMood(value: number) {
    setSelectedMood(value);
    setLoggingMood(true);
    const res = await fetch("/api/wellness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: value }),
    });
    setLoggingMood(false);
    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      toast.error(d.error ?? "Could not log mood");
      return;
    }
    toast.success("Mood saved", { description: "Thanks for checking in with Roomie." });
    void refresh();
  }

  async function sendChat() {
    const trimmed = input.trim();
    if (!trimmed || chatLoading || !introDone) return;

    const nextHistory = [...chatMessages, { role: "user" as const, content: trimmed }];
    setChatMessages(nextHistory);
    setInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/wellness/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Roomie could not reply");
        setChatMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
        return;
      }
      const reply = data.reply?.trim() ?? "";
      if (!reply) {
        toast.error("Empty reply");
        setChatMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
        return;
      }
      setChatMessages([...nextHistory, { role: "assistant", content: reply }]);
    } catch {
      toast.error("Something went wrong");
      setChatMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="app-container-dashboard space-y-6" aria-hidden>
        <div className="app-panel app-panel-elevated pp-skeleton-pulse h-28 rounded-2xl" />
        <div className="app-panel pp-skeleton-pulse h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-24">
      <PageHeader
        title="Wellness with Roomie"
        description="Log how you feel, chat with Roomie, and see your mood trend."
        breadcrumbs={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Wellness" },
        ]}
        titleGradient
      />

      {/* Section 1 — Mood log */}
      <section className="app-panel rounded-2xl p-6">
        <h2 className="app-section-title">Mood log</h2>
        <p className="app-muted mt-1">Tap how you feel right now.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-between">
          {MOODS.map(({ value, emoji, label }) => {
            const selected = selectedMood === value;
            return (
              <button
                key={value}
                type="button"
                disabled={loggingMood}
                onClick={() => void logMood(value)}
                className={`flex min-w-[5.5rem] flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm transition ${
                  selected
                    ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                    : "border-zinc-700/70 bg-zinc-900/70 text-zinc-200 hover:border-cyan-400/40"
                } disabled:opacity-60`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2 — Roomie chat */}
      <section className="app-panel rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-2xl">
              🦁
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Roomie</h2>
              <p className="text-sm text-zinc-400">Your wellness coach</p>
            </div>
          </div>
          <span className="shrink-0 self-end text-xs text-zinc-500">✨ Powered by Gemini</span>
        </div>

        <div
          ref={chatScrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const distanceFromBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight;
            stickToBottomRef.current = distanceFromBottom < 24;
          }}
          className="mt-6 flex max-h-[min(420px,50vh)] flex-col gap-3 overflow-y-auto rounded-xl bg-zinc-950/60 p-4"
        >
          {!introDone && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-emerald-500/20 px-4 py-3 text-sm text-emerald-100">
                {introTyped}
                {introTyped.length < INTRO_TEXT.length && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-300 align-middle" />
                )}
              </div>
            </div>
          )}

          {introDone &&
            chatMessages.map((m, i) => (
              <div
                key={`${i}-${m.role}-${m.content.slice(0, 12)}`}
                className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "assistant"
                      ? "rounded-bl-md bg-emerald-500/20 text-emerald-100"
                      : "rounded-br-md bg-zinc-800 text-zinc-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-emerald-500/20 px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-2 w-2 rounded-full bg-emerald-300"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 0.75,
                      repeat: 8,
                      delay: d * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {introDone && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendChat();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell Roomie how you're feeling…"
              className="focus-ring min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !input.trim()}
              className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:from-emerald-300 hover:to-cyan-200 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
      </section>

      {/* Section 3 — Mood trend */}
      <section className="app-panel rounded-2xl p-6">
        <h2 className="app-section-title">Mood trend</h2>
        <p className="app-muted mt-1">Last 14 days (daily average when you log multiple times).</p>

        {chartPoints.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 py-10 text-center text-sm text-zinc-500">
            No mood data yet. Log your first mood above!
          </p>
        ) : (
          <>
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={segmentRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #334155",
                      background: "#0f172a",
                      color: "#e5e7eb",
                      fontSize: "12px",
                    }}
                    formatter={(v) => [v ?? "—", "Mood"]}
                  />
                  {Array.from({ length: segmentCount }, (_, s) => (
                    <Line
                      key={s}
                      type="monotone"
                      dataKey={`seg_${s}`}
                      stroke={segmentStroke(chartPoints[s]!.mood, chartPoints[s + 1]!.mood)}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                  {chartPoints.length === 1 && (
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke={segmentStroke(chartPoints[0]!.mood, chartPoints[0]!.mood)}
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        fill: segmentStroke(chartPoints[0]!.mood, chartPoints[0]!.mood),
                      }}
                      activeDot={{
                        r: 6,
                        fill: segmentStroke(chartPoints[0]!.mood, chartPoints[0]!.mood),
                      }}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
              <span>
                <span className="mr-1.5 text-red-500">🔴</span>
                Bad (1–2)
              </span>
              <span>
                <span className="mr-1.5 text-yellow-500">🟡</span>
                Moderate (3)
              </span>
              <span>
                <span className="mr-1.5 text-green-500">🟢</span>
                Good (4–5)
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
