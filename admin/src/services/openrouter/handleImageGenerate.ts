import {
  OPEN_ROUTER_API_KEY,
  OPEN_ROUTER_IMAGE_MODEL,
} from "../../config/config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = OPEN_ROUTER_IMAGE_MODEL || "openai/gpt-5-image-mini";
const FALLBACK_MODELS = [
  "openai/gpt-5-image-mini",
  "openai/gpt-5-image",
  "openai/gpt-5.4-image-2",
  "google/gemini-2.5-flash-image",
];

export type ImageAspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export type ImageSize = "1K" | "2K" | "4K";
export type ImageQuality = "low" | "medium" | "high";

export type GenerateImageOptions = {
  model?: string;
  aspectRatio?: ImageAspectRatio;
  imageSize?: ImageSize;
  quality?: ImageQuality;
};

type OpenRouterImage = {
  image_url?: {
    url?: string;
  };
};

type OpenRouterResponse = {
  error?: {
    message?: string;
    code?: number;
  };
  choices?: Array<{
    message?: {
      images?: OpenRouterImage[];
    };
  }>;
};

// Convert a returned data URL into a browser File for the existing upload flow.
const dataUrlToFile = async (
  dataUrl: string,
  fileName: string,
): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.includes("webp")
    ? "webp"
    : blob.type.includes("jpeg")
      ? "jpg"
      : "png";

  return new File([blob], `${fileName}.${extension}`, {
    type: blob.type || "image/png",
  });
};

// Generate a blog banner with the default low-cost image settings.
export const generateBannerWithOpenRouter = async (
  prompt: string,
): Promise<File> => {
  if (!OPEN_ROUTER_API_KEY) {
    throw new Error("Missing VITE_OPEN_ROUTER_API_KEY");
  }

  return generateBannerWithOpenRouterOptions(prompt);
};

// Build a de-duplicated fallback list so image generation can recover from unavailable models.
const buildModelCandidates = (preferredModel?: string): string[] => {
  const modelCandidates = [preferredModel || DEFAULT_MODEL, ...FALLBACK_MODELS];
  return [...new Set(modelCandidates.filter(Boolean))];
};

// Convert an OpenRouter response body into a readable error message.
const getErrorMessage = (raw: unknown, status: number) => {
  if (typeof raw === "string") return `OpenRouter error: ${status} ${raw}`;
  const data = raw as OpenRouterResponse;
  return `OpenRouter error: ${status} ${data.error?.message || "Unknown error"}`;
};

// Generate a banner image through OpenRouter using compact web-friendly defaults.
export const generateBannerWithOpenRouterOptions = async (
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<File> => {
  if (!OPEN_ROUTER_API_KEY) {
    throw new Error("Missing VITE_OPEN_ROUTER_API_KEY");
  }

  const candidates = buildModelCandidates(options.model);
  let lastError = "Unknown error";

  for (const candidateModel of candidates) {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPEN_ROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Quant-VN Admin",
      },
      body: JSON.stringify({
        model: candidateModel,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: options.aspectRatio || "16:9",
          image_size: options.imageSize || "1K",
          quality: options.quality || "low",
        },
        stream: false,
      }),
    });

    const text = await response.text();
    let parsed: OpenRouterResponse = {};
    try {
      parsed = text ? (JSON.parse(text) as OpenRouterResponse) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      const reason = getErrorMessage(
        Object.keys(parsed).length ? parsed : text,
        response.status,
      );
      lastError = reason;
      const invalidModel = reason
        .toLowerCase()
        .includes("not a valid model id");
      if (invalidModel) continue;
      throw new Error(reason);
    }

    const dataUrl = parsed.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      lastError = "No image returned from OpenRouter";
      continue;
    }
    return dataUrlToFile(dataUrl, `generated-banner-${Date.now()}`);
  }

  throw new Error(lastError);
};
