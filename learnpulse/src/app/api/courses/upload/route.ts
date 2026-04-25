import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { generateCurriculumFromFile } from "@/lib/gemini/curriculum";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 15 * 1024 * 1024;

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  txt: "text/plain",
};

function mimeFor(filename: string, declared?: string | null) {
  if (declared && declared !== "application/octet-stream") return declared;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = mimeFor(file.name, file.type);

  if (mimeType === "application/octet-stream") {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, Word, PowerPoint, or TXT." },
      { status: 400 },
    );
  }

  const objectPath = `${user.id}/${randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;

  const { error: uploadError } = await supabase.storage
    .from("course-materials")
    .upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 400 },
    );
  }

  let curriculum;
  try {
    curriculum = await generateCurriculumFromFile({
      mimeType,
      base64,
      filename: file.name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Curriculum generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const { data: courseRow, error: courseError } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      title: curriculum.title,
      subject: curriculum.subject,
      storage_path: objectPath,
      completion_percent: 0,
    })
    .select("id")
    .single();

  if (courseError || !courseRow) {
    return NextResponse.json(
      { error: courseError?.message ?? "Could not save course" },
      { status: 400 },
    );
  }

  const courseId = courseRow.id as string;
  const rows = curriculum.checkpoints.map((cp, idx) => ({
    user_id: user.id,
    course_id: courseId,
    chapter_index: cp.chapterIndex ?? 0,
    chapter_title: cp.chapterTitle || "Chapter",
    position: idx,
    question: cp.question,
    options: cp.options,
    correct_index: cp.correctIndex,
    explanation: cp.explanation ?? "",
  }));

  const { error: cpError } = await supabase.from("checkpoints").insert(rows);
  if (cpError) {
    return NextResponse.json({ error: cpError.message }, { status: 400 });
  }

  return NextResponse.json({ courseId });
}
