import { geminiFlash } from "@/lib/gemini/client";

export interface GeminiCheckpoint {
  chapterIndex: number;
  chapterTitle: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface GeminiCurriculum {
  title: string;
  subject: string;
  chapters: { title: string; summary: string }[];
  checkpoints: GeminiCheckpoint[];
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

export async function generateCurriculumFromFile(params: {
  mimeType: string;
  base64: string;
  filename: string;
}): Promise<GeminiCurriculum> {
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

  const result = await geminiFlash.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: params.mimeType,
        data: params.base64,
      },
    },
  ]);

  const text = result.response.text();
  const parsed = extractJson(text) as GeminiCurriculum;

  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.subject !== "string" ||
    !Array.isArray(parsed.chapters) ||
    !Array.isArray(parsed.checkpoints)
  ) {
    throw new Error("Gemini returned an invalid curriculum shape");
  }

  return parsed;
}
