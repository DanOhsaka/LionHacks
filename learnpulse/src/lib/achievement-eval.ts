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
  completedSessions: number;
  modeSpeedSessions: number;
  modeZenSessions: number;
  modeStorySessions: number;
  highAccuracySessions: number;
  quickThinkerSessions: number;
  averageAccuracy: number;
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
  const completed = sessions.filter((s) => s.ended_at != null);
  const completedSessions = completed.length;
  const modeSpeedSessions = completed.filter((s) => s.mode === "speed").length;
  const modeZenSessions = completed.filter((s) => s.mode === "zen").length;
  const modeStorySessions = completed.filter((s) => s.mode === "story").length;
  const highAccuracySessions = completed.filter((s) => Number(s.accuracy_pct ?? 0) >= 90).length;
  const quickThinkerSessions = completed.filter(
    (s) =>
      Number(s.duration_seconds ?? 0) > 0 &&
      Number(s.duration_seconds ?? 0) <= 300 &&
      Number(s.accuracy_pct ?? 0) >= 80,
  ).length;
  const accRows = completed
    .map((s) => Number(s.accuracy_pct ?? 0))
    .filter((x) => !Number.isNaN(x) && x > 0);
  const averageAccuracy =
    accRows.length === 0
      ? 0
      : accRows.reduce((a, b) => a + b, 0) / accRows.length;

  return {
    totalCorrect,
    courseCount: courses.length,
    distinctSubjects: subjects.size,
    maxScore,
    maxDuration,
    hasCompletionist,
    completedSessions,
    modeSpeedSessions,
    modeZenSessions,
    modeStorySessions,
    highAccuracySessions,
    quickThinkerSessions,
    averageAccuracy,
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

  if (stats.completedSessions >= 1) keys.push("first_steps");
  if (stats.completedSessions >= 5) keys.push("quiz_starter");
  if (stats.completedSessions >= 25) keys.push("practice_habit");
  if (stats.completedSessions >= 50) keys.push("focus_marathon");
  if (hasPerfectRound(stats.sessions)) keys.push("perfect_round");
  if (hasChapterChampion(stats.sessions)) keys.push("chapter_champion");
  if (stats.highAccuracySessions >= 1) keys.push("accuracy_ace");
  if (stats.averageAccuracy >= 80 && stats.completedSessions >= 10) {
    keys.push("consistency_star");
  }
  if (stats.quickThinkerSessions >= 1) keys.push("quick_thinker");
  if (stats.modeSpeedSessions >= 5) keys.push("speed_runner");
  if (stats.modeZenSessions >= 10) keys.push("zen_master");
  if (stats.modeStorySessions >= 10) keys.push("story_weaver");
  if (stats.sessions.some(isNightOwlSession)) keys.push("night_owl");
  if (stats.distinctSubjects >= 5) keys.push("jack_of_all_trades");
  if (stats.hasCompletionist) keys.push("the_completionist");
  if (stats.totalCorrect >= 100) keys.push("century_scholar");
  if (stats.totalCorrect >= 200) keys.push("double_century");
  if (stats.maxScore >= 1000) keys.push("thousand_strong");
  if (stats.maxScore >= 2000) keys.push("legend_score");
  if (stats.maxDuration >= 10800) keys.push("endurance_mode");
  if (stats.courseCount >= 10) keys.push("polymath");
  if (stats.courseCount >= 20) keys.push("grand_polymath");
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
    case "quiz_starter":
      return { current: Math.min(stats.completedSessions, 5), target: 5 };
    case "practice_habit":
      return { current: Math.min(stats.completedSessions, 25), target: 25 };
    case "focus_marathon":
      return { current: Math.min(stats.completedSessions, 50), target: 50 };
    case "speed_runner":
      return { current: Math.min(stats.modeSpeedSessions, 5), target: 5 };
    case "zen_master":
      return { current: Math.min(stats.modeZenSessions, 10), target: 10 };
    case "story_weaver":
      return { current: Math.min(stats.modeStorySessions, 10), target: 10 };
    case "consistency_star":
      return {
        current: Math.min(Math.round(stats.averageAccuracy), 80),
        target: 80,
      };
    case "century_scholar":
      return { current: Math.min(stats.totalCorrect, 100), target: 100 };
    case "double_century":
      return { current: Math.min(stats.totalCorrect, 200), target: 200 };
    case "jack_of_all_trades":
      return { current: Math.min(stats.distinctSubjects, 5), target: 5 };
    case "polymath":
      return { current: Math.min(stats.courseCount, 10), target: 10 };
    case "grand_polymath":
      return { current: Math.min(stats.courseCount, 20), target: 20 };
    case "thousand_strong":
      return { current: Math.min(stats.maxScore, 1000), target: 1000 };
    case "legend_score":
      return { current: Math.min(stats.maxScore, 2000), target: 2000 };
    case "endurance_mode":
      return { current: Math.min(stats.maxDuration, 10800), target: 10800 };
    default:
      return null;
  }
}
