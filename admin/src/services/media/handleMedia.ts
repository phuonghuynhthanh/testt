import getAxiosClient from "../../lib/axios/axiosClient";
import type { UploadedMedia } from "../../types/Publication";

export type AIImagePurpose = "BLOG_BANNER" | "LINKEDIN";
export type AIAspectRatio = "16:9" | "1:1" | "4:5" | "4:3";
export type AIImageQuality = "FAST" | "BALANCED" | "HIGH";

export interface GeneratedAIImage {
  media: UploadedMedia;
  width: number;
  height: number;
  aspectRatio: AIAspectRatio;
  size: "1K";
  quality: AIImageQuality;
}

// Ask the server-owned Cloudflare workflow for a reviewable media candidate.
export const generateAIImage = async (data: {
  purpose: AIImagePurpose;
  prompt?: string;
  context?: string;
  negativePrompt?: string;
  aspectRatio: AIAspectRatio;
  size: "1K";
  quality: AIImageQuality;
  altText?: string;
}) => (await getAxiosClient().post<GeneratedAIImage>("/media/ai/generate", data)).data;
