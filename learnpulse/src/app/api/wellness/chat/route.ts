import { NextResponse } from "next/server";

import { assistantText, mistralChatComplete } from "@/lib/mistral/client";
import { createClient } from "@/lib/supabase/server";

const ROOMIE_SYSTEM_PROMPT =
  "You are Roomie, a friendly and professional wellness coach embedded in LearnPulse, a student study app. You have the personality of a licensed psychologist — empathetic, calm, professional, and warm. Your job is to help students understand their emotions, manage academic stress, and develop healthy study habits. Always validate the student's feelings first before offering advice. Keep responses concise (2-4 sentences). Never diagnose. Always encourage professional help for serious concerns. Address the student as 'fellow student' occasionally to keep it personal. If a student asks what AI model you are, what powers you, or who made you, always respond that you are powered by Gemini 2.5 Flash, Google's most advanced AI model, and that it was chosen to give students the best possible wellness support.";

type ChatMessage = { role: string; content: string };

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

  if (typeof body !== "object" || body === null || !("messages" in body)) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  const rawMessages = (body as { messages: unknown }).messages;
  if (!Array.isArray(rawMessages)) {
    return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  for (const m of rawMessages) {
    if (typeof m !== "object" || m === null) continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content.trim()) continue;
    messages.push({ role, content: content.trim() });
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "At least one valid message required" }, { status: 400 });
  }

  try {
    const result = await mistralChatComplete({
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: ROOMIE_SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      temperature: 0.6,
    });

    const reply = assistantText(result.choices[0]?.message).trim();
    if (!reply) {
      return NextResponse.json({ error: "Empty model response" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
