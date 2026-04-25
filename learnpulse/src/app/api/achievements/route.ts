import { NextResponse } from "next/server";

import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_KEYS,
  type AchievementKey,
} from "@/lib/achievements";
import { aggregateStats, evaluateUnlocks, progressFor } from "@/lib/achievement-eval";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, mode, score, accuracy_pct, duration_seconds, correct_count, checkpoints_total, started_at, ended_at, metadata",
    )
    .eq("user_id", user.id);

  const { data: courses } = await supabase
    .from("courses")
    .select("subject, completion_percent")
    .eq("user_id", user.id);

  const { data: unlocked } = await supabase
    .from("achievements")
    .select("achievement_key, unlocked_at")
    .eq("user_id", user.id);

  const sessionRows = (sessions ?? []) as import("@/lib/achievement-eval").SessionRow[];
  const stats = aggregateStats(sessionRows, courses ?? []);

  const unlockedSet = new Set(
    (unlocked ?? []).map((u) => u.achievement_key as AchievementKey),
  );

  const achievements = ACHIEVEMENT_KEYS.map((key) => {
    const def = ACHIEVEMENT_DEFINITIONS[key];
    const isUnlocked = unlockedSet.has(key);
    const prog = !isUnlocked ? progressFor(key, stats) : null;
    const row = (unlocked ?? []).find((u) => u.achievement_key === key);
    return {
      key,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlocked: isUnlocked,
      unlockedAt: row?.unlocked_at ?? null,
      progress: prog,
    };
  });

  return NextResponse.json({ achievements, stats });
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, mode, score, accuracy_pct, duration_seconds, correct_count, checkpoints_total, started_at, ended_at, metadata",
    )
    .eq("user_id", user.id);

  const { data: courses } = await supabase
    .from("courses")
    .select("subject, completion_percent")
    .eq("user_id", user.id);

  const { data: existing } = await supabase
    .from("achievements")
    .select("achievement_key")
    .eq("user_id", user.id);

  const sessionRows = (sessions ?? []) as import("@/lib/achievement-eval").SessionRow[];
  const stats = aggregateStats(sessionRows, courses ?? []);
  const earned = evaluateUnlocks(stats);
  const have = new Set((existing ?? []).map((e) => e.achievement_key as AchievementKey));
  const toInsert = earned.filter((k) => !have.has(k));

  if (toInsert.length > 0) {
    const rows = toInsert.map((achievement_key) => ({
      user_id: user.id,
      achievement_key,
    }));
    const { error } = await supabase.from("achievements").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ awarded: toInsert });
}
