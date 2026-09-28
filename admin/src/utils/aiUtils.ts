import { GEMINI_API_KEY } from "../config/config";
import type { ICrawledData } from "../types/Blog";

function extractJson(text: string): string {
  if (!text) return "";

  let raw: any = text.trim();

  // 1. If the entire text is a JSON string → parse it first
  // E.g., "{ \"text\": \"```json ...```\" }"
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    try {
      raw = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  // 2. If is an object with text property → use it
  if (typeof raw === "object" && raw?.text) {
    raw = raw.text;
  }

  if (typeof raw !== "string") {
    return JSON.stringify(raw);
  }

  raw = raw.trim();

  // 3. Remove ```json ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = raw.match(codeBlockRegex);
  if (match?.[1]) {
    raw = match[1].trim();
  }

  // 4. If is a valid JSON array → return it
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw;
  }

  // 5. if JSON is valid → return
  if (raw.startsWith("{") && raw.endsWith("}")) {
    return raw;
  }

  // 6. Fallback: find array
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  // 7. Fallback: object
  const objectMatch = raw.match(/{[\s\S]*}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  return "";
}
export async function callLLM(messages: any) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: messages.map((m: any) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      }),
    },
  );

  const data = await res.json();

  const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return extractJson(output);
}

export const buildContextFromCrawData = (crawData: ICrawledData[]) => {
  if (!crawData?.length) return "";

  return crawData
    .map((item) => `- ${item.text?.trim() || item.title}`)
    .join("\n");
};
