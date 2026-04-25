"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Play, Zap, BookOpen, Layers } from "lucide-react";

const modes = [
  { id: "speed" as const, label: "Speed", desc: "Timed — stay sharp", icon: Zap },
  { id: "zen" as const, label: "Zen", desc: "No timer, your pace", icon: BookOpen },
  { id: "story" as const, label: "Story", desc: "Unlock the next chapter", icon: Layers },
];

export function CourseSessionStarter({ courseId }: { courseId: string }) {
  const [selected, setSelected] = useState<(typeof modes)[number]["id"]>("zen");

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-6"
    >
      <h2 className="text-lg font-medium text-white">Start a session</h2>
      <p className="mt-1 text-sm text-zinc-500">Pick a mode, then jump into the game.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(m.id)}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? "border-emerald-500/60 bg-emerald-500/10 text-white"
                  : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <Icon className="mb-2 h-5 w-5 text-emerald-400" />
              <span className="font-medium">{m.label}</span>
              <span className="text-xs text-zinc-500">{m.desc}</span>
            </button>
          );
        })}
      </div>
      <Link
        href={`/courses/${courseId}/play?mode=${selected}`}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 sm:w-auto sm:px-8"
      >
        <Play className="h-4 w-4" />
        Play {modes.find((m) => m.id === selected)?.label}
      </Link>
    </motion.section>
  );
}
