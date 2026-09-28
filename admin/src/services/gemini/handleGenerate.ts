import type { ICrawledData } from "../../types/Blog";
import { buildContextFromCrawData, callLLM } from "../../utils/aiUtils";

// Generate 3 SEO-optimized blog titles and descriptions in the specified language using keywords and intents.
// Generate 3 SEO-optimized blog titles and descriptions in the specified language using keywords and intents.
export const handleAiGenerateTitle = async (
  keywords: string[],
  intends: string[],
  language: string,
) => {
  const prompt = `
I’m writing a blog.

Create a list of 3 suggested titles in ${language} using the following JSON format:

Create EXACTLY 3 items.

STRICT OUTPUT SCHEMA:
[
  {
    "title": string,
    "description": string
  }
]

RULES:
- Return EXACTLY 3 objects
- No extra fields
- Values must be plain strings (no markdown, no quotes inside)

Requirements:
- Each item must have both "title" and "description"
- Light SEO optimization
- Natural writing — do not keyword-stuff
- Base the ideas on these keywords: ${keywords.join(", ")} and ${intends.join(", ")}
- Return ONLY valid JSON. Do NOT add anything else.
`;

  const raw = await callLLM([
    {
      role: "system",
      content:
        "You are a JSON API. Your output will be parsed by JSON.parse(). Any invalid JSON is a failure.",
    },
    { role: "user", content: prompt },
  ]);

  const parsed = JSON.parse(raw);

  return parsed as {
    title: string;
    description: string;
  }[];
};

// Generate a blog outline (max 6 items) in the specified language using keywords and optional crawled data for context.
export const aiGenerateOutlineByKeywords = async (
  keywords: string[],
  language: string,
  crawData: ICrawledData[],
) => {
  const context = buildContextFromCrawData(crawData);

  const prompt = `
You are an SEO and content specialist.

MISSION:
Create a blog outline in ${language} based on the keywords:

${keywords.join(", ")}

REFERENCE MATERIALS (use main ideas, do NOT copy text directly):
${context || "(no materials available, infer reasonably)"}

REQUIREMENTS:
- Write as a list
- Maximum 6 items
- Each item must be one line, concise, meaningful, maximally 60 characters
- Structure should roughly follow: introduction → content → examples → conclusion
- Do NOT add explanations
- RETURN ONLY JSON:

[
  "Item 1",
  "Item 2",
  "Item 3"
]
`;

  const raw = await callLLM([
    {
      role: "system",
      content:
        "Always return valid JSON. Do not add anything outside JSON.Return only a JSON array of strings. No markdown. No lists. No explanations.",
    },
    { role: "user", content: prompt },
  ]);

  try {
    return JSON.parse(raw) as string[];
  } catch (err) {
    console.error("Parse outline failed:", err);
    return [];
  }
};

// Generate a numbered blog outline (max 6 items) based on title, keywords, language, and optional crawled data.
export const aiGenerateOutlineByTileAndTile = async (
  keywords: string[],
  title: string,
  language: string,
  crawData: ICrawledData[],
) => {
  const context = buildContextFromCrawData(crawData);

  const prompt = `
You are an SEO expert.

MISSION:
Create an outline for the article:

Title: ${title}
Language: ${language}
Keywords: ${keywords.join(", ")}

REFERENCE MATERIALS:
${context || "(no materials, infer reasonably)"}

NUMBERING RULE:
- Each item MUST start with "1. ", "2. ", etc.
- Use dot "." only, no other symbols
- Numbers must be sequential starting from 1

REQUIREMENTS:
- Write as a numbered list
- Maximum 6 items
- Each item must be one line, concise, meaningful, maximally 60 characters
- Logical flow: introduction → main content → examples → conclusion
- Do NOT write the article, only the outline
- RETURN ONLY JSON:

[
  "1. ...",
  "2. ...",
  "3. ..."
]
`;

  const raw = await callLLM([
    {
      role: "system",
      content: "Always return valid JSON. Do not explain anything else.",
    },
    { role: "user", content: prompt },
  ]);

  try {
    return JSON.parse(raw) as string[];
  } catch (err) {
    console.error("Parse outline failed:", err);
    return [];
  }
};

