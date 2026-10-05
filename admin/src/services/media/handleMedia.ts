import getAxiosClient from "../../lib/axios/axiosClient";
import type { PexelsCandidate, UploadedMedia } from "../../types/Publication";

export type AIImagePurpose = "BLOG_BANNER" | "LINKEDIN";
export type AIAspectRatio = "16:9" | "1:1" | "4:5" | "4:3";
export type AIImageQuality = "FAST" | "BALANCED" | "HIGH";

export interface GeneratedAIImage {
  media: UploadedMedia;
  width: number;
  height: number;
  aspectRatio: string;
  size: "1K";
  quality: AIImageQuality;
}

// Ask the server-owned Cloudflare workflow for a reviewable media candidate.
export const generateAIImage = async (data: {
  purpose: AIImagePurpose;
  prompt?: string;
  context?: string;
  negativePrompt?: string;
  aspectRatio?: AIAspectRatio;
  size: "1K";
  quality?: AIImageQuality;
  altText?: string;
}) => (await getAxiosClient().post<GeneratedAIImage>("/media/ai/generate", data)).data;

// Search Pexels for banner candidates without attaching anything.
export const searchPexelsBanners = async (keywords: string[]) =>
  (await getAxiosClient().post<{ items: PexelsCandidate[] }>("/media/pexels/search", keywords)).data.items;

// Import an explicitly selected Pexels candidate before changing the article banner.
export const importPexelsBanner = async (candidate: PexelsCandidate) =>
  (await getAxiosClient().post<UploadedMedia>("/media/pexels/import", candidate)).data;
