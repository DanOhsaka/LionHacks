"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, Share2, Trophy } from "lucide-react";

import { ACHIEVEMENT_KEYS } from "@/lib/achievements";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import {
  acknowledgeAchievementKeys,
  notifyAchievementsAcknowledged,
} from "@/lib/achievement-notifications";

type AchievementRow = {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number } | null;
};

const CARD_THEMES = [
  {
    glow: "from-fuchsia-500/20 via-violet-500/10 to-transparent",
    icon: "from-fuchsia-500/25 to-violet-400/20",
    bar: "from-fuchsia-400 to-violet-300",
  },
  {
    glow: "from-cyan-500/20 via-sky-500/10 to-transparent",
    icon: "from-cyan-500/25 to-sky-400/20",
    bar: "from-cyan-400 to-sky-300",
  },
  {
    glow: "from-emerald-500/20 via-teal-500/10 to-transparent",
    icon: "from-emerald-500/25 to-teal-400/20",
    bar: "from-emerald-400 to-teal-300",
  },
  {
    glow: "from-amber-500/20 via-orange-500/10 to-transparent",
    icon: "from-amber-500/25 to-orange-400/20",
    bar: "from-amber-300 to-orange-300",
  },
];

export default function AchievementsPage() {
  const [items, setItems] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();
  const totalPossible = ACHIEVEMENT_KEYS.length;
  const unlockedCount = useMemo(() => items.filter((a) => a.unlocked).length, [items]);

  useEffect(() => {
    void fetch("/api/achievements")
      .then((r) => r.json())
      .then((d: { achievements?: AchievementRow[] }) => {
        setItems(d.achievements ?? []);
      })
      .catch(() => toast.error("Could not load achievements"))
      .finally(() => setLoading(false));
  }, []);

  /** Mark all currently unlocked badges as seen (clears sidebar notification). */
  useEffect(() => {
    if (loading) return;
    const unlockedKeys = items.filter((a) => a.unlocked).map((a) => a.key);
    acknowledgeAchievementKeys(unlockedKeys);
    notifyAchievementsAcknowledged();
  }, [loading, items]);

  async function shareBadge(a: AchievementRow) {
    const text = a.unlocked
      ? `I unlocked "${a.title}" on PridePath — ${a.description}`
      : `Working toward "${a.title}" on PridePath`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "PridePath", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch {
      toast.error("Could not share");
    }
  }

  if (loading) {
    return (
      <div className="app-container-dashboard space-y-6" aria-hidden>
        <div className="app-panel app-panel-elevated pp-skeleton-pulse h-28 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="app-panel pp-skeleton-pulse h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container-dashboard space-y-8">
      <PageHeader
        title="Achievements"
        description="Collect badges as you study. Share your wins."
        breadcrumbs={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Achievements" },
        ]}
        titleGradient
        action={
          <span
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-emerald-100"
            aria-label={`${unlockedCount} of ${totalPossible} achievements unlocked`}
          >
            <Trophy className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
            <span>
              {unlockedCount} / {totalPossible}
            </span>
          </span>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No badges yet"
          description="Complete sessions, build streaks, and explore modes — achievements appear here as you hit milestones."
          action={
            <Link
              href="/courses"
              className="pp-hover-grow inline-flex rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Go to courses
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((a, i) => {
            const theme = CARD_THEMES[i % CARD_THEMES.length]!;
            return (
              <motion.article
                key={a.key}
                layout
                whileHover={
                  reduceMotion
                    ? undefined
                    : {
                        y: -4,
                        scale: 1.01,
                      }
                }
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className={`relative overflow-hidden rounded-2xl border p-5 ${
                  a.unlocked
                    ? "achievement-signature border-emerald-400/50 bg-gradient-to-br from-zinc-900/70 via-zinc-900/70 to-zinc-900/80 shadow-lg shadow-emerald-900/20"
                    : "border-zinc-700/70 bg-zinc-900/60 shadow-lg shadow-black/20 saturate-50"
                }`}
              >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.glow} ${
                a.unlocked ? "opacity-90" : "opacity-30"
              }`}
            />
            <motion.div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl"
              initial={{ opacity: 0.3, scale: 0.9 }}
              whileHover={
                reduceMotion ? undefined : { opacity: 0.6, scale: 1.15 }
              }
              transition={{ duration: 0.35 }}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <motion.span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${theme.icon} text-3xl shadow-lg shadow-black/20 ${
                    a.unlocked ? "" : "grayscale"
                  }`}
                  whileHover={
                    reduceMotion
                      ? undefined
                      : { rotate: [-3, 3, -2, 0], scale: 1.06 }
                  }
                  transition={{ duration: 0.45 }}
                >
                  {a.icon}
                </motion.span>
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-white">
                    {a.title}
                    {!a.unlocked && <Lock className="h-4 w-4 text-zinc-500" aria-hidden />}
                  </h2>
                  <p className={`mt-1 text-sm ${a.unlocked ? "text-zinc-300" : "text-zinc-500"}`}>
                    {a.description}
                  </p>
                  {a.unlocked && a.unlockedAt && (
                    <p className="mt-2 text-xs text-emerald-300/90">
                      Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                  {!a.unlocked && a.progress && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-zinc-500">
                        <span>Progress</span>
                        <span>
                          {a.progress.current} / {a.progress.target}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <motion.div
                          className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (a.progress.current / a.progress.target) * 100)}%`,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void shareBadge(a)}
                className="relative z-10 rounded-lg border border-zinc-700 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                title="Share badge"
              >
                <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} />
              </button>
            </div>
          </motion.article>
          );
          })}
        </div>
      )}
    </div>
  );
}
