"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a file");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/courses/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { courseId?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      toast.success("Course generated");
      if (data.courseId) router.push(`/courses/${data.courseId}`);
      else router.push("/courses");
      router.refresh();
    } catch {
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Upload material</h1>
        <p className="mt-1 text-sm text-zinc-400">
          PDF, Word, PowerPoint, or plain text. Gemini builds chapters and quiz checkpoints.
        </p>
      </div>
      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
      >
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-600 bg-zinc-950/60 px-6 py-12 text-center hover:border-emerald-500/50">
          <UploadCloud className="h-10 w-10 text-emerald-400" />
          <span className="mt-3 text-sm font-medium text-white">
            {file ? file.name : "Drop a file or click to browse"}
          </span>
          <span className="mt-1 text-xs text-zinc-500">Max 15MB</span>
          <input
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          {loading ? "Processing…" : "Upload & generate"}
        </button>
      </motion.form>
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">
        ← Back to dashboard
      </Link>
    </div>
  );
}
