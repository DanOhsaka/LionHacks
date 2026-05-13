export type QuestionOutcome = "correct" | "wrong" | "timeout";

export interface QuestionEvent {
  checkpoint_id: string;
  chapter_title: string;
  chapter_index: number;
  outcome: QuestionOutcome;
  ms_spent: number;
  combo_after: number;
}

export interface ChapterRollup {
  chapter_title: string;
  chapter_index: number;
  correct: number;
  wrong: number;
  timeout: number;
  total_ms: number;
  attempts: number;
}

export type DataQualityFlag = "ok" | "short_session" | "no_answers" | "high_browse_ratio";

export interface DataQuality {
  flag: DataQualityFlag;
  reasons: string[];
}

export interface SessionAnalyticsV1 {
  version: 1;
  mode: string;
  speed_seconds: number | null;
  events: QuestionEvent[];
  browse_skips: number;
  chapter_rollup: ChapterRollup[];
  wrong_count: number;
  timeout_count: number;
  weak_checkpoint_ids: string[];
  data_quality: DataQuality;
}

export function rollupByChapter(events: QuestionEvent[]): ChapterRollup[] {
  const map = new Map<string, ChapterRollup>();
  for (const e of events) {
    const key = `${e.chapter_index}:${e.chapter_title}`;
    const cur =
      map.get(key) ??
      ({
        chapter_title: e.chapter_title,
        chapter_index: e.chapter_index,
        correct: 0,
        wrong: 0,
        timeout: 0,
        total_ms: 0,
        attempts: 0,
      } satisfies ChapterRollup);
    cur.attempts += 1;
    cur.total_ms += e.ms_spent;
    if (e.outcome === "correct") cur.correct += 1;
    else if (e.outcome === "timeout") cur.timeout += 1;
    else cur.wrong += 1;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.chapter_index - b.chapter_index);
}

