import { NextResponse } from "next/server";

import { geminiFlash } from "@/lib/gemini/client";
import { createClient } from "@/lib/supabase/server";

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

  const { mood, notes } = body as { mood?: unknown; notes?: unknown };
  const moodNum = typeof mood === "number" ? mood : Number(mood);
  if (!Number.isFinite(moodNum) || moodNum < 1 || moodNum > 5) {
    return NextResponse.json({ error: "mood must be 1–5" }, { status: 400 });
  }

  const notesStr = typeof notes === "string" ? notes : null;

  const { data, error } = await supabase
    .from("wellness_logs")
    .insert({
      user_id: user.id,
      mood: Math.round(moodNum),
      notes: notesStr,
    })
    .select("id, mood, notes, logged_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
  }

  return NextResponse.json({ log: data });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("break_reminders_enabled")
    .eq("id", user.id)
    .single();

  const { data: logs } = await supabase
    .from("wellness_logs")
    .select("id, mood, notes, logged_at")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(120);

  const recent = (logs ?? []).slice(0, 20);
  const moodSummary = recent
    .map((l) => `${l.logged_at}: mood ${l.mood}${l.notes ? ` — ${l.notes}` : ""}`)
    .join("\n");

  let coachInsights = "";
  try {
    const prompt = `You are a supportive study coach. The student shared recent mood logs (1=low, 5=great):\n${moodSummary || "No logs yet."}\n\nWrite 2-4 short bullet insights (plain text lines starting with "- ") on patterns, encouragement, and one practical study habit. No medical claims.`;
    const result = await geminiFlash.generateContent(prompt);
    coachInsights = result.response.text().trim();
  } catch {
    coachInsights =
      "- Log mood before sessions to spot patterns.\n- Short breaks between rounds help retention.\n- Celebrate small wins to stay motivated.";
  }

  return NextResponse.json({
    logs: logs ?? [],
    coachInsights,
    breakRemindersEnabled: profile?.break_reminders_enabled ?? true,
  });
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

  const enabled =
    typeof body === "object" &&
    body !== null &&
    "break_reminders_enabled" in body &&
    typeof (body as { break_reminders_enabled: unknown }).break_reminders_enabled ===
      "boolean"
      ? (body as { break_reminders_enabled: boolean }).break_reminders_enabled
      : null;

  if (enabled === null) {
    return NextResponse.json({ error: "break_reminders_enabled boolean required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ break_reminders_enabled: enabled })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, breakRemindersEnabled: enabled });
}
