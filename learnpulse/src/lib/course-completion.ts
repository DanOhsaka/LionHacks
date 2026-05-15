import type { QuestionEvent } from "@/lib/session-analytics";

export function questionEventsFromMetadata(metadata: unknown): QuestionEvent[] {
  if (!metadata || typeof metadata !== "object") return [];
  const analytics = (metadata as { analytics?: unknown }).analytics;
  if (!analytics || typeof analytics !== "object") return [];
  const events = (analytics as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  return events.filter(
    (e): e is QuestionEvent =>
      !!e &&
      typeof e === "object" &&
      typeof (e as QuestionEvent).checkpoint_id === "string" &&
      (e as QuestionEvent).checkpoint_id.length > 0,
  );
}

type SessionRow = {
  metadata?: unknown;
  correct_count?: number | null;
  wrong_count?: number | null;
};

/**
 * Share of course checkpoints the learner has answered correctly at least once
 * (across all ended sessions). Monotonic with practice; not the same as session accuracy.
 */
export function courseMasteryPercent(
  totalCheckpoints: number,
  sessions: SessionRow[],
): number {
  if (totalCheckpoints <= 0) return 0;

  const mastered = new Set<string>();
  for (const s of sessions) {
    for (const e of questionEventsFromMetadata(s.metadata)) {
      if (e.outcome === "correct") mastered.add(e.checkpoint_id);
    }
  }

  if (mastered.size === 0) {
    /* Legacy sessions saved before per-question events — rough lower bound only. */
    let bestSessionPct = 0;
    for (const s of sessions) {
      const cc = Math.max(0, Math.round(Number(s.correct_count ?? 0)));
      const wc = Math.max(0, Math.round(Number(s.wrong_count ?? 0)));
      const answered = cc + wc;
      if (answered > 0) {
        bestSessionPct = Math.max(bestSessionPct, Math.round((cc / answered) * 100));
      }
    }
    return Math.min(100, bestSessionPct);
  }

  return Math.min(100, Math.round((mastered.size / totalCheckpoints) * 100));
}

/** Checkpoints touched at least once (any outcome), across all sessions. */
export function courseCoveragePercent(
  totalCheckpoints: number,
  sessions: SessionRow[],
): number {
  if (totalCheckpoints <= 0) return 0;

  const touched = new Set<string>();
  for (const s of sessions) {
    for (const e of questionEventsFromMetadata(s.metadata)) {
      touched.add(e.checkpoint_id);
    }
  }

  if (touched.size === 0) {
    let bestAnswered = 0;
    for (const s of sessions) {
      const cc = Math.max(0, Math.round(Number(s.correct_count ?? 0)));
      const wc = Math.max(0, Math.round(Number(s.wrong_count ?? 0)));
      bestAnswered = Math.max(bestAnswered, cc + wc);
    }
    return Math.min(100, Math.round((bestAnswered / totalCheckpoints) * 100));
  }

  return Math.min(100, Math.round((touched.size / totalCheckpoints) * 100));
}
