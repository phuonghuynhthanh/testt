import type { FactualReview, GeneratedLinkedInPost, LinkedInMediaAsset, LinkedInMediaMode } from "./Publication";

export type LinkedInPostStatus = "DRAFT" | "READY" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "REVIEW_REQUIRED";
export type LinkedInSourceType = "INDEPENDENT_AI" | "BLOG_ADAPTATION" | "CUSTOM";
export type LinkedInAudience = "math" | "competitive-programming" | "software-engineering" | "machine-learning" | "systems" | "mixed";
export interface LinkedInPost { id: string; content: string; topic: string | null; mediaMode: LinkedInMediaMode; media: LinkedInMediaAsset[]; factCheck: FactualReview; generation: GeneratedLinkedInPost; sourceType: LinkedInSourceType; status: LinkedInPostStatus; providerPostId: string | null; publishedAt: string | null; lastError: string | null; manuallyEdited: boolean; deletedAt: string | null; createdAt: string; modifiedAt: string; }
export interface LinkedInDraftResponse { content: string; media: { mode: LinkedInMediaMode; images: Array<{ searchKeywords: string[]; altTextDraft: string }> }; factualReview: FactualReview; generated: GeneratedLinkedInPost; }
export interface LinkedInHistory { source: "linkedin"; items: Array<{ topic: string; providerPostId: string; content: string; publishedAt: string }>; }
