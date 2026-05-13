"use client";
import Link from "next/link";

export function RoomieBubble() {
  return (
    <Link
      href="/dashboard/wellness"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-2xl shadow-lg shadow-green-900/30 ring-2 ring-white/20 pp-hover-grow hover:ring-white/40"
      aria-label="Open Roomie wellness"
    >
      <span className="select-none">
        🦁
      </span>
    </Link>
  );
}
