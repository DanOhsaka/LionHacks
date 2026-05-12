"use client";

import { useCallback, useEffect, useState } from "react";

import type { LearnerGoals } from "@/types/learner-goals";

export function LearnerGoalsCard() {
  const [goals, setGoals] = useState<LearnerGoals>({});
  const [draft, setDraft] = useState<LearnerGoals>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekQuestions, setWeekQuestions] = useState<number | null>(null);
  const [weekMinutes, setWeekMinutes] = useState<number | null>(null);
  const [weekAvgAcc, setWeekAvgAcc] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, sRes] = await Promise.all([
        fetch("/api/profile/goals"),
        fetch("/api/sessions"),
      ]);
      const gData = (await gRes.json()) as { goals?: LearnerGoals; error?: string };
      const next = gData.goals ?? {};
      setGoals(next);
      setDraft(next);

      const sData = (await sRes.json()) as {
        sessions?: {
          started_at: string;
          correct_count: number | null;
          wrong_count: number | null;
          duration_seconds: number | null;
          accuracy_pct: number | null;
          ended_at: string | null;
        }[];
      };
      const since = Date.now() - 7 * 86400000;
      const rows = (sData.sessions ?? []).filter(
        (x) => new Date(x.started_at).getTime() >= since && x.ended_at,
      );
      let q = 0;
      let sec = 0;
      const accs: number[] = [];
      for (const r of rows) {
        q += (r.correct_count ?? 0) + (r.wrong_count ?? 0);
        sec += r.duration_seconds ?? 0;
        if (r.accuracy_pct != null) accs.push(Number(r.accuracy_pct));
      }
      setWeekQuestions(q);
      setWeekMinutes(Math.round(sec / 60));
      setWeekAvgAcc(
        accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: draft }),
      });
      const data = (await res.json()) as { goals?: LearnerGoals; error?: string };
      if (data.error) {
        console.error(data.error);
        return;
      }
      if (data.goals) {
        setGoals(data.goals);
        setDraft(data.goals);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">
        Loading goals…
      </div>
    );
  }

  const tQ = draft.weekly_questions_target;
  const tM = draft.weekly_minutes_target;
  const tA = draft.accuracy_target_pct;
  const dirty = JSON.stringify(goals) !== JSON.stringify(draft);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Weekly targets</h2>
          <p className="text-sm text-zinc-500">
            Compared to your last 7 days of ended sessions. Save when you are done editing.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void load()}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <GoalField
          label="Questions / week"
          hint={tQ != null && weekQuestions != null ? `${weekQuestions} / ${tQ}` : undefined}
          value={tQ}
          onChange={(n) => setDraft((d) => ({ ...d, weekly_questions_target: n }))}
        />
        <GoalField
          label="Minutes / week"
          hint={tM != null && weekMinutes != null ? `${weekMinutes} / ${tM}` : undefined}
          value={tM}
          onChange={(n) => setDraft((d) => ({ ...d, weekly_minutes_target: n }))}
        />
        <GoalField
          label="Avg accuracy % (target)"
          hint={
            tA != null && weekAvgAcc != null ? `Current ${weekAvgAcc}% vs ${tA}%` : undefined
          }
          value={tA}
          max={100}
          onChange={(n) => setDraft((d) => ({ ...d, accuracy_target_pct: n }))}
        />
      </div>
    </div>
  );
}

function GoalField({
  label,
  hint,
  value,
  onChange,
  max = 99999,
}: {
  label: string;
  hint?: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  max?: number;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      {hint && <p className="mt-1 text-xs text-emerald-400/90">{hint}</p>}
      <input
        type="number"
        min={0}
        max={max}
        placeholder="Optional"
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(undefined);
            return;
          }
          const n = Number.parseInt(raw, 10);
          if (Number.isNaN(n)) return;
          onChange(Math.min(max, Math.max(0, n)));
        }}
      />
    </div>
  );
}
