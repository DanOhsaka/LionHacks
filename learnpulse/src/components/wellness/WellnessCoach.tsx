"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Wind, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { useSessionStore } from "@/stores/sessionStore";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export function WellnessCoach({ active }: { active: boolean }) {
  const wrongStreak = useSessionStore((s) => s.wrongStreak);
  const startedAt = useSessionStore((s) => s.startedAt);

  const [breakReminders, setBreakReminders] = useState(true);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showStreakCoach, setShowStreakCoach] = useState(false);

  useEffect(() => {
    if (!active) return;
    void fetch("/api/wellness")
      .then((r) => r.json())
      .then((d: { breakRemindersEnabled?: boolean }) => {
        if (typeof d.breakRemindersEnabled === "boolean") {
          setBreakReminders(d.breakRemindersEnabled);
        }
      })
      .catch(() => {});
  }, [active]);

  useEffect(() => {
    if (!active || !startedAt || !breakReminders) {
      if (!active) setShowBreathing(false);
      return;
    }
    const id = window.setInterval(() => {
      if (Date.now() - startedAt >= THREE_HOURS_MS) {
        setShowBreathing(true);
      }
    }, 20_000);
    return () => window.clearInterval(id);
  }, [active, startedAt, breakReminders]);

  useEffect(() => {
    if (wrongStreak >= 5) setShowStreakCoach(true);
    else setShowStreakCoach(false);
  }, [wrongStreak]);

  if (!active) return null;

  return (
    <AnimatePresence>
      {showBreathing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="pointer-events-auto fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-sky-500/40 bg-sky-950/95 p-4 text-sm text-sky-50 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <Wind className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
            <div>
              <p className="font-medium">Gentle break</p>
              <p className="mt-1 text-sky-100/90">
                You have been studying for a while. Try a 60s breathing reset: inhale 4s,
                hold 2s, exhale 6s.
              </p>
              <button
                type="button"
                className="mt-3 text-xs font-medium text-sky-200 underline"
                onClick={() => setShowBreathing(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
      {showStreakCoach && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="pointer-events-auto fixed bottom-6 left-6 z-50 max-w-sm rounded-2xl border border-amber-500/40 bg-amber-950/95 p-4 text-sm text-amber-50 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="font-medium">Coach nudge</p>
              <p className="mt-1 text-amber-100/90">
                Five tough misses in a row — pause, skim a key definition, then return with a
                fresh guess. Progress beats perfection.
              </p>
              <button
                type="button"
                className="mt-3 text-xs font-medium text-amber-200 underline"
                onClick={() => setShowStreakCoach(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
