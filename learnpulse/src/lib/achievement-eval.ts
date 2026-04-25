import type { AchievementKey } from "@/lib/achievements";

export interface SessionRow {
  id: string;
  mode: string;
  score: number | null;
  accuracy_pct: number | null;
  duration_seconds: number | null;
  correct_count: number | null;
  checkpoints_total: number | null;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface UserStats {
  totalCorrect: number;
  courseCount: number;
  distinctSubjects: number;
  maxScore: number;
  maxDuration: number;
  hasCompletionist: boolean;
  sessions: SessionRow[];
}

export function aggregateStats(
  sessions: SessionRow[],
  courses: { subject: string; completion_percent: number | null }[],
): UserStats {
  const totalCorrect = sessions.reduce(
    (a, s) => a + (s.correct_count != null ? Number(s.correct_count) : 0),
    0,
  );
  const maxScore = Math.max(0, ...sessions.map((s) => Number(s.score ?? 0)));
  const maxDuration = Math.max(0, ...sessions.map((s) => Number(s.duration_seconds ?? 0)));
  const subjects = new Set(courses.map((c) => c.subject || "General"));
  const hasCompletionist = courses.some((c) => Number(c.completion_percent ?? 0) >= 100);

  return {
    totalCorrect,
    courseCount: courses.length,
    distinctSubjects: subjects.size,
    maxScore,
    maxDuration,
    hasCompletionist,
    sessions,
  };
}

function hourUTC(iso: string) {
  return new Date(iso).getUTCHours();
}

function isNightOwlSession(s: SessionRow) {
  if (!s.ended_at && !s.started_at) return false;
  const t = s.started_at;
  const h = hourUTC(t);
  return h >= 23 || h < 5;
}

function hasPerfectRound(sessions: SessionRow[]) {
  return sessions.some(
    (s) =>
      s.ended_at != null &&
      Number(s.accuracy_pct ?? 0) >= 99.5 &&
      Number(s.correct_count ?? 0) >= 5,
  );
}

function hasChapterChampion(sessions: SessionRow[]) {
  return sessions.some(
    (s) =>
      s.ended_at != null &&
      Number(s.accuracy_pct ?? 0) >= 99.5 &&
      Number(s.correct_count ?? 0) >= 8,
  );
}

export function evaluateUnlocks(stats: UserStats): AchievementKey[] {
  const keys: AchievementKey[] = [];

  if (hasPerfectRound(stats.sessions)) keys.push("perfect_round");
  if (hasChapterChampion(stats.sessions)) keys.push("chapter_champion");
  if (stats.sessions.some(isNightOwlSession)) keys.push("night_owl");
  if (stats.distinctSubjects >= 5) keys.push("jack_of_all_trades");
  if (stats.hasCompletionist) keys.push("the_completionist");
  if (stats.totalCorrect >= 100) keys.push("century_scholar");
  if (stats.maxScore >= 1000) keys.push("thousand_strong");
  if (stats.maxDuration >= 10800) keys.push("endurance_mode");
  if (stats.courseCount >= 10) keys.push("polymath");
  if (
    stats.sessions.some(
      (s) => s.metadata && (s.metadata as { comeback_kid?: boolean }).comeback_kid === true,
    )
  ) {
    keys.push("comeback_kid");
  }

  return Array.from(new Set(keys));
}

export function progressFor(
  key: AchievementKey,
  stats: UserStats,
): { current: number; target: number } | null {
  switch (key) {
    case "century_scholar":
      return { current: Math.min(stats.totalCorrect, 100), target: 100 };
    case "jack_of_all_trades":
      return { current: Math.min(stats.distinctSubjects, 5), target: 5 };
    case "polymath":
      return { current: Math.min(stats.courseCount, 10), target: 10 };
    case "thousand_strong":
      return { current: Math.min(stats.maxScore, 1000), target: 1000 };
    case "endurance_mode":
      return { current: Math.min(stats.maxDuration, 10800), target: 10800 };
    default:
      return null;
  }
}
