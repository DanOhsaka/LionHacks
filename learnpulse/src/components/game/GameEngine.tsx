"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { GameCheckpoint, GameMode } from "@/stores/sessionStore";
import { useSessionStore } from "@/stores/sessionStore";
import {
  computeDataQuality,
  rollupByChapter,
  structuredWhyMissed,
  weakCheckpointIds,
  type QuestionEvent,
  type SessionAnalyticsV1,
} from "@/lib/session-analytics";
import { notifyAchievementsStateChanged } from "@/lib/achievement-notifications";

import { SessionRecapPanel, type SessionRecapModel } from "./SessionRecapPanel";

const SPEED_SECONDS = 22;
const FEEDBACK_CORRECT_MS = 2000;
const FEEDBACK_WRONG_MS = 4200;
/**
 * Calm pace between 3 → 2 → 1 (must exceed enter + exit durations below).
 */
const SPEED_COUNTDOWN_STEP_MS = 1480;
/** “GO!” hold before the question timer starts. */
const SPEED_COUNTDOWN_GO_MS = 820;

export function GameEngine({
  checkpoints,
  mode,
  courseId,
  sessionId,
  courseTitle = "Course",
}: {
  checkpoints: GameCheckpoint[];
  mode: GameMode;
  courseId: string;
  sessionId: string;
  courseTitle?: string;
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
    navigateCheckpoint,
    appendQuestionEvent,
    incrementBrowseSkips,
    advanceNarrative,
    resetGame,
  } = useSessionStore();

  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "correct" | "wrong" | "done">("idle");
  const [secondsLeft, setSecondsLeft] = useState(SPEED_SECONDS);
  const [comebackEligible, setComebackEligible] = useState(false);
  const [final, setFinal] = useState<{ score: number; accuracy: number } | null>(null);
  const [recap, setRecap] = useState<SessionRecapModel | null>(null);
  const [speedCountdownPhase, setSpeedCountdownPhase] = useState<
    "3" | "2" | "1" | "go" | null
  >(() => (mode === "speed" ? "3" : null));

  const feedbackTimeoutRef = useRef<number | null>(null);
  const questionStartedAtRef = useRef(Date.now());

  const total = checkpoints.length;
  const cp = checkpoints[currentIndex];
  const chapterTitle = cp?.chapter_title ?? "";

  const basePoints = useMemo(() => {
    const mult = 1 + Math.min(combo, 8) * 0.12;
    return Math.round(100 * mult);
  }, [combo]);

  const cpId = cp?.id;
  useEffect(() => {
    if (phase !== "idle" || !cpId) return;
    /* Speed mode: do not start the per-question clock until after 3-2-1-GO. */
    if (mode === "speed" && speedCountdownPhase !== null) return;
    questionStartedAtRef.current = Date.now();
  }, [phase, currentIndex, cpId, mode, speedCountdownPhase]);

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

    const events = st.questionEvents as QuestionEvent[];
    const timeoutCount = events.filter((e) => e.outcome === "timeout").length;
    const chapterRollup = rollupByChapter(events);
    const weakIds = weakCheckpointIds(events);
    const dataQuality = computeDataQuality({
      durationSeconds,
      answeredCount: answered,
      browseSkips: st.browseSkips,
      checkpointTotal: st.checkpoints.length,
    });

    const analytics: SessionAnalyticsV1 = {
      version: 1,
      mode: st.mode ?? "zen",
      speed_seconds: st.mode === "speed" ? SPEED_SECONDS : null,
      events,
      browse_skips: st.browseSkips,
      chapter_rollup: chapterRollup,
      wrong_count: wc,
      timeout_count: timeoutCount,
      weak_checkpoint_ids: weakIds,
      data_quality: dataQuality,
    };

    const metadata: Record<string, unknown> = { analytics };
    if (comebackEligible && st.maxWrongStreak >= 5 && accuracy >= 60) {
      metadata.comeback_kid = true;
    }

    const displayAccuracy = answered === 0 ? 0 : Math.round((cc / answered) * 100);

    /* Persist before showing "done" / links so navigation cannot abort the save. */
    let saveOk = false;
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          session_id: sessionId,
          score: st.score,
          duration_seconds: durationSeconds,
          accuracy_pct: accuracy,
          correct_count: cc,
          wrong_count: wc,
          metadata,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
        hint?: string;
      };
      if (!res.ok) {
        const parts = [data.error, data.details, data.hint].filter(Boolean);
        toast.error(parts.join(" — ") || "Could not save session");
      } else {
        saveOk = true;
      }
    } catch {
      toast.error("Could not save session");
    }

    setFinal({
      score: st.score,
      accuracy: displayAccuracy,
    });
    setRecap({
      sessionId,
      courseId,
      courseTitle,
      score: st.score,
      accuracy: displayAccuracy,
      durationSeconds,
      analytics,
    });
    setPhase("done");

    if (saveOk) {
      try {
        const ar = await fetch("/api/achievements", {
          method: "POST",
          credentials: "same-origin",
        });
        if (ar.ok) {
          notifyAchievementsStateChanged();
        }
      } catch {
        /* achievements are optional */
      }
    }

    resetGame();
  }, [sessionId, resetGame, comebackEligible, courseTitle, courseId]);

  const goNextOrFinish = useCallback(() => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setSelected(null);
    const st = useSessionStore.getState();
    const idx = st.currentIndex;
    const len = st.checkpoints.length;
    const isLast = len === 0 || idx >= len - 1;
    if (isLast) {
      void finishSession();
    } else {
      nextQuestion();
      setPhase("idle");
    }
  }, [finishSession, nextQuestion]);

  const handleAnswerRef = useRef<
    (index: number, timedOut?: boolean) => Promise<void>
  >(async () => {});

  const handleAnswer = useCallback(
    async (index: number, timedOut = false) => {
      if (phase !== "idle" || !cp) return;
      if (mode === "speed" && speedCountdownPhase !== null) return;
      if (!timedOut && selected !== null) return;

      const isCorrect = !timedOut && index === cp.correct_index;
      setSelected(index === -1 ? null : index);

      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }

      const msSpent = Math.min(
        600_000,
        Math.max(0, Date.now() - questionStartedAtRef.current),
      );

      if (isCorrect) {
        setPhase("correct");
        recordCorrect(basePoints);
        if (maxWrongStreak >= 5) setComebackEligible(true);
        if (mode === "story") advanceNarrative();
        const stAfter = useSessionStore.getState();
        appendQuestionEvent({
          checkpoint_id: cp.id,
          chapter_title: cp.chapter_title,
          chapter_index: cp.chapter_index,
          outcome: "correct",
          ms_spent: msSpent,
          combo_after: stAfter.combo,
        });
        feedbackTimeoutRef.current = window.setTimeout(
          goNextOrFinish,
          FEEDBACK_CORRECT_MS,
        );
      } else {
        setPhase("wrong");
        recordWrong();
        const stAfter = useSessionStore.getState();
        appendQuestionEvent({
          checkpoint_id: cp.id,
          chapter_title: cp.chapter_title,
          chapter_index: cp.chapter_index,
          outcome: timedOut ? "timeout" : "wrong",
          ms_spent: msSpent,
          combo_after: stAfter.combo,
        });
        feedbackTimeoutRef.current = window.setTimeout(
          goNextOrFinish,
          FEEDBACK_WRONG_MS,
        );
      }
    },
    [
      phase,
      cp,
      selected,
      recordCorrect,
      recordWrong,
      appendQuestionEvent,
      basePoints,
      mode,
      advanceNarrative,
      goNextOrFinish,
      maxWrongStreak,
      speedCountdownPhase,
    ],
  );

  handleAnswerRef.current = handleAnswer;

  const onEdgeTap = useCallback(
    (side: "left" | "right") => {
      if (mode === "speed" && speedCountdownPhase !== null) return;
      if (phase === "done") return;
      if (phase === "correct" || phase === "wrong") {
        if (side === "right") goNextOrFinish();
        return;
      }
      if (phase !== "idle") return;
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
      if (side === "left" && currentIndex > 0) {
        incrementBrowseSkips();
        navigateCheckpoint(-1);
        setSelected(null);
      } else if (side === "right" && currentIndex < total - 1) {
        incrementBrowseSkips();
        navigateCheckpoint(1);
        setSelected(null);
      }
    },
    [
      phase,
      currentIndex,
      total,
      goNextOrFinish,
      navigateCheckpoint,
      incrementBrowseSkips,
      mode,
      speedCountdownPhase,
    ],
  );

  useEffect(() => {
    if (mode !== "speed") {
      setSpeedCountdownPhase(null);
      return;
    }
    let cancelled = false;
    setSpeedCountdownPhase("3");
    const s = SPEED_COUNTDOWN_STEP_MS;
    const t1 = window.setTimeout(() => {
      if (!cancelled) setSpeedCountdownPhase("2");
    }, s);
    const t2 = window.setTimeout(() => {
      if (!cancelled) setSpeedCountdownPhase("1");
    }, s * 2);
    const t3 = window.setTimeout(() => {
      if (!cancelled) setSpeedCountdownPhase("go");
    }, s * 3);
    const t4 = window.setTimeout(() => {
      if (!cancelled) setSpeedCountdownPhase(null);
    }, s * 3 + SPEED_COUNTDOWN_GO_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [mode, sessionId]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "speed" || phase !== "idle" || !cp || speedCountdownPhase !== null) return;
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
  }, [mode, phase, cp, currentIndex, speedCountdownPhase]);

  if (phase === "done" && final && recap) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-2xl rounded-2xl border border-emerald-500/30 bg-zinc-900/50 p-6 sm:p-8"
      >
        <h2 className="text-center text-2xl font-semibold text-white">Session complete</h2>
        <p className="mt-1 text-center text-sm text-emerald-200/90">
          Score {final.score} · {final.accuracy}% accuracy
        </p>
        <SessionRecapPanel recap={recap} />
      </motion.div>
    );
  }

  if (phase === "done" && final) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
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

  const correctLetter = String.fromCharCode(65 + cp.correct_index);
  const correctText = cp.options[cp.correct_index] ?? "";
  const isTimeoutWrong = phase === "wrong" && selected === null;
  const pickedLabel =
    selected != null && cp.options[selected] != null
      ? `${String.fromCharCode(65 + selected)}. ${cp.options[selected]}`
      : null;
  const why = structuredWhyMissed(
    isTimeoutWrong
      ? "The timer ran out — next pass, eliminate one unlikely option early."
      : cp.explanation,
    pickedLabel,
  );

  const modeChromeClass =
    mode === "speed" ? "mode-chrome-speed" : mode === "story" ? "mode-chrome-story" : "mode-chrome-zen";

  const showStepDots = total > 0 && total <= 56 && phase !== "done";

  return (
    <div
      className={`relative mx-auto w-full min-w-0 max-w-2xl space-y-4 px-1 pb-24 sm:space-y-6 sm:p-1 sm:pb-8 ${modeChromeClass}`}
    >
      {mode === "speed" && speedCountdownPhase !== null && (
        <div
          className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm"
          aria-live="polite"
          aria-label="Speed mode starting"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={speedCountdownPhase}
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.97,
                y: -12,
                transition: { duration: 0.44, ease: [0.33, 1, 0.68, 1] },
              }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              className={`select-none font-black tabular-nums tracking-tight text-white drop-shadow-[0_0_40px_rgba(52,211,153,0.35)] will-change-transform ${
                speedCountdownPhase === "go"
                  ? "text-[min(22vw,7rem)] sm:text-[7rem]"
                  : "text-[min(26vw,9rem)] sm:text-[9rem]"
              }`}
            >
              {speedCountdownPhase === "go" ? "GO!" : speedCountdownPhase}
            </motion.span>
          </AnimatePresence>
        </div>
      )}
      <div className="relative z-[15] flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/50 px-3 py-2 text-xs backdrop-blur-sm">
        <span className="font-semibold uppercase tracking-[0.14em] text-app-muted">
          {mode === "speed" ? "Speed" : mode === "story" ? "Story" : "Zen"}
        </span>
        {mode === "speed" && (
          <span className="text-amber-200/90">{SPEED_SECONDS}s per question</span>
        )}
        {mode === "zen" && <span className="text-cyan-200/85">No timer</span>}
        {mode === "story" && (
          <span className="max-w-[min(100%,14rem)] truncate text-violet-200/90">
            {chapterTitle || "Chapters unlock as you learn"}
          </span>
        )}
      </div>
      {showStepDots && (
        <div
          className="relative z-10 flex flex-wrap justify-center gap-1 px-1"
          aria-hidden
        >
          {checkpoints.map((c, i) => (
            <span
              key={c.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-6 bg-emerald-400"
                  : i < currentIndex
                    ? "w-1.5 bg-emerald-500/40"
                    : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label="Previous question"
        data-no-button-scale
        className="absolute bottom-0 left-0 top-0 z-20 w-10 cursor-pointer border-0 bg-transparent p-0 sm:w-[clamp(2.5rem,12vw,5rem)]"
        onClick={() => onEdgeTap("left")}
      />
      <button
        type="button"
        aria-label="Next question or continue"
        data-no-button-scale
        className="absolute bottom-0 right-0 top-0 z-20 w-10 cursor-pointer border-0 bg-transparent p-0 sm:w-[clamp(2.5rem,12vw,5rem)]"
        onClick={() => onEdgeTap("right")}
      />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 text-sm text-app-muted">
        <span>
          Question {Math.min(currentIndex + 1, total)} / {total}
        </span>
        <span className="text-emerald-300">Score {score}</span>
        {mode === "speed" && phase === "idle" && speedCountdownPhase === null && (
          <span
            className={`font-mono ${secondsLeft <= 5 ? "text-amber-400" : "text-zinc-300"}`}
          >
            {secondsLeft}s
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {mode === "story" && phase === "correct" && (
          <motion.p
            key={`nar-${narrativeBeat}`}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100"
          >
            Next chapter: <strong>{chapterTitle}</strong> — the path opens as you learn.
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div
        key={cp.id}
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-xl sm:p-6"
      >
        <p className="text-lg font-medium leading-relaxed text-white">{cp.question}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {cp.options.map((opt, i) => {
            const isSel = selected === i;
            const showCorrectHighlight =
              phase === "correct" && i === cp.correct_index;
            const showWrong = phase === "wrong" && isSel && i !== cp.correct_index;
            const fadedWrongPhase = phase === "wrong" && !showWrong;
            return (
              <motion.button
                key={i}
                type="button"
                disabled={phase !== "idle" || (mode === "speed" && speedCountdownPhase !== null)}
                onClick={() => void handleAnswer(i)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  showCorrectHighlight
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-50"
                    : showWrong
                      ? "border-rose-500/60 bg-rose-500/15 text-rose-100"
                      : fadedWrongPhase
                        ? "border-zinc-800/80 bg-zinc-950/30 text-zinc-500"
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
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[5] flex items-center justify-center"
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
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 space-y-3"
          >
            <div className="rounded-xl border border-zinc-600/80 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-100">
              <p className="font-medium text-zinc-200">Correct answer</p>
              <p className="mt-1 text-base text-white">
                {correctLetter}. {correctText}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Why this tripped you up
              </p>
              <p className="mt-2 leading-relaxed text-zinc-200">{why.summary}</p>
              {why.concept && (
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  <span className="font-medium text-zinc-500">Deeper note: </span>
                  {why.concept}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {combo > 1 && phase === "idle" && (
        <p className="relative z-10 text-center text-xs font-medium uppercase tracking-wide text-amber-300">
          {combo}x combo — next correct worth more
        </p>
      )}
    </div>
  );
}
