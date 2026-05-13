const STORAGE_KEY = "pridepath:achievements:acknowledged:v1";

export function loadAcknowledgedAchievementKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

/** Mark these achievement keys as seen (e.g. after opening the Achievements tab). */
export function acknowledgeAchievementKeys(keys: string[]): void {
  if (typeof window === "undefined" || keys.length === 0) return;
  const s = loadAcknowledgedAchievementKeys();
  let changed = false;
  for (const k of keys) {
    if (!s.has(k)) {
      s.add(k);
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s)));
  }
}

/** Unlocked achievements the user has not yet acknowledged on the Achievements tab. */
export function countUnreadAchievements(
  achievements: { key: string; unlocked: boolean }[],
): number {
  const ack = loadAcknowledgedAchievementKeys();
  return achievements.filter((a) => a.unlocked && !ack.has(a.key)).length;
}

export const ACHIEVEMENTS_ACK_EVENT = "pridepath:achievements-ack";

/** Server may have new rows (e.g. after a session); refetch unread count in the nav. */
export const ACHIEVEMENTS_STATE_CHANGED_EVENT = "pridepath:achievements-state-changed";

export function notifyAchievementsAcknowledged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACHIEVEMENTS_ACK_EVENT));
}

export function notifyAchievementsStateChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACHIEVEMENTS_STATE_CHANGED_EVENT));
}
