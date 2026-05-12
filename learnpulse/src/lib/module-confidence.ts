import type { ChapterRollup, QuestionEvent } from "@/lib/session-analytics";
import { rollupByChapter } from "@/lib/session-analytics";

/** Per chapter_index (string key): cumulative assessment outcomes */
export type ModuleStatsRow = {
  correct: number;
  wrong: number;
  timeout: number;
};

export type ModuleStats = Record<string, ModuleStatsRow>;

export function normalizeModuleStats(raw: unknown): ModuleStats {
  if (!raw || typeof raw !== "object") return {};
  const out: ModuleStats = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    out[k] = {
      correct: Math.max(0, Math.round(Number(o.correct) || 0)),
      wrong: Math.max(0, Math.round(Number(o.wrong) || 0)),
      timeout: Math.max(0, Math.round(Number(o.timeout) || 0)),
    };
  }
  return out;
}

export function mergeRollupIntoModuleStats(
  prev: ModuleStats,
  rollup: ChapterRollup[],
): ModuleStats {
  const out: ModuleStats = { ...prev };
  for (const r of rollup) {
    const k = String(r.chapter_index);
    const cur: ModuleStatsRow = out[k] ?? { correct: 0, wrong: 0, timeout: 0 };
    cur.correct += r.correct;
    cur.wrong += r.wrong;
    cur.timeout += r.timeout;
    out[k] = cur;
  }
  return out;
}

export function chapterRollupFromMetadata(metadata: unknown): ChapterRollup[] | null {
  if (!metadata || typeof metadata !== "object") return null;
  const analytics = (metadata as { analytics?: unknown }).analytics;
  if (!analytics || typeof analytics !== "object") return null;
  const a = analytics as {
    chapter_rollup?: ChapterRollup[];
    events?: QuestionEvent[];
  };
  if (Array.isArray(a.chapter_rollup) && a.chapter_rollup.length > 0) {
    return a.chapter_rollup;
  }
  if (Array.isArray(a.events) && a.events.length > 0) {
    return rollupByChapter(a.events as QuestionEvent[]);
  }
  return null;
}

/** Confidence = % correct of all scored attempts in this module (0–100). */
export function moduleConfidencePercent(
  stats: ModuleStats,
  chapterIndex: number,
): number | null {
  const row = stats[String(chapterIndex)];
  if (!row) return null;
  const total = row.correct + row.wrong + row.timeout;
  if (total <= 0) return null;
  return Math.round((100 * row.correct) / total);
}
