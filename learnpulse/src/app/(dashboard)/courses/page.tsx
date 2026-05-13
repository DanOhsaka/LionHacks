"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Flame, Play, Trash2 } from "lucide-react";

import { DeleteCourseModal } from "@/components/courses/DeleteCourseModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";

type CourseRow = {
  id: string;
  title: string;
  subject: string;
  completion_percent: number | string | null;
  current_streak: number | null;
  last_session_at: string | null;
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CourseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCourses = useCallback(async (): Promise<boolean> => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      router.replace("/login");
      return false;
    }
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setCourses((data as CourseRow[] | null) ?? []);
    return true;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void loadCourses().then((loaded) => {
      if (cancelled) return;
      if (loaded) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadCourses]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void loadCourses();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadCourses]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const raw = await res.text();
      let body: { success?: boolean; error?: string } = {};
      try {
        body = raw ? (JSON.parse(raw) as { success?: boolean; error?: string }) : {};
      } catch {
        toast.error(
          raw
            ? `Delete failed (${res.status}). The server did not return JSON — check the Network tab for this request.`
            : `Delete failed (${res.status}). Empty response.`,
        );
        return;
      }
      if (!res.ok || !body.success) {
        toast.error(body.error ?? `Could not delete course (${res.status})`);
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("✓ Course deleted");
    } catch {
      toast.error("Could not delete course");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="app-container-wide space-y-8" aria-hidden>
        <div className="app-panel app-panel-elevated pp-skeleton-pulse h-28 rounded-2xl" />
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="app-panel pp-skeleton-pulse h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const list = courses;

  return (
    <div className="app-container-wide">
      <PageHeader
        title="Course library"
        description="Everything you have uploaded, ready to play."
        breadcrumbs={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Courses" },
        ]}
        action={
          <Link
            href="/upload"
            className="pp-hover-grow inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
          >
            Upload material
          </Link>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Your library is empty"
          description="Add PDFs, slides, or notes — we parse them and build Speed, Zen, and Story sessions tailored to your material."
          action={
            <Link
              href="/upload"
              className="pp-hover-grow inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:from-emerald-300 hover:to-cyan-200"
            >
              Upload material
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {list.map((c) => (
            <article
              key={c.id}
              className="group app-panel relative flex flex-col overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1 hover:border-cyan-400/40"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-emerald-500/5 to-fuchsia-500/10 opacity-0 transition duration-150 group-hover:opacity-100" />
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400 shadow-lg shadow-black/20 transition group-hover:scale-105">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-white">{c.title}</h2>
                  <p className="text-sm text-zinc-500">{c.subject}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Completion</dt>
                  <dd className="font-medium text-white">{Math.round(Number(c.completion_percent ?? 0))}%</dd>
                  <div className="mt-1.5 h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
                      style={{ width: `${Math.max(6, Math.min(100, Number(c.completion_percent ?? 0)))}%` }}
                    />
                  </div>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Streak</dt>
                  <dd className="flex items-center gap-1 font-medium text-amber-300">
                    <Flame className="h-3.5 w-3.5" />
                    {c.current_streak ?? 0} days
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Last session</dt>
                  <dd className="text-zinc-300">
                    {c.last_session_at ? new Date(c.last_session_at).toLocaleDateString() : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/courses/${c.id}/play?mode=zen`}
                  className="pp-hover-grow inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 group-hover:shadow-[0_0_0_1px_rgba(45,212,191,0.35)]"
                >
                  <Play className="h-4 w-4" />
                  New session
                </Link>
                <Link
                  href={`/courses/${c.id}`}
                  className="pp-hover-grow inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  Continue
                </Link>
                <button
                  type="button"
                  aria-label="Delete course"
                  onClick={() => setDeleteTarget(c)}
                  className="group shrink-0 overflow-hidden rounded-lg border border-red-500/60 bg-zinc-950/40 p-2 text-red-400 transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform hover:border-red-400 hover:bg-red-950/55 hover:text-red-100 hover:shadow-[inset_0_0_22px_rgba(252,165,165,0.45),inset_0_0_48px_rgba(127,29,29,0.35)]"
                >
                  <Trash2 className="h-4 w-4 shrink-0 transition group-hover:text-red-100" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <DeleteCourseModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleting}
      />
    </div>
  );
}
