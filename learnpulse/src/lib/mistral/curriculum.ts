import type { ContentChunk, UserMessage } from "@mistralai/mistralai/models/components";

import { assistantText, mistralChatComplete, MISTRAL_MODEL } from "@/lib/mistral/client";

export interface CurriculumCheckpoint {
  chapterIndex: number;
  chapterTitle: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface GeneratedCurriculum {
  title: string;
  subject: string;
  chapters: { title: string; summary: string }[];
  checkpoints: CurriculumCheckpoint[];
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

function userMessageForFile(params: {
  prompt: string;
  mimeType: string;
  base64: string;
  filename: string;
}): UserMessage {
  if (params.mimeType === "text/plain") {
    const decoded = Buffer.from(params.base64, "base64").toString("utf8");
    return {
      role: "user",
      content: `${params.prompt}\n\n---\nFile "${params.filename}" (text/plain):\n${decoded}`,
    };
  }

  const dataUrl = `data:${params.mimeType};base64,${params.base64}`;
  const chunks: ContentChunk[] = [
    { type: "text", text: params.prompt },
    {
      type: "document_url",
      documentUrl: dataUrl,
      documentName: params.filename,
    },
  ];
  return { role: "user", content: chunks };
}

export async function generateCurriculumFromFile(params: {
  mimeType: string;
  base64: string;
  filename: string;
}): Promise<GeneratedCurriculum> {
  const prompt = `You are an expert instructional designer. The user uploaded study material (${params.filename}, ${params.mimeType}).

Analyze the content and return ONLY valid JSON (no markdown outside JSON) with this exact shape:
{
  "title": "short course title",
  "subject": "e.g. Biology, History, CS — one label",
  "chapters": [ { "title": string, "summary": string } ],
  "checkpoints": [
    {
      "chapterIndex": 0-based index into chapters,
      "chapterTitle": "must match chapters[chapterIndex].title",
      "question": "clear multiple choice stem",
      "options": ["A","B","C","D"] (exactly 4 distinct strings),
      "correctIndex": 0|1|2|3,
      "explanation": "1-3 sentences, grounded in the material"
    }
  ]
}

Rules:
- Produce between 12 and 24 checkpoints spread across chapters.
- Questions must be answerable from the uploaded material.
- "correctIndex" is 0-based index into "options".
`;

  const result = await mistralChatComplete({
    model: MISTRAL_MODEL,
    messages: [userMessageForFile({ prompt, ...params })],
    temperature: 0.2,
  });

  const text = assistantText(result.choices[0]?.message).trim();
  const parsed = extractJson(text) as GeneratedCurriculum;

  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.subject !== "string" ||
    !Array.isArray(parsed.chapters) ||
    !Array.isArray(parsed.checkpoints)
  ) {
    throw new Error("Mistral returned an invalid curriculum shape");
  }

  return parsed;
}