// Generate full blog content (markdown) based on outline and keywords, without including the title in the content.
export const aiGenerateBlogWithoutTitle = async (
  keywords: string[],
  outline: string[],
  language: string,
) => {
  const prompt = `
SYSTEM CONTRACT — READ CAREFULLY:

You are generating a response for an automated system.
Your output will be parsed using JSON.parse(raw).

❌ ANY wrapper object such as { "text": ... }, { "data": ... }, { "output": ... } IS FORBIDDEN.
❌ ANY explanation, prefix, suffix, or extra text IS FORBIDDEN.
❌ ANY invalid JSON IS A FAILURE.

✅ You MUST return EXACTLY ONE JSON OBJECT.
✅ The object MUST have EXACTLY ONE key: "content".
✅ The value of "content" MUST be a single string.

=========================

TASK:

Write a blog article in ${language}.

Use the outline below.
EVERY line in the outline MUST become ONE main section.

OUTLINE:
${outline.join("\n")}

=========================

CONTENT RULES:

- Use Markdown
- Base content on these keywords: ${keywords.join(", ")}
- Do NOT include or mention the blog title
- Clear, professional, easy to read
- No emojis, no fluff

=========================

SECTION FORMAT (MANDATORY):

Each section MUST follow EXACTLY this format:

## {number}. Section title
Section content...

Rules:
- Use ONLY "##" for main sections
- Numbers must start at 1 and be sequential
- Number of sections MUST equal outline length
- Do NOT add or remove sections
- Do NOT add content before the first section

=========================

FINAL OUTPUT RULES (ABSOLUTE):

- Return ONLY the JSON object
- No wrapping, no nesting, no code blocks
- Output MUST start with { and end with }
- NOTHING before or after the JSON

FINAL OUTPUT FORMAT (EXACT):

{
  "content": "FULL ARTICLE CONTENT IN MARKDOWN"
}
`;
  const raw = await callLLM([
    {
      role: "system",
      content:
        "You are a content generator that outputs strict JSON for automated pipelines. Any deviation is an error.",
    },
    { role: "user", content: prompt },
  ]);

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Parse blog content failed:", err);
  }
};

// Generate full blog content (markdown) with a given title, outline, and keywords, referencing a sample link.
export const aiGenerateBlogWithTitle = async (
  keywords: string[],
  title: string,
  outline: string[],
  language: string,
) => {
  const prompt = `
SYSTEM CONTRACT — READ CAREFULLY:
Write an article with the title: ${title} (language: ${language})
You are generating a response for an automated system.
Your output will be parsed using JSON.parse(raw).

❌ ANY wrapper object such as { "text": ... }, { "data": ... }, { "output": ... } IS FORBIDDEN.
❌ ANY explanation, prefix, suffix, or extra text IS FORBIDDEN.
❌ ANY invalid JSON IS A FAILURE.

✅ You MUST return EXACTLY ONE JSON OBJECT.
✅ The object MUST have EXACTLY ONE key: "content".
✅ The value of "content" MUST be a single string.

=========================

TASK:

Write a blog article in ${language}.

Use the outline below.
EVERY line in the outline MUST become ONE main section.

OUTLINE:
${outline.join("\n")}

=========================

CONTENT RULES:

- Use Markdown
- Base content on these keywords: ${keywords.join(", ")}
- Do NOT include or mention the blog title
- Clear, professional, easy to read
- No emojis, no fluff

=========================

SECTION FORMAT (MANDATORY):

Each section MUST follow EXACTLY this format:

## {number}. Section title
Section content...

Rules:
- Use ONLY "##" for main sections
- Numbers must start at 1 and be sequential
- Number of sections MUST equal outline length
- Do NOT add or remove sections
- Do NOT add content before the first section

=========================

FINAL OUTPUT RULES (ABSOLUTE):

- Return ONLY the JSON object
- No wrapping, no nesting, no code blocks
- Output MUST start with { and end with }
- NOTHING before or after the JSON

FINAL OUTPUT FORMAT (EXACT):

{
  "content": "FULL ARTICLE CONTENT IN MARKDOWN"
}
`;

  const raw = await callLLM([
    {
      role: "system",
      content:
        "You are a content generator that outputs strict JSON for automated pipelines. Any deviation is an error.",
    },
    { role: "user", content: prompt },
  ]);

  try {
    const parsed = JSON.parse(raw);

    if (!parsed?.content || typeof parsed.content !== "string") {
      throw new Error("Invalid JSON structure");
    }

    return parsed;
  } catch (err) {
    console.error("❌ Parse blog content failed");
    console.error("RAW OUTPUT:", raw);
    throw err;
  }
};

