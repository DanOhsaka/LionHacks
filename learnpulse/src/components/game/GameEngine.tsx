"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { GameCheckpoint, GameMode } from "@/stores/sessionStore";
import { useSessionStore } from "@/stores/sessionStore";

const SPEED_SECONDS = 22;

async function enrichWrongExplanation(
  question: string,
  materialExplanation: string,
) {
  try {
    const res = await fetch("/api/gemini/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, explanation: materialExplanation }),
    });
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok) return materialExplanation;
    return data.text?.trim() || materialExplanation;
  } catch {
    return materialExplanation;
  }
}

export function GameEngine({
  checkpoints,
  mode,
  courseId,
  sessionId,
}: {
  checkpoints: GameCheckpoint[];
  mode: GameMode;
  courseId: string;
  sessionId: string;
}) {
  const {
    currentIndex,
    score,
    combo,
    maxWrongStreak,
    narrativeBeat,
    recordCorrect,
    recordWrong,
    nextQuestion,
    advanceNarrative,
    resetGame,
  } = useSessionStore();

  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "correct" | "wrong" | "done">("idle");
  const [extraExplanation, setExtraExplanation] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SPEED_SECONDS);
  const [comebackEligible, setComebackEligible] = useState(false);
  const [final, setFinal] = useState<{ score: number; accuracy: number } | null>(null);

  const total = checkpoints.length;
  const cp = checkpoints[currentIndex];
  const chapterTitle = cp?.chapter_title ?? "";

  const basePoints = useMemo(() => {
    const mult = 1 + Math.min(combo, 8) * 0.12;
    return Math.round(100 * mult);
  }, [combo]);

  const finishSession = useCallback(async () => {
    const st = useSessionStore.getState();
    const start = st.startedAt ?? Date.now();
    const durationMs = Date.now() - start;
    const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
    const cc = st.correctCount;
    const wc = st.wrongCount;
    const answered = cc + wc;
    const accuracy =
      answered === 0 ? 0 : Math.round((cc / answered) * 1000) / 10;

    const metadata: Record<string, unknown> = {};
    if (comebackEligible && st.maxWrongStreak >= 5 && accuracy >= 60) {
      metadata.comeback_kid = true;
    }

    setFinal({
      score: st.score,
      accuracy: answered === 0 ? 0 : Math.round((cc / answered) * 100),
    });
    setPhase("done");

    try {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          score: st.score,
          duration_seconds: durationSeconds,
          accuracy_pct: accuracy,
          correct_count: cc,
          metadata,
        }),
      });
      await fetch("/api/achievements", { method: "POST" });
    } catch {
      toast.error("Could not save session");
    }

    resetGame();
  }, [sessionId, resetGame, comebackEligible]);

  const handleAnswerRef = useRef<
    (index: number, timedOut?: boolean) => Promise<void>
  >(async () => {});

  const handleAnswer = useCallback(
    async (index: number, timedOut = false) => {
      if (phase !== "idle" || !cp) return;
      if (!timedOut && selected !== null) return;

      const isCorrect = !timedOut && index === cp.correct_index;
      setSelected(index === -1 ? null : index);

      const isLast = currentIndex >= total - 1;

      const goNextOrFinish = () => {
        setSelected(null);
        setExtraExplanation(null);
        if (isLast) {
          void finishSession();
        } else {
          nextQuestion();
          setPhase("idle");
        }
      };

      if (isCorrect) {
        setPhase("correct");
        recordCorrect(basePoints);
        if (maxWrongStreak >= 5) setComebackEligible(true);
        if (mode === "story") advanceNarrative();
        setTimeout(goNextOrFinish, 900);
      } else {
        setPhase("wrong");
        recordWrong();
        const base = cp.explanation || "Review the material and try again.";
        const enriched = await enrichWrongExplanation(cp.question, base);
        setExtraExplanation(enriched);
        setTimeout(goNextOrFinish, 2200);
      }
    },
    [
      phase,
      cp,
      selected,
      recordCorrect,
      recordWrong,
      basePoints,
      mode,
      advanceNarrative,
      currentIndex,
      total,
      nextQuestion,
      finishSession,
      maxWrongStreak,
    ],
  );

  handleAnswerRef.current = handleAnswer;

  useEffect(() => {
    if (mode !== "speed" || phase !== "idle" || !cp) return;
    let ticks = SPEED_SECONDS;
    setSecondsLeft(ticks);
    let cancelled = false;
    const id = window.setInterval(() => {
      ticks -= 1;
      setSecondsLeft(ticks);
      if (ticks <= 0) {
        window.clearInterval(id);
        if (!cancelled) void handleAnswerRef.current(-1, true);
      }
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mode, phase, cp, currentIndex]);

  if (phase === "done" && final) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center"
      >
        <h2 className="text-2xl font-semibold text-white">Session complete</h2>
        <p className="mt-2 text-emerald-200/90">Final score: {final.score}</p>
        <p className="mt-1 text-sm text-zinc-400">Accuracy: {final.accuracy}%</p>
        <a
          href={`/courses/${courseId}`}
          className="mt-6 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900"
        >
          Back to course
        </a>
      </motion.div>
    );
  }

  if (!cp) {
    return (
      <p className="text-center text-zinc-500">
        No questions for this course yet.
      </p>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
        <span>
          Question {Math.min(currentIndex + 1, total)} / {total}
        </span>
        <span className="text-emerald-300">Score {score}</span>
        {mode === "speed" && phase === "idle" && (
          <span
            className={`font-mono ${secondsLeft <= 5 ? "text-amber-400" : "text-zinc-300"}`}
          >
            {secondsLeft}s
          </span>
        )}
        {mode === "zen" && <span className="text-zinc-500">Zen — no timer</span>}
        {mode === "story" && (
          <span className="text-violet-300">Story mode — chapters unlock</span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {mode === "story" && phase === "correct" && (
          <motion.p
            key={`nar-${narrativeBeat}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100"
          >
            Next chapter: <strong>{chapterTitle}</strong> — the path opens as you learn.
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div
        key={cp.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl"
      >
        <p className="text-lg font-medium leading-relaxed text-white">{cp.question}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {cp.options.map((opt, i) => {
            const isSel = selected === i;
            const showCorrect = phase !== "idle" && i === cp.correct_index;
            const showWrong = phase === "wrong" && isSel && i !== cp.correct_index;
            return (
              <motion.button
                key={i}
                type="button"
                disabled={phase !== "idle"}
                onClick={() => void handleAnswer(i)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  showCorrect
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-50"
                    : showWrong
                      ? "border-rose-500/60 bg-rose-500/15 text-rose-100"
                      : "border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:border-emerald-500/40"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span className="font-mono text-xs text-zinc-500">
                  {String.fromCharCode(65 + i)}.
                </span>{" "}
                {opt}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {phase === "correct" && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 flex items-center justify-center"
          >
            <motion.div
              className="h-40 w-40 rounded-full bg-emerald-400/30 blur-2xl"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0] }}
              transition={{ duration: 0.7 }}
            />
          </motion.div>
        )}
        {phase === "wrong" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-50"
          >
            <p className="font-medium">Let us unpack that</p>
            <p className="mt-1 text-rose-100/90">{extraExplanation ?? cp.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {combo > 1 && phase === "idle" && (
        <p className="text-center text-xs font-medium uppercase tracking-wide text-amber-300">
          {combo}x combo — next correct worth more
        </p>
      )}
    </div>
  );
}
