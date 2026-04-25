import { NextResponse } from "next/server";

import { assistantText, mistralChatComplete } from "@/lib/mistral/client";
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

  const { question, explanation } = body as {
    question?: unknown;
    explanation?: unknown;
  };

  if (typeof question !== "string" || typeof explanation !== "string") {
    return NextResponse.json({ error: "question and explanation required" }, { status: 400 });
  }

  try {
    const r = await mistralChatComplete({
      messages: [
        {
          role: "user",
          content: `In 2 short sentences, clarify the correct reasoning for this question, building on: "${explanation.slice(0, 800)}". Question: "${question.slice(0, 400)}". Plain text only.`,
        },
      ],
      temperature: 0.3,
    });
    const text = assistantText(r.choices[0]?.message).trim();
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
