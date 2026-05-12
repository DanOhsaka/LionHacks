"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    <aside className="relative z-20 flex w-full flex-col gap-1 border-b border-zinc-800/80 bg-zinc-950/70 px-3 py-3 backdrop-blur-md sm:w-56 sm:border-b-0 sm:border-r sm:py-6">
      <div className="mb-4 hidden rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-3 sm:block">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-white">PridePath</span>
          <Image
            src="/logo.jpeg"
            alt="PridePath"
            width={36}
            height={36}
            className="rounded-full object-contain"
          />
        </div>
        <p className="mt-1 text-xs text-zinc-400">Study smarter, play harder</p>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                  : "text-zinc-300 hover:-translate-y-[1px] hover:bg-zinc-800/80 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition ${active ? "text-emerald-300" : "text-zinc-400 group-hover:text-cyan-300"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-auto flex items-center gap-2 rounded-xl border border-zinc-800/80 px-3 py-2.5 text-left text-sm text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-300"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </aside>
  );
}
