"use client";

import { useEffect } from "react";

import { resolveTheme, usePreferencesStore } from "@/stores/preferencesStore";

function applyThemeToDocument(theme: "dark" | "light", reduceMotion: boolean) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  if (reduceMotion) {
    document.documentElement.setAttribute("data-reduce-motion", "true");
  } else {
    document.documentElement.removeAttribute("data-reduce-motion");
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const theme = usePreferencesStore((s) => s.theme);
  const reduceUiMotion = usePreferencesStore((s) => s.reduceUiMotion);

  useEffect(() => {
    applyThemeToDocument(resolveTheme(theme), reduceUiMotion);
  }, [theme, reduceUiMotion]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyThemeToDocument(resolveTheme("system"), usePreferencesStore.getState().reduceUiMotion);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, reduceUiMotion]);

  return children;
}
