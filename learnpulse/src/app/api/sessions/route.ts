import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
    metadata,
  } = body as {
    session_id?: unknown;
    score?: unknown;
    duration_seconds?: unknown;
    accuracy_pct?: unknown;
    correct_count?: unknown;
    metadata?: unknown;
  };

  if (typeof session_id !== "string" || !session_id) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("sessions")
    .select("id, course_id, metadata")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    ended_at: new Date().toISOString(),
  };

  if (typeof score === "number") patch.score = score;
  if (typeof duration_seconds === "number") patch.duration_seconds = duration_seconds;
  if (typeof accuracy_pct === "number") patch.accuracy_pct = accuracy_pct;
  if (typeof correct_count === "number") patch.correct_count = correct_count;
  if (metadata && typeof metadata === "object") {
    const prev =
      existing.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};
    patch.metadata = { ...prev, ...(metadata as Record<string, unknown>) };
  }

  const { error } = await supabase.from("sessions").update(patch).eq("id", session_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (existing.course_id) {
    const { data: courseRow } = await supabase
      .from("courses")
      .select("completion_percent, total_time_seconds, current_streak, last_session_at")
      .eq("id", existing.course_id)
      .eq("user_id", user.id)
      .single();

    const prevPct = Number(courseRow?.completion_percent ?? 0);
    const acc =
      typeof accuracy_pct === "number" && !Number.isNaN(accuracy_pct)
        ? Math.round(accuracy_pct)
        : prevPct;
    const nextPct = Math.max(prevPct, acc);

    const addSeconds =
      typeof duration_seconds === "number" && !Number.isNaN(duration_seconds)
        ? duration_seconds
        : 0;
    const totalTime = Number(courseRow?.total_time_seconds ?? 0) + addSeconds;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const y = new Date(now);
    y.setUTCDate(y.getUTCDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    const last = courseRow?.last_session_at
      ? new Date(courseRow.last_session_at as string).toISOString().slice(0, 10)
      : null;
    const prevStreak = Number(courseRow?.current_streak ?? 0);
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

    await supabase
      .from("courses")
      .update({
        completion_percent: nextPct,
        total_time_seconds: totalTime,
        current_streak: newStreak,
        last_session_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.course_id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true });
}
