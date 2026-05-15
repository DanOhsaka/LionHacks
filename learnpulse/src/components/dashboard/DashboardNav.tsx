"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  ACHIEVEMENTS_ACK_EVENT,
  ACHIEVEMENTS_STATE_CHANGED_EVENT,
  countUnreadAchievements,
} from "@/lib/achievement-notifications";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, short: "Home" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, short: "Stats" },
  { href: "/courses", label: "Courses", icon: BookOpen, short: "Courses" },
  { href: "/achievements", label: "Achievements", icon: Trophy, short: "Awards" },
  { href: "/dashboard/wellness", label: "Wellness", icon: HeartPulse, short: "Wellness" },
  { href: "/upload", label: "Upload", icon: Upload, short: "Upload" },
  { href: "/settings", label: "Settings", icon: Settings, short: "Settings" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadAchievementCount, setUnreadAchievementCount] = useState<number | null>(null);

  const refreshUnreadAchievements = useCallback(async () => {
    try {
      const res = await fetch("/api/achievements", { credentials: "same-origin" });
      if (!res.ok) return;
      const d = (await res.json()) as {
        achievements?: { key: string; unlocked: boolean }[];
      };
      setUnreadAchievementCount(countUnreadAchievements(d.achievements ?? []));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshUnreadAchievements();
  }, [refreshUnreadAchievements]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshUnreadAchievements();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshUnreadAchievements]);

  useEffect(() => {
    const onAck = () => void refreshUnreadAchievements();
    window.addEventListener(ACHIEVEMENTS_ACK_EVENT, onAck);
    window.addEventListener(ACHIEVEMENTS_STATE_CHANGED_EVENT, onAck);
    return () => {
      window.removeEventListener(ACHIEVEMENTS_ACK_EVENT, onAck);
      window.removeEventListener(ACHIEVEMENTS_STATE_CHANGED_EVENT, onAck);
    };
  }, [refreshUnreadAchievements]);

  useEffect(() => {
    for (const { href } of links) {
      router.prefetch(href);
    }
  }, [router]);

  async function logout() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) {
      toast.error("Could not log out");
      return;
    }
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="relative z-30 flex w-full shrink-0 flex-col gap-0 border-b border-[var(--nav-border)] bg-[var(--nav-bg)] backdrop-blur-md sm:w-56 sm:border-b-0 sm:border-r sm:py-6">
      {/* Mobile: compact brand row */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800/60 px-3 py-2.5 sm:hidden">
        <div
          className="relative shrink-0 rounded-full border border-emerald-400/50 bg-zinc-800 p-0.5"
          aria-hidden
        >
          <Image
            src="/pridepath-lion.png"
            alt=""
            width={32}
            height={32}
            className="rounded-full bg-black object-cover"
          />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-bold text-foreground">PridePath</span>
          <p className="truncate text-[10px] font-medium text-app-muted">Study smarter, play harder</p>
        </div>
      </div>

      {/* Desktop: full brand block */}
      <div className="mb-4 hidden rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-3 sm:mx-3 sm:block">
        <div className="flex items-start gap-3">
          <div
            className="relative shrink-0 rounded-full border-2 border-emerald-400/60 bg-zinc-800 p-0.5 shadow-[0_0_20px_rgba(52,211,153,0.25)] ring-2 ring-white/15"
            aria-hidden
          >
            <Image
              src="/pridepath-lion.png"
              alt="PridePath logo"
              width={40}
              height={40}
              className="rounded-full bg-black object-cover"
              priority
            />
          </div>
          <div className="min-w-0 pt-0.5">
            <span className="text-lg font-bold tracking-tight text-foreground">PridePath</span>
            <p className="mt-1 text-xs font-medium leading-snug text-app-muted">Study smarter, play harder</p>
          </div>
        </div>
      </div>

      <nav
        className="flex flex-row gap-1 overflow-x-auto overscroll-x-contain px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-col sm:overflow-visible sm:px-3 sm:py-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Main"
      >
        {links.map(({ href, label, icon: Icon, short }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(`${href}/`);
          const onAchievementsRoute =
            pathname === "/achievements" || pathname.startsWith("/achievements/");
          const showAchievementsBadge =
            href === "/achievements" &&
            !onAchievementsRoute &&
            unreadAchievementCount !== null &&
            unreadAchievementCount > 0;
          const badgeText =
            unreadAchievementCount != null && unreadAchievementCount > 99
              ? "99+"
              : String(unreadAchievementCount ?? "");
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 sm:shrink ${
                active
                  ? "bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                  : "text-foreground hover:bg-emerald-500/10"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-emerald-300" : "text-app-muted group-hover:text-cyan-500"}`}
              />
              <span className="hidden whitespace-nowrap sm:inline">{label}</span>
              <span className="whitespace-nowrap sm:hidden">{short}</span>
              {showAchievementsBadge ? (
                <span
                  className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-1 text-[10px] font-bold tabular-nums leading-none text-zinc-950 shadow ring-2 ring-zinc-950"
                  aria-label={`${unreadAchievementCount} new achievements`}
                >
                  {badgeText}
                </span>
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void logout()}
          className="group flex shrink-0 items-center gap-2 rounded-xl border border-[var(--nav-border)] px-3 py-2.5 text-sm font-medium text-app-muted transition-colors hover:border-red-500/70 hover:bg-red-950/50 hover:text-red-700 sm:hidden"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Log out</span>
        </button>
      </nav>

      <button
        type="button"
        onClick={() => void logout()}
        className="group mx-3 mb-3 mt-auto hidden items-center gap-2 overflow-hidden rounded-xl border border-[var(--nav-border)] px-3 py-2.5 text-left text-sm font-medium text-app-muted transition-[box-shadow,background-color,border-color,color] duration-200 hover:border-red-500/70 hover:bg-red-950/50 hover:text-red-700 sm:flex"
      >
        <LogOut className="h-4 w-4 shrink-0 transition group-hover:text-red-700" />
        Log out
      </button>
    </aside>
  );
}
