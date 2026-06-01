import type { GameCheckpoint, GameMode } from "@/stores/sessionStore";

export type CheckpointRow = {
  id: string;
  chapter_index: number;
  chapter_title: string;
  position: number;
  question: string;
  options: unknown;
  correct_index: number;
  explanation: string;
};

const SESSION_CAPS: Record<GameMode, number> = {
  speed: 12,
  zen: 18,
  story: 15,
};

/** Fisher–Yates shuffle (new array). */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sessionQuestionCount(mode: GameMode, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total, SESSION_CAPS[mode]);
}

function rowToCheckpoint(row: CheckpointRow): GameCheckpoint {
  return {
    id: row.id,
    chapter_index: row.chapter_index,
    chapter_title: row.chapter_title,
    position: row.position,
    question: row.question,
    options: Array.isArray(row.options)
      ? (row.options as string[]).slice(0, 4)
      : ["A", "B", "C", "D"],
    correct_index: row.correct_index,
    explanation: row.explanation,
  };
}

/** Permute options so the correct answer is not always in the same slot. */
export function shuffleQuestionOptions(cp: GameCheckpoint): GameCheckpoint {
  const len = Math.min(4, cp.options.length);
  if (len <= 1) return cp;

  const order = shuffleArray(Array.from({ length: len }, (_, i) => i));
  const options = order.map((i) => cp.options[i] ?? "");
  const correct_index = order.indexOf(
    Math.min(Math.max(0, cp.correct_index), len - 1),
  );

  return { ...cp, options, correct_index };
}

/**
 * Pick a varied subset across chapters, shuffle order, and randomize option positions.
 */
function stratifiedSample(
  byChapter: Map<number, GameCheckpoint[]>,
  target: number,
): GameCheckpoint[] {
  const pools = Array.from(byChapter.values()).map((list) => shuffleArray(list));
  const selected: GameCheckpoint[] = [];

  while (selected.length < target && pools.some((p) => p.length > 0)) {
    for (const pool of pools) {
      if (selected.length >= target) break;
      const next = pool.pop();
      if (next) selected.push(next);
    }
  }

  return selected;
}

export function buildSessionCheckpoints(
  rows: CheckpointRow[],
  mode: GameMode,
): GameCheckpoint[] {
  const all = rows.map(rowToCheckpoint);
  if (all.length === 0) return [];

  const target = sessionQuestionCount(mode, all.length);
  const byChapter = new Map<number, GameCheckpoint[]>();
  for (const cp of all) {
    const ch = cp.chapter_index;
    if (!byChapter.has(ch)) byChapter.set(ch, []);
    byChapter.get(ch)!.push(cp);
  }

  const picked =
    target >= all.length
      ? shuffleArray(all)
      : shuffleArray(stratifiedSample(byChapter, target));

  return picked.map(shuffleQuestionOptions);
}
