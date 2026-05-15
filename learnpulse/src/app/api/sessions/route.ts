import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { courseMasteryPercent } from "@/lib/course-completion";
import {
  chapterRollupFromMetadata,
  mergeRollupIntoModuleStats,
  normalizeModuleStats,
} from "@/lib/module-confidence";
import { prepareSessionMetadataForPersistence } from "@/lib/session-analytics";
import { createClient } from "@/lib/supabase/server";

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");

  let query = supabase
    .from("sessions")
    .select("*, courses(title)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(request: Request) {
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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { course_id, mode, mood } = body as {
    course_id?: unknown;
    mode?: unknown;
    mood?: unknown;
  };

  if (typeof course_id !== "string" || !course_id) {
    return NextResponse.json({ error: "course_id is required" }, { status: 400 });
  }

  const modeStr = typeof mode === "string" ? mode : "zen";
  if (!["speed", "zen", "story"].includes(modeStr)) {
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", course_id)
    .eq("user_id", user.id)
    .single();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { count } = await supabase
    .from("checkpoints")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course_id);

  const moodNum =
    typeof mood === "number" && mood >= 1 && mood <= 5
      ? mood
      : typeof mood === "string"
        ? Number.parseInt(mood, 10)
        : null;
  const moodVal =
    moodNum != null && !Number.isNaN(moodNum) && moodNum >= 1 && moodNum <= 5
      ? moodNum
      : null;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      course_id,
      mode: modeStr,
      mood: moodVal,
      checkpoints_total: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
  }

  return NextResponse.json({ sessionId: session.id });
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

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    session_id,
    score,
    duration_seconds,
    accuracy_pct,
    correct_count,
    wrong_count,
    metadata,
  } = body as {
    session_id?: unknown;
    score?: unknown;
    duration_seconds?: unknown;
    accuracy_pct?: unknown;
    correct_count?: unknown;
    wrong_count?: unknown;
    metadata?: unknown;
  };

  if (typeof session_id !== "string" || !session_id) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("sessions")
    .select("id, course_id, metadata, checkpoints_total")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    ended_at: new Date().toISOString(),
  };

  const scoreN = asNumber(score);
  if (scoreN !== undefined) patch.score = Math.round(scoreN);

  const durationN = asNumber(duration_seconds);
  if (durationN !== undefined) patch.duration_seconds = Math.round(durationN);

  const accuracyN = asNumber(accuracy_pct);
  if (accuracyN !== undefined) {
    patch.accuracy_pct = Math.round(accuracyN * 10) / 10;
  }

  const correctN = asNumber(correct_count);
  if (correctN !== undefined) patch.correct_count = Math.round(correctN);

  const wrongN = asNumber(wrong_count);
  if (wrongN !== undefined) patch.wrong_count = Math.round(wrongN);

  const prevMeta =
    existing.metadata && typeof existing.metadata === "object"
      ? (existing.metadata as Record<string, unknown>)
      : {};
  const mergedMeta: Record<string, unknown> | null =
    metadata && typeof metadata === "object"
      ? { ...prevMeta, ...(metadata as Record<string, unknown>) }
      : null;
  if (mergedMeta) {
    patch.metadata = prepareSessionMetadataForPersistence(mergedMeta);
  }

  const sessionRollup =
    metadata && typeof metadata === "object"
      ? chapterRollupFromMetadata(metadata)
      : null;

  let payload: Record<string, unknown> = patch;
  let { error } = await supabase
    .from("sessions")
    .update(payload)
    .eq("id", session_id)
    .eq("user_id", user.id);

  if (error && payload.metadata) {
    console.warn(
      "[sessions PATCH] update with metadata failed, retrying scores only:",
      error.message,
    );
    const withoutMeta = { ...payload };
    delete withoutMeta.metadata;
    payload = withoutMeta;
    ({ error } = await supabase
      .from("sessions")
      .update(payload)
      .eq("id", session_id)
      .eq("user_id", user.id));
  }

  if (error && typeof error.message === "string" && error.message.includes("wrong_count")) {
    const noWrongCount = { ...payload };
    delete noWrongCount.wrong_count;
    payload = noWrongCount;
    ({ error } = await supabase
      .from("sessions")
      .update(payload)
      .eq("id", session_id)
      .eq("user_id", user.id));
  }

  if (error) {
    console.error("[sessions PATCH]", error);
    const err = error as { message?: string; code?: string; details?: string; hint?: string };
    return NextResponse.json(
      {
        error: err.message ?? "Update failed",
        code: err.code,
        details: err.details,
        hint: err.hint,
      },
      { status: 400 },
    );
  }

  if (existing.course_id) {
    const selFull = await supabase
      .from("courses")
      .select(
        "completion_percent, total_time_seconds, current_streak, last_session_at, module_stats",
      )
      .eq("id", existing.course_id)
      .eq("user_id", user.id)
      .single();

    let courseRow: {
      completion_percent?: unknown;
      total_time_seconds?: unknown;
      current_streak?: unknown;
      last_session_at?: unknown;
      module_stats?: unknown;
    } | null = selFull.data;

    if (selFull.error || !courseRow) {
      const selMin = await supabase
        .from("courses")
        .select("completion_percent, total_time_seconds, current_streak, last_session_at")
        .eq("id", existing.course_id)
        .eq("user_id", user.id)
        .single();
      if (selMin.error) {
        console.error("[sessions PATCH] course select failed", selFull.error, selMin.error);
        courseRow = null;
      } else if (selMin.data) {
        courseRow = { ...selMin.data, module_stats: {} };
      } else {
        courseRow = null;
      }
    }

    if (!courseRow) {
      console.error("[sessions PATCH] could not read course; skipping course aggregate sync");
    } else {
      const prevPct = Number(courseRow.completion_percent ?? 0);

      const { count: checkpointCount } = await supabase
        .from("checkpoints")
        .select("id", { count: "exact", head: true })
        .eq("course_id", existing.course_id);

      const totalCp = Math.max(
        0,
        Math.round(Number(checkpointCount ?? existing.checkpoints_total ?? 0)),
      );

      const { data: endedSessions } = await supabase
        .from("sessions")
        .select("metadata, correct_count, wrong_count")
        .eq("course_id", existing.course_id)
        .eq("user_id", user.id)
        .not("ended_at", "is", null);

      const masteryPct = courseMasteryPercent(totalCp, endedSessions ?? []);
      const nextPct = Math.max(prevPct, masteryPct);

      const addSeconds =
        durationN !== undefined && !Number.isNaN(durationN) ? Math.round(durationN) : 0;
      const totalTime = Number(courseRow.total_time_seconds ?? 0) + addSeconds;

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const y = new Date(now);
      y.setUTCDate(y.getUTCDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      const last = courseRow.last_session_at
        ? new Date(courseRow.last_session_at as string).toISOString().slice(0, 10)
        : null;
      const prevStreak = Number(courseRow.current_streak ?? 0);
      let newStreak = 1;
      if (last === todayStr) {
        newStreak = Math.max(prevStreak, 1);
      } else if (last === yStr) {
        newStreak = prevStreak + 1;
      } else if (last) {
        newStreak = 1;
      } else {
        newStreak = 1;
      }

      const prevModuleStats = normalizeModuleStats(courseRow.module_stats);
      const nextModuleStats =
        sessionRollup && sessionRollup.length > 0
          ? mergeRollupIntoModuleStats(prevModuleStats, sessionRollup)
          : prevModuleStats;

      const nowIso = new Date().toISOString();
      /* Apply streak / completion / time in a separate update from module_stats so a bad
       * jsonb or missing module_stats column cannot roll back the whole course row. */
      const { error: coreCourseErr } = await supabase
        .from("courses")
        .update({
          completion_percent: nextPct,
          total_time_seconds: totalTime,
          current_streak: newStreak,
          last_session_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", existing.course_id)
        .eq("user_id", user.id);

      if (coreCourseErr) {
        console.error("[sessions PATCH] course core fields update failed", coreCourseErr);
      } else if (sessionRollup && sessionRollup.length > 0) {
        const { error: modErr } = await supabase
          .from("courses")
          .update({
            module_stats: nextModuleStats,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.course_id)
          .eq("user_id", user.id);
        if (modErr) {
          console.warn("[sessions PATCH] module_stats update skipped:", modErr.message);
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/courses");
    revalidatePath(`/courses/${existing.course_id}`);
  }

  return NextResponse.json({ ok: true });
}
