"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Brain, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-white">PridePath</span>
          <Image
            src="/logo.jpeg"
            alt="PridePath"
            width={48}
            height={48}
            className="rounded-full object-contain"
          />
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
            AI study companion
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Turn your notes into a quiz game
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Upload PDFs, slides, or docs. Gemini builds checkpoints, you play Speed, Zen, or Story
            modes — with wellness check-ins baked in.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-emerald-500 px-8 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-900"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-left"
            >
              <step.icon className="h-8 w-8 text-emerald-400" />
              <h2 className="mt-4 font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{step.body}</p>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
  );
}
