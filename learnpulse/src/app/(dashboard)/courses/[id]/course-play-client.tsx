"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { GameEngine } from "@/components/game/GameEngine";
import { WellnessCoach } from "@/components/wellness/WellnessCoach";
import type { GameCheckpoint, GameMode } from "@/stores/sessionStore";
import { useSessionStore } from "@/stores/sessionStore";

type Row = {
  id: string;
  chapter_index: number;
  chapter_title: string;
  position: number;
  question: string;
  options: unknown;
  correct_index: number;
  explanation: string;
};

function normalizeMode(raw: string | null): GameMode {
  if (raw === "speed" || raw === "zen" || raw === "story") return raw;
  return "zen";
}

function mapCheckpoints(rows: Row[]): GameCheckpoint[] {
  return rows.map((r) => ({
    id: r.id,
    chapter_index: r.chapter_index,
    chapter_title: r.chapter_title,
    position: r.position,
    question: r.question,
    options: Array.isArray(r.options)
      ? (r.options as string[]).slice(0, 4)
      : ["A", "B", "C", "D"],
    correct_index: r.correct_index,
    explanation: r.explanation,
  }));
}

export default function CoursePlayClient({
  courseId,
  rows,
}: {
  courseId: string;
  rows: Row[];
}) {
  const searchParams = useSearchParams();
  const mode = useMemo(
    () => normalizeMode(searchParams.get("mode")),
    [searchParams],
  );

  const checkpoints = useMemo(() => mapCheckpoints(rows), [rows]);
  const setSessionMeta = useSessionStore((s) => s.setSessionMeta);
  const resetGame = useSessionStore((s) => s.resetGame);

  const [mood, setMood] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"mood" | "play">("mood");

  const startSession = useCallback(async () => {
    if (mood == null) {
      toast.error("Pick a mood before you start");
      return;
    }
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, mode, mood }),
    });
    const data = (await res.json()) as { sessionId?: string; error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Could not start session");
      return;
    }
    if (!data.sessionId) {
      toast.error("No session id returned");
      return;
    }
    setSessionId(data.sessionId);
    setSessionMeta({
      sessionId: data.sessionId,
      courseId,
      mode,
      mood,
      checkpoints,
    });
    setPhase("play");
  }, [courseId, mode, mood, checkpoints, setSessionMeta]);

  if (checkpoints.length === 0) {
    return (
      <p className="text-center text-zinc-500">This course has no checkpoints yet.</p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {phase === "mood" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-medium text-white">How are you feeling?</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Quick mood check before this session (1 = low, 5 = great).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMood(n)}
                className={`h-11 w-11 rounded-full text-sm font-semibold transition ${
                  mood === n
                    ? "bg-emerald-500 text-emerald-950"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void startSession()}
            className="mt-6 w-full rounded-xl bg-emerald-500 py-3 text-sm font-medium text-emerald-950 hover:bg-emerald-400 sm:w-auto sm:px-10"
          >
            Begin session
          </button>
        </div>
      )}

      {phase === "play" && sessionId && (
        <>
          <GameEngine
            checkpoints={checkpoints}
            mode={mode}
            courseId={courseId}
            sessionId={sessionId}
          />
          <WellnessCoach active />
        </>
      )}

      {phase === "mood" && (
        <button
          type="button"
          className="text-sm text-zinc-500 hover:text-white"
          onClick={() => {
            resetGame();
            window.history.back();
          }}
        >
          ← Cancel
        </button>
      )}
    </div>
  );
}
