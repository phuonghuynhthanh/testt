import type { FactualReview, GeneratedLinkedInPost, LinkedInLinkPlacement, LinkedInMediaAsset, LinkedInMediaMode } from "./Publication";
import type { ProviderError } from "./Api";

export type LinkedInPostStatus = "DRAFT" | "READY" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "REVIEW_REQUIRED";
export type LinkedInSourceType = "INDEPENDENT_AI" | "BLOG_ADAPTATION" | "CUSTOM";
export type LinkedInAudience = string | null;
export interface LinkedInPost { blogId?: string | null; blogTitle?: string | null; id: string; content: string; topic: string | null; mediaMode: LinkedInMediaMode; media: LinkedInMediaAsset[]; factCheck: FactualReview; generation: GeneratedLinkedInPost; sourceType: LinkedInSourceType; linkPlacement: LinkedInLinkPlacement; status: LinkedInPostStatus; providerPostId: string | null; publishedLinkUrl: string | null; publishedAt: string | null; lastError: ProviderError | string | null; manuallyEdited: boolean; deletedAt: string | null; createdAt: string; modifiedAt: string; }
export interface LinkedInDraftResponse { content: string; media: { mode: LinkedInMediaMode; images: Array<{ searchKeywords: string[]; altTextDraft: string }> }; factualReview: FactualReview; generated: GeneratedLinkedInPost; }
export interface LinkedInHistory { source: "linkedin"; items: Array<{ topic: string; providerPostId: string; content: string; publishedAt: string }>; }
