import { GEMINI_API_KEY } from "../config/config";
import type { ICrawledData } from "../types/Blog";

interface LLMMessage {
  role: string;
  content: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

// Extract a JSON value from plain text or a fenced Gemini response.
function extractJson(text: string): string {
  if (!text) return "";

  let raw: unknown = text.trim();

  // 1. If the entire text is a JSON string → parse it first
  // E.g., "{ \"text\": \"```json ...```\" }"
  if (
    typeof raw === "string" &&
    ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")))
  ) {
    try {
      raw = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  // 2. If is an object with text property → use it
  if (
    typeof raw === "object" &&
    raw !== null &&
    "text" in raw &&
    typeof raw.text === "string"
  ) {
    raw = raw.text;
  }

  if (typeof raw !== "string") {
    return JSON.stringify(raw);
  }

  let normalized = raw.trim();

  // 3. Remove ```json ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = normalized.match(codeBlockRegex);
  if (match?.[1]) {
    normalized = match[1].trim();
  }

  // 4. If is a valid JSON array → return it
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    return normalized;
  }

  // 5. if JSON is valid → return
  if (normalized.startsWith("{") && normalized.endsWith("}")) {
    return normalized;
  }

  // 6. Fallback: find array
  const arrayMatch = normalized.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  // 7. Fallback: object
  const objectMatch = normalized.match(/{[\s\S]*}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  return "";
}

// Send a normalized chat transcript to Gemini and return its JSON payload.
export async function callLLM(messages: LLMMessage[]) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === "user" ? "user" : "model",
          parts: [{ text: message.content }],
        })),
      }),
    },
  );

  const data = (await res.json()) as GeminiResponse;

  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return extractJson(output);
}

// Convert crawled reference content into a compact prompt context.
export const buildContextFromCrawData = (crawData: ICrawledData[]) => {
  if (!crawData?.length) return "";

  return crawData
    .map((item) => `- ${item.text?.trim() || item.title}`)
    .join("\n");
};
