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

type Log = { id: string; mood: number; notes: string | null; logged_at: string };

const INTRO_TEXT =
  "Hello fellow student, I'm Roomie. Welcome to LearnPulse. I'm here to help you navigate your mental health in order for you to have a smooth and fun study session. Tell me how you're feeling today.";

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
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading, introTyped, introDone]);

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
      <div className="mx-auto max-w-3xl">
        <p className="text-zinc-500">Loading wellness…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Wellness with Roomie</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Log how you feel, chat with Roomie, and see your mood trend.
        </p>
      </header>

      {/* Section 1 — Mood log */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Mood log</h2>
        <p className="mt-1 text-sm text-gray-500">Tap how you feel right now.</p>
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
                    ? "border-green-600 bg-green-50 text-green-900"
                    : "border-transparent bg-gray-50 text-gray-800 hover:border-green-200"
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
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-2xl"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            🦁
          </motion.div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Roomie</h2>
            <p className="text-sm text-gray-500">Your wellness coach</p>
          </div>
        </div>

        <div className="mt-6 flex max-h-[min(420px,50vh)] flex-col gap-3 overflow-y-auto rounded-xl bg-gray-50/80 p-4">
          {!introDone && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-green-100 px-4 py-3 text-sm text-green-900">
                {introTyped}
                {introTyped.length < INTRO_TEXT.length && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-green-700 align-middle" />
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
                      ? "rounded-bl-md bg-green-100 text-green-900"
                      : "rounded-br-md bg-gray-100 text-gray-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-green-100 px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-2 w-2 rounded-full bg-green-600"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
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
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none ring-green-500/30 placeholder:text-gray-400 focus:border-green-500 focus:ring-2"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !input.trim()}
              className="shrink-0 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
      </section>

      {/* Section 3 — Mood trend */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Mood trend</h2>
        <p className="mt-1 text-sm text-gray-500">Last 14 days (daily average when you log multiple times).</p>

        {chartPoints.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-600">
            No mood data yet. Log your first mood above!
          </p>
        ) : (
          <>
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={segmentRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
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
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#22c55e" }}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
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
