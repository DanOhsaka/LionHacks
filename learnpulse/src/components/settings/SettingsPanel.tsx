"use client";

import { Monitor, Moon, Sun, Volume2, VolumeX, Zap } from "lucide-react";

import { playGameSound, primeGameAudio } from "@/lib/game-sounds";
import { type ThemeMode, usePreferencesStore } from "@/stores/preferencesStore";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="pp-settings-row flex cursor-pointer items-start justify-between gap-4 rounded-xl px-4 py-3 transition hover:border-emerald-500/35">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-app-muted">{description}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
      />
    </label>
  );
}

function ThemeOption({
  mode,
  current,
  icon: Icon,
  label,
  onSelect,
}: {
  mode: ThemeMode;
  current: ThemeMode;
  icon: typeof Sun;
  label: string;
  onSelect: (m: ThemeMode) => void;
}) {
  const active = current === mode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`flex flex-1 flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
        active
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700"
          : "pp-settings-row text-foreground hover:border-emerald-500/35"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-emerald-600" : "text-app-muted"}`} />
      {label}
    </button>
  );
}

export function SettingsPanel() {
  const theme = usePreferencesStore((s) => s.theme);
  const soundEnabled = usePreferencesStore((s) => s.soundEnabled);
  const soundInZen = usePreferencesStore((s) => s.soundInZen);
  const reduceUiMotion = usePreferencesStore((s) => s.reduceUiMotion);
  const sessionMuted = usePreferencesStore((s) => s.sessionMuted);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const setSoundEnabled = usePreferencesStore((s) => s.setSoundEnabled);
  const setSoundInZen = usePreferencesStore((s) => s.setSoundInZen);
  const setReduceUiMotion = usePreferencesStore((s) => s.setReduceUiMotion);
  const setSessionMuted = usePreferencesStore((s) => s.setSessionMuted);

  function previewSound() {
    primeGameAudio();
    playGameSound("correct");
    window.setTimeout(() => playGameSound("streak", 2), 220);
  }

  return (
    <div className="space-y-6">
      <section className="app-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="app-section-title">Display</h2>
          <p className="mt-1 text-sm text-app-muted">
            Choose how PridePath looks on this device.
          </p>
        </div>
        <div className="flex gap-2">
          <ThemeOption mode="dark" current={theme} icon={Moon} label="Dark" onSelect={setTheme} />
          <ThemeOption mode="light" current={theme} icon={Sun} label="Light" onSelect={setTheme} />
          <ThemeOption
            mode="system"
            current={theme}
            icon={Monitor}
            label="System"
            onSelect={setTheme}
          />
        </div>
      </section>

      <section className="app-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="app-section-title flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-emerald-400" />
            Sound
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            Short feedback tones for correct answers, mistakes, and streak milestones.
          </p>
        </div>

        <div className="space-y-2">
          <Toggle
            label="Sound effects"
            description="Play audio during Speed and Story sessions."
            checked={soundEnabled}
            onChange={(v) => {
              setSoundEnabled(v);
              if (v) {
                primeGameAudio();
                previewSound();
              }
            }}
          />
          <Toggle
            label="Sounds in Zen mode"
            description="Off by default — Zen stays quiet unless you enable this."
            checked={soundInZen}
            onChange={setSoundInZen}
          />
          <Toggle
            label="Mute during current session"
            description="Quick silence while you play; change anytime from the game screen too."
            checked={sessionMuted}
            onChange={setSessionMuted}
          />
        </div>

        <button
          type="button"
          onClick={previewSound}
          disabled={!soundEnabled || sessionMuted}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-foreground transition hover:border-emerald-500/40 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="h-4 w-4 text-amber-300" />
          Preview sounds
        </button>
        {sessionMuted ? (
          <p className="flex items-center gap-2 text-xs font-medium text-amber-700">
            <VolumeX className="h-3.5 w-3.5 shrink-0" />
            Session is muted — unmute here or in-game.
          </p>
        ) : null}
      </section>

      <section className="app-panel space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="app-section-title">Accessibility</h2>
          <p className="mt-1 text-sm text-app-muted">
            Reduce motion and optional sound when you prefer a calmer experience.
          </p>
        </div>
        <Toggle
          label="Reduce UI motion"
          description="Tones down hover scaling and some animations. Also respects your OS “reduce motion” setting for sounds."
          checked={reduceUiMotion}
          onChange={setReduceUiMotion}
        />
      </section>
    </div>
  );
}
