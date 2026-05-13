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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/dashboard/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/upload", label: "Upload", icon: Upload },
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
    <aside className="relative z-10 flex w-full shrink-0 flex-col gap-1 border-b border-zinc-800/80 bg-zinc-950/70 px-3 py-3 backdrop-blur-md sm:w-56 sm:border-b-0 sm:border-r sm:py-6">
      <div className="mb-4 hidden rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-3 sm:block">
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
            <span className="text-lg font-semibold tracking-tight text-white">PridePath</span>
            <p className="mt-1 text-xs leading-snug text-zinc-400">Study smarter, play harder</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
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
              className={`group relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform ${
                active
                  ? "bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)] hover:scale-[1.045]"
                  : "text-zinc-300 hover:-translate-y-px hover:scale-[1.045] hover:bg-zinc-800/80 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition ${active ? "text-emerald-300" : "text-zinc-400 group-hover:text-cyan-300"}`} />
              {label}
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
      </nav>
      <button
        type="button"
        onClick={() => void logout()}
        className="group mt-auto flex items-center gap-2 overflow-hidden rounded-xl border border-zinc-800/80 px-3 py-2.5 text-left text-sm text-zinc-400 transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform hover:border-red-500/70 hover:bg-red-950/50 hover:text-red-100 hover:shadow-[inset_0_0_28px_rgba(248,113,113,0.35),inset_0_0_64px_rgba(127,29,29,0.28)]"
      >
        <LogOut className="h-4 w-4 shrink-0 transition group-hover:text-red-100" />
        Log out
      </button>
    </aside>
  );
}
