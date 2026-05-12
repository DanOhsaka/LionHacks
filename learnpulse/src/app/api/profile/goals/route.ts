import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { LearnerGoals } from "@/types/learner-goals";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("goals")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const goals =
    data?.goals && typeof data.goals === "object"
      ? (data.goals as LearnerGoals)
      : {};

  return NextResponse.json({ goals });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const next = (body as { goals?: unknown }).goals;
  if (!next || typeof next !== "object") {
    return NextResponse.json({ error: "goals object required" }, { status: 400 });
  }

  const g = next as Record<string, unknown>;
  const cleaned: LearnerGoals = {};
  if (typeof g.weekly_questions_target === "number" && g.weekly_questions_target >= 0) {
    cleaned.weekly_questions_target = Math.round(g.weekly_questions_target);
  }
  if (typeof g.weekly_minutes_target === "number" && g.weekly_minutes_target >= 0) {
    cleaned.weekly_minutes_target = Math.round(g.weekly_minutes_target);
  }
  if (typeof g.accuracy_target_pct === "number" && g.accuracy_target_pct >= 0) {
    cleaned.accuracy_target_pct = Math.min(100, Math.round(g.accuracy_target_pct));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ goals: cleaned })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ goals: cleaned });
}
