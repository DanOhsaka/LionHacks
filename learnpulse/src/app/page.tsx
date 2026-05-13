"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Brain, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { ParticleLogoIntro } from "@/components/landing/ParticleLogoIntro";

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);
  const dismissIntro = useCallback(() => setShowIntro(false), []);

  return (
    <>
      {showIntro ? <ParticleLogoIntro onComplete={dismissIntro} /> : null}
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100"
      style={{ backgroundColor: "#09090b", minHeight: "100vh" }}
    >
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/pridepath-lion.png"
            alt="PridePath"
            width={48}
            height={48}
            className="rounded-full bg-black object-cover"
          />
          <span className="text-lg font-semibold tracking-tight text-white">PridePath</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="pp-hover-grow rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="pp-hover-grow rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
            AI study companion
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Turn your notes into a quiz game
          </h1>
          <p className="mx-auto mt-4 max-w-prose text-lg leading-relaxed text-app-muted">
            Upload PDFs, slides, or docs. Gemini builds checkpoints, you play Speed, Zen, or Story
            modes — with wellness check-ins baked in.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="pp-hover-grow rounded-xl bg-emerald-500 px-8 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="pp-hover-grow rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-900"
            >
              Log in
            </Link>
          </div>
        </motion.div>

        <section className="mt-24 grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Upload anything",
              body: "Drop your own materials. We parse them and build a checkpoint curriculum.",
              icon: BookOpen,
            },
            {
              title: "Gemini-powered",
              body: "Smart questions, explanations, and coach nudges grounded in what you uploaded.",
              icon: Brain,
            },
            {
              title: "Play to learn",
              body: "Speed, Zen, and Story modes — streaks, achievements, and mood-aware sessions.",
              icon: Sparkles,
            },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="app-panel text-left p-6"
            >
              <step.icon className="h-8 w-8 text-emerald-400" />
              <h2 className="font-display mt-4 font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-sm text-app-muted">{step.body}</p>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
    </>
  );
}
