"use client";
import Link from "next/link";

export function RoomieBubble() {
  return (
    <Link
      href="/dashboard/wellness"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-xl shadow-lg shadow-green-900/30 ring-2 ring-white/20 pp-hover-grow hover:ring-white/40 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 sm:text-2xl"
      aria-label="Open Roomie wellness"
    >
      <span className="select-none">
        🦁
      </span>
    </Link>
  );
}
