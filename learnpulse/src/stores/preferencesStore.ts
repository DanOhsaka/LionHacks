"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "system";

type PreferencesState = {
  theme: ThemeMode;
  soundEnabled: boolean;
  soundInZen: boolean;
  reduceUiMotion: boolean;
  /** Quick mute during play (not persisted). */
  sessionMuted: boolean;
  setTheme: (theme: ThemeMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundInZen: (enabled: boolean) => void;
  setReduceUiMotion: (enabled: boolean) => void;
  setSessionMuted: (muted: boolean) => void;
  toggleSessionMuted: () => void;
  resolvedTheme: () => "dark" | "light";
  shouldPlayGameSounds: (mode: "speed" | "zen" | "story" | null) => boolean;
};

export function resolveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode === "light" ? "light" : "dark";
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      soundEnabled: true,
      soundInZen: false,
      reduceUiMotion: false,
      sessionMuted: false,

      setTheme: (theme) => set({ theme }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundInZen: (soundInZen) => set({ soundInZen }),
      setReduceUiMotion: (reduceUiMotion) => set({ reduceUiMotion }),
      setSessionMuted: (sessionMuted) => set({ sessionMuted }),
      toggleSessionMuted: () => set((s) => ({ sessionMuted: !s.sessionMuted })),

      resolvedTheme: () => resolveTheme(get().theme),

      shouldPlayGameSounds: (mode) => {
        const s = get();
        if (!s.soundEnabled || s.sessionMuted) return false;
        if (mode === "zen" && !s.soundInZen) return false;
        if (s.reduceUiMotion) return false;
        if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return false;
        }
        return true;
      },
    }),
    {
      name: "pridepath-preferences",
      version: 2,
      migrate: (persisted) => {
        const state =
          persisted && typeof persisted === "object"
            ? (persisted as Record<string, unknown>)
            : {};
        const nextState = { ...state };
        delete nextState.theme;
        return nextState as PreferencesState;
      },
      partialize: (s) => ({
        soundEnabled: s.soundEnabled,
        soundInZen: s.soundInZen,
        reduceUiMotion: s.reduceUiMotion,
      }),
    },
  ),
);
