"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
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
    <aside className="flex w-full flex-col gap-1 border-b border-zinc-800 bg-zinc-950/90 px-3 py-3 sm:w-52 sm:border-b-0 sm:border-r sm:py-6">
      <div className="mb-4 hidden px-2 sm:block">
        <span className="text-lg font-semibold tracking-tight text-white">LearnPulse</span>
        <p className="text-xs text-zinc-500">Study smarter</p>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </aside>
  );
}
