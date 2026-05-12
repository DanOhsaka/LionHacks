import { NextResponse } from "next/server";

import { assistantText, mistralChatComplete } from "@/lib/mistral/client";
import type { QuestionEvent } from "@/lib/session-analytics";
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

  const { events, course_title } = body as {
    events?: QuestionEvent[];
    course_title?: string;
  };

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({
      misconceptions: [] as string[],
      study_plan: "",
    });
  }

  const misses = events.filter((e) => e.outcome !== "correct");
  if (misses.length === 0) {
    return NextResponse.json({
      misconceptions: [],
      study_plan:
        "Strong round — keep a light review tomorrow on the hardest chapter to lock it in.",
    });
  }

  const summary = misses
    .slice(0, 12)
    .map(
      (e) =>
        `- (${e.outcome}) chapter "${e.chapter_title}" checkpoint ${e.checkpoint_id.slice(0, 8)}…`,
    )
    .join("\n");

  try {
    const res = await mistralChatComplete({
      messages: [
        {
          role: "user",
          content: `Course: ${course_title ?? "Study deck"}.
Here are missed quiz items (outcome, chapter, id stub):
${summary}

Reply with ONLY valid JSON (no markdown) in this shape:
{"misconceptions":["2-4 short theme labels learners often confuse"],"study_plan":"One paragraph: 3 concrete steps for the next 20-30 minutes, referencing chapters by name."}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 512,
    });

    const raw = assistantText(res.choices?.[0]?.message).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as {
          misconceptions?: unknown;
          study_plan?: unknown;
        })
      : null;

    const misconceptions = Array.isArray(parsed?.misconceptions)
      ? (parsed!.misconceptions as unknown[]).filter((x) => typeof x === "string").slice(0, 5)
      : [];

    const study_plan =
      typeof parsed?.study_plan === "string"
        ? parsed.study_plan
        : "Review the chapters where you missed items, then redo a short mixed quiz.";

    return NextResponse.json({ misconceptions, study_plan });
  } catch {
    return NextResponse.json({
      misconceptions: [
        "Pattern: mixed recall under time pressure — slow down and restate each answer in your own words before selecting.",
      ],
      study_plan:
        "Spend 10 minutes rereading the sections tied to your misses, then run this deck again in Zen mode without the timer.",
    });
  }
}
