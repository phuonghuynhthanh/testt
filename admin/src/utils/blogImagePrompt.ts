import type { BlogCategory } from "../types/Blog";

type BuildBlogImagePromptInput = {
  title: string;
  category?: BlogCategory | string;
  tag?: string;
  seoKeywords?: string[];
  seoDescription?: string;
  aspectRatio?: string;
  customPrompt?: string;
};

const categoryVisualIntent: Record<string, string> = {
  NEWS: "timely editorial mood with a clear real-world context",
  INVESTMENT_INSIGHTS:
    "smart decision-making, opportunity, risk, or strategy visual metaphor",
  FOREIGN_INVESTMENT:
    "cross-border context, places, systems, goods, infrastructure, or global movement",
  KNOWLEDGE_BASE:
    "educational explainer style with a clear and memorable visual metaphor",
  ALL: "professional editorial banner with a title-specific concept",
};

// Trim optional prompt inputs before building the image request.
const sanitize = (value?: string) => (value || "").trim();

// Build a title-first image prompt with strict no-text and low-face-risk constraints.
export const buildBlogBannerPrompt = ({
  title,
  category,
  tag,
  seoKeywords = [],
  seoDescription,
  aspectRatio = "16:9",
  customPrompt,
}: BuildBlogImagePromptInput) => {
  const cleanTitle = sanitize(title);
  const cleanTag = sanitize(tag);
  const cleanDesc = sanitize(seoDescription);
  const cleanCustomPrompt = sanitize(customPrompt);
  const cleanKeywords = seoKeywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 8);

  const visualIntent =
    categoryVisualIntent[String(category || "").toUpperCase()] ||
    "professional editorial banner with a title-specific concept";

  const baseContext = [
    "Create a visually distinctive web blog hero image.",

    "The image should feel fresh, bright, expressive, and visually memorable rather than corporate or overly technical.",

    "Primary goal: visually interpret the article title through atmosphere, symbolism, objects, environments, or conceptual storytelling.",

    "Do not default to finance visuals, trading screens, dashboards, laptops, charts, or blue cyberpunk aesthetics unless explicitly required by the topic.",

    "Favor creative editorial art direction, magazine-style composition, cinematic daylight, tactile materials, natural environments, architectural scenes, abstract forms, or conceptual metaphors.",

    "Use varied color palettes freely depending on the article mood. Bright neutrals, warm sunlight, earth tones, soft shadows, colorful accents, foggy mornings, silver tones, oranges, whites, greens, concrete textures, and natural materials are encouraged.",

    "Avoid repetitive dark blue palettes, teal lighting, neon finance aesthetics, generic startup visuals, and identical moods.",

    `Target aspect ratio: ${aspectRatio}.`,

    "Composition should feel elegant, clean, modern, and visually intelligent with a clear focal point.",

    "Prefer airy layouts with depth, negative space, and balanced lighting rather than dark cramped scenes.",

    "Avoid human faces and portraits whenever possible.",

    "No text, letters, numbers, logos, watermark, or UI screenshots.",

    "The image should feel like artwork from a premium modern publication, not a stock finance website.",

    `Visual intent: ${visualIntent}.`,
  ];
  const articleContext: string[] = [];
  if (cleanTitle) {
    articleContext.push(`Article title (highest priority): "${cleanTitle}".`);
    articleContext.push(
      `Build the scene around this exact title: "${cleanTitle}".`,
    );
  }
  if (cleanTag) articleContext.push(`Primary tag: ${cleanTag}.`);
  if (cleanKeywords.length > 0) {
    articleContext.push(
      `SEO keywords (secondary support only): ${cleanKeywords.join(", ")}.`,
    );
  }
  if (cleanDesc) articleContext.push(`Article summary context: ${cleanDesc}.`);

  const promptParts = [...baseContext, ...articleContext];

  if (cleanCustomPrompt) {
    promptParts.push(
      `Additional direction (must still stay faithful to title): ${cleanCustomPrompt}.`,
    );
  }

  return promptParts.join(" ");
};
