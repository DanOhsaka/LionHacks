import { Mistral } from "@mistralai/mistralai";
import type {
  AssistantMessage,
  ChatCompletionRequest,
} from "@mistralai/mistralai/models/components";

const apiKey = process.env.MISTRAL_API_KEY ?? "";

/** Matches Mistral Document QnA and general chat; override with `MISTRAL_MODEL` in `.env.local`. */
export const MISTRAL_MODEL =
  process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest";

let client: Mistral | null = null;

function getClient(): Mistral {
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is not set");
  }
  client ??= new Mistral({ apiKey });
  return client;
}

export function assistantText(message: AssistantMessage | undefined): string {
  const content = message?.content;
  if (content == null) return "";
  if (typeof content === "string") return content;
  return content
    .map((chunk) => (chunk.type === "text" && "text" in chunk ? chunk.text : ""))
    .join("");
}

export async function mistralChatComplete(
  body: Omit<ChatCompletionRequest, "model"> & { model?: string },
) {
  const mistral = getClient();
  return mistral.chat.complete({
    ...body,
    model: body.model ?? MISTRAL_MODEL,
  });
}
