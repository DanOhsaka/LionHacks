/** Consecutive calendar days (UTC) with at least one ended session */
export function computeStudyStreakUtc(
  sessionDates: { ended_at: string | null }[],
): number {
  const days = new Set<string>();
  for (const s of sessionDates) {
    if (!s.ended_at) continue;
    const d = new Date(s.ended_at);
    const key = d.toISOString().slice(0, 10);
    days.add(key);
  }
  if (days.size === 0) return 0;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 366; i++) {
    const check = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = check.toISOString().slice(0, 10);
    if (days.has(key)) streak++;
    else break;
  }
  return streak;
}
