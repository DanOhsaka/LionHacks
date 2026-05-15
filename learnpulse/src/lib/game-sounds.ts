/** Web Audio cues — no external sound files required. */

export type GameSoundKind = "correct" | "wrong" | "streak";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  return ctx;
}

/** Call once after a user gesture so mobile browsers allow playback. */
export function primeGameAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
  when = 0,
) {
  const c = getCtx();
  if (!c) return;

  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playGameSound(kind: GameSoundKind, streakLevel = 1) {
  const c = getCtx();
  if (!c || c.state === "suspended") return;

  switch (kind) {
    case "correct":
      tone(523.25, 0.12, "sine", 0.08);
      tone(659.25, 0.14, "sine", 0.06, 0.06);
      break;
    case "wrong":
      tone(196, 0.22, "triangle", 0.07);
      tone(155.56, 0.28, "triangle", 0.05, 0.05);
      break;
    case "streak": {
      const boost = Math.min(streakLevel, 4);
      tone(392 + boost * 40, 0.1, "sine", 0.09);
      tone(523.25 + boost * 30, 0.12, "sine", 0.08, 0.08);
      tone(659.25 + boost * 20, 0.16, "sine", 0.07, 0.16);
      break;
    }
  }
}

export const STREAK_SOUND_MILESTONES = [3, 5, 10] as const;
