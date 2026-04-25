import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/** 2.0 Flash is deprecated; free tier often reports limit 0. Use 2.5+ for API access. */
const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

export const geminiFlash = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
});

export async function generateFromPrompt(prompt: string) {
  const result = await geminiFlash.generateContent(prompt);
  return result.response.text();
}
