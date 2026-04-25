"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Share2 } from "lucide-react";

type AchievementRow = {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: { current: number; target: number } | null;
};

export default function AchievementsPage() {
  const [items, setItems] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/achievements")
      .then((r) => r.json())
      .then((d: { achievements?: AchievementRow[] }) => {
        setItems(d.achievements ?? []);
      })
      .catch(() => toast.error("Could not load achievements"))
      .finally(() => setLoading(false));
  }, []);

  async function shareBadge(a: AchievementRow) {
    const text = a.unlocked
      ? `I unlocked "${a.title}" on LearnPulse — ${a.description}`
      : `Working toward "${a.title}" on LearnPulse`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "LearnPulse", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch {
      toast.error("Could not share");
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Loading achievements…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Achievements</h1>
        <p className="mt-1 text-zinc-400">Collect badges as you study. Share your wins.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((a) => (
          <motion.article
            key={a.key}
            layout
            className={`relative overflow-hidden rounded-2xl border p-5 ${
              a.unlocked
                ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-zinc-900/80"
                : "border-zinc-800 bg-zinc-900/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-white">
                    {a.title}
                    {!a.unlocked && <Lock className="h-4 w-4 text-zinc-500" aria-hidden />}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">{a.description}</p>
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
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-emerald-500/80"
                          style={{
                            width: `${Math.min(100, (a.progress.current / a.progress.target) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void shareBadge(a)}
                className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                title="Share badge"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
