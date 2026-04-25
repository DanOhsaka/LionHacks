import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteParams = { id: string };

async function courseIdFromContext(context: { params: RouteParams | Promise<RouteParams> }) {
  const p = context.params;
  return p instanceof Promise ? await p : p;
}

/** Logs the full PostgREST / Supabase error shape for debugging. */
function logSupabaseError(context: string, err: unknown) {
  if (err !== null && typeof err === "object") {
    const o = err as Record<string, unknown>;
    console.error(`[DELETE /api/courses/[id]] ${context}`, {
      message: o.message,
      details: o.details,
      hint: o.hint,
      code: o.code,
    });
    try {
      console.error(`[DELETE /api/courses/[id]] ${context} (full JSON):`, JSON.stringify(err, null, 2));
    } catch {
      console.error(`[DELETE /api/courses/[id]] ${context} (stringify failed)`, String(err));
    }
  } else {
    console.error(`[DELETE /api/courses/[id]] ${context}`, err);
  }
}

export async function DELETE(_request: Request, context: { params: RouteParams | Promise<RouteParams> }) {
  try {
    const { id } = await courseIdFromContext(context);
    if (!id?.trim()) {
      return NextResponse.json({ error: "Course id required" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      logSupabaseError("auth.getUser()", authError);
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      logSupabaseError("verify course (select)", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error: checkpointsError } = await supabase.from("checkpoints").delete().eq("course_id", id);
    if (checkpointsError) {
      logSupabaseError("delete checkpoints", checkpointsError);
      return NextResponse.json({ error: checkpointsError.message }, { status: 500 });
    }

    const { error: sessionsError } = await supabase
      .from("sessions")
      .delete()
      .eq("course_id", id)
      .eq("user_id", user.id);
    if (sessionsError) {
      logSupabaseError("delete sessions", sessionsError);
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const { data: deleted, error: deleteCourseError } = await supabase
      .from("courses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (deleteCourseError) {
      logSupabaseError("delete course", deleteCourseError);
      return NextResponse.json({ error: deleteCourseError.message }, { status: 500 });
    }
    if (!deleted) {
      const msg =
        "Delete did not remove the course row. Check RLS policies on `courses` or concurrent updates.";
      console.error("[DELETE /api/courses/[id]] delete course: no row returned after delete", { id, userId: user.id });
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /api/courses/[id]] unexpected:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
