"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Flame, Play, Trash2 } from "lucide-react";

import { DeleteCourseModal } from "@/components/courses/DeleteCourseModal";
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
      data: { user },
    } = await supabase.auth.getUser();
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
    void loadCourses().then((loaded) => {
      if (loaded) setLoading(false);
    });
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
      <div className="mx-auto max-w-5xl">
        <p className="text-zinc-500">Loading course library…</p>
      </div>
    );
  }

  const list = courses;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Course library</h1>
          <p className="mt-1 text-zinc-400">Everything you have uploaded, ready to play.</p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
        >
          Upload material
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-16 text-center text-zinc-500">
          No courses yet. Upload notes or slides to generate your first curriculum.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {list.map((c) => (
            <article
              key={c.id}
              className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg transition hover:border-emerald-500/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-emerald-400">
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
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
                >
                  <Play className="h-4 w-4" />
                  New session
                </Link>
                <Link
                  href={`/courses/${c.id}`}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  Continue
                </Link>
                <button
                  type="button"
                  aria-label="Delete course"
                  onClick={() => setDeleteTarget(c)}
                  className="shrink-0 rounded-lg border border-red-500 p-2 text-red-500 transition hover:bg-red-50 hover:shadow-md hover:shadow-red-500/50"
                >
                  <Trash2 className="h-4 w-4" />
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