export function weakCheckpointIds(events: QuestionEvent[], limit = 8): string[] {
  const wrongs = events.filter((e) => e.outcome === "wrong" || e.outcome === "timeout");
  const freq = new Map<string, number>();
  for (const e of wrongs) {
    freq.set(e.checkpoint_id, (freq.get(e.checkpoint_id) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

export function computeDataQuality(input: {
  durationSeconds: number;
  answeredCount: number;
  browseSkips: number;
  checkpointTotal: number;
}): DataQuality {
  const reasons: string[] = [];
  let flag: DataQualityFlag = "ok";

  if (input.answeredCount === 0) {
    flag = "no_answers";
    reasons.push("No scored answers were recorded for this session.");
  } else if (input.durationSeconds > 0 && input.durationSeconds < 25 && input.answeredCount >= 4) {
    flag = "short_session";
    reasons.push("Session ended very quickly relative to questions answered.");
  }

  const denom = Math.max(input.checkpointTotal, 1);
  if (input.browseSkips / denom > 0.45 && input.answeredCount < denom * 0.35) {
    flag = "high_browse_ratio";
    reasons.push("Many edge navigations without answers — stats may not reflect mastery.");
  }

  return { flag, reasons };
}

export function spacedRepetitionHints(rollup: ChapterRollup[]): string[] {
  const hints: string[] = [];
  for (const c of rollup) {
    const miss = c.wrong + c.timeout;
    if (miss === 0) continue;
    const rate = miss / Math.max(c.attempts, 1);
    if (rate >= 0.35 || miss >= 2) {
      hints.push(
        `Revisit “${c.chapter_title || "this section"}” within 24–48h — ${miss} miss(es) at ${Math.round(rate * 100)}% error rate.`,
      );
    }
  }
  return hints.slice(0, 4);
}

export function structuredWhyMissed(explanation: string, pickedLabel: string | null): {
  summary: string;
  concept: string | null;
} {
  const trimmed = explanation.trim();
  if (!trimmed) {
    return {
      summary: pickedLabel
        ? `You chose ${pickedLabel}. Compare with the correct option and the key idea in your notes.`
        : "Time ran out — try skimming the unit once, then retry this deck.",
      concept: null,
    };
  }
  const parts = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = parts[0] ?? trimmed;
  const concept = parts.length > 1 ? parts.slice(1, 3).join(" ") : null;
  return { summary, concept };
}

export function exportSessionsJson(
  sessions: Record<string, unknown>[],
): string {
  return JSON.stringify(sessions, null, 2);
}

export function exportSessionsCsv(sessions: Record<string, unknown>[]): string {
  const headers = [
    "id",
    "started_at",
    "ended_at",
    "course_id",
    "mode",
    "score",
    "accuracy_pct",
    "duration_seconds",
    "correct_count",
    "data_quality_flag",
  ];
  const rows = sessions.map((s) => {
    const meta = s.metadata as { analytics?: { data_quality?: { flag?: string } } } | undefined;
    const flag = meta?.analytics?.data_quality?.flag ?? "";
    return [
      s.id,
      s.started_at,
      s.ended_at ?? "",
      s.course_id ?? "",
      s.mode ?? "",
      s.score ?? "",
      s.accuracy_pct ?? "",
      s.duration_seconds ?? "",
      s.correct_count ?? "",
      flag,
    ]
      .map((cell) => {
        const t = String(cell);
        if (t.includes(",") || t.includes('"')) return `"${t.replace(/"/g, '""')}"`;
        return t;
      })
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

const MAX_PERSISTED_EVENTS = 800;

function deepStripNullBytesAndTruncate(v: unknown, maxStr = 8000): unknown {
  if (typeof v === "string") {
    return v.replace(/\u0000/g, "").slice(0, maxStr);
  }
  if (Array.isArray(v)) {
    return v.map((x) => deepStripNullBytesAndTruncate(x, maxStr));
  }
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = deepStripNullBytesAndTruncate(val, maxStr);
    }
    return out;
  }
  return v;
}

/**
 * Deep-clone session metadata for Postgres jsonb: removes null bytes (common in PDF
 * extraction), caps huge event lists, and drops per-question events when chapter rollup
 * is already present (smaller payload, same rollup for module_stats).
 */
export function prepareSessionMetadataForPersistence(
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  let cloned: Record<string, unknown>;
  try {
    cloned = JSON.parse(JSON.stringify(incoming)) as Record<string, unknown>;
  } catch {
    return {};
  }
  const analytics = cloned.analytics;
  if (analytics && typeof analytics === "object") {
    const a = analytics as {
      chapter_rollup?: ChapterRollup[];
      events?: unknown[];
    };
    if (Array.isArray(a.chapter_rollup) && a.chapter_rollup.length > 0 && Array.isArray(a.events)) {
      delete a.events;
    } else if (Array.isArray(a.events) && a.events.length > MAX_PERSISTED_EVENTS) {
      a.events = a.events.slice(-MAX_PERSISTED_EVENTS);
    }
  }
  return deepStripNullBytesAndTruncate(cloned) as Record<string, unknown>;
}

/** First-seen vs repeat attempts for checkpoint ids from prior sessions + current. */
export function retentionSnapshot(
  priorEvents: { checkpoint_id: string; outcome: QuestionOutcome }[],
  currentEvents: QuestionEvent[],
): { checkpoint_id: string; first_try_correct: boolean; repeat_attempts: number }[] {
  const seenWrong = new Set<string>();
  for (const e of priorEvents) {
    if (e.outcome !== "correct") seenWrong.add(e.checkpoint_id);
  }
  const byCp = new Map<string, QuestionEvent[]>();
  for (const e of currentEvents) {
    const arr = byCp.get(e.checkpoint_id) ?? [];
    arr.push(e);
    byCp.set(e.checkpoint_id, arr);
  }
  const out: {
    checkpoint_id: string;
    first_try_correct: boolean;
    repeat_attempts: number;
  }[] = [];
  for (const [id, list] of Array.from(byCp.entries())) {
    const wasWeak = seenWrong.has(id);
    const first = list[0];
    if (!first) continue;
    out.push({
      checkpoint_id: id,
      first_try_correct: first.outcome === "correct",
      repeat_attempts: wasWeak ? list.length : 0,
    });
  }
  return out;
}

export function extractEventsFromSessionMetadata(
  metadata: unknown,
): QuestionEvent[] {
  if (!metadata || typeof metadata !== "object") return [];
  const a = (metadata as { analytics?: { events?: QuestionEvent[] } }).analytics;
  if (!a?.events || !Array.isArray(a.events)) return [];
  return a.events.filter(
    (e) =>
      e &&
      typeof e.checkpoint_id === "string" &&
      typeof e.outcome === "string",
  ) as QuestionEvent[];
}