// Edit blog content based on user prompt, returning only the modified content without extra explanation.
export const aiGenerateEditContent = async (
  content: string,
  user_prompt: string,
) => {
  const prompt = `
You are an experienced professional editor.

Your task is to UPDATE the content according to the user's request.

IMPORTANT:
- Treat the original content as a variable named "content"
- You must return the FULL UPDATED version of this variable

ORIGINAL CONTENT (current value of "content"):

"""
${content}
"""

USER EDIT REQUEST:

"""
${user_prompt}
"""

EDITING RULES (STRICT):

1) Preserve meaning
- Keep the original intent, structure, and message
- Improve clarity, grammar, flow, or tone ONLY if relevant
- Do NOT change meaning unless explicitly requested

2) Scope control
- Apply edits ONLY related to the user's request
- If a specific part is mentioned, edit ONLY that part
- Do NOT rewrite unrelated sections

3) No fabrication
- Do NOT add new facts, examples, explanations, or assumptions
- Do NOT remove content unless clearly requested

4) Unclear requests
- Make the smallest reasonable improvement
- Avoid over-editing

OUTPUT FORMAT (VERY IMPORTANT):

- Return ONLY valid JSON
- The JSON must contain EXACTLY one field: "content"
- The value of "content" must be the FULL updated content as a plain string
- Do NOT include markdown, code blocks, comments, or extra text
- Do NOT escape unnecessarily

EXPECTED OUTPUT SCHEMA:

{
  "content": string
}

FINAL RULE:
Return ONLY the JSON object above. Any extra text is a failure.
`;

  const raw = await callLLM([
    {
      role: "system",
      content:
        "You are a professional text editor. Always obey instructions and return ONLY the edited content.",
    },
    { role: "user", content: prompt },
  ]);

  const parsed = JSON.parse(raw);

  return parsed.content;
};

// Generate a list of related intent keywords for blog writing, based on input keywords.
export const aiGenerateIntentKeywords = async (keywords: string[]) => {
  const prompt = `
I am researching keywords to write a blog post.

Input keywords:
${keywords
  .map((k) => k.replace(/\s+/g, " ").trim())
  .filter(Boolean)
  .join(", ")}

Please generate a list of related "intent keywords".

REQUIREMENTS:
- Directly relevant to the topic
- Match search intent (informational / commercial / transactional, etc.)
- No duplicates
- Short and natural
- RETURN JSON ONLY:

[
  "intent keyword 1",
  "intent keyword 2"
]
`;

  const data = await callLLM([
    {
      role: "system",
      content:
        "You are an SEO expert. Return only valid JSON. No explanations.",
    },
    { role: "user", content: prompt },
  ]);

  try {
    return JSON.parse(data);
  } catch (err) {
    console.error("Parse intent keywords failed:", err);
    return [];
  }
};
