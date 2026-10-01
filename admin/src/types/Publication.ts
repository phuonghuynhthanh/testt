import type { PostLanguage } from "./Language";

export type LinkedInMode = "SAME" | "SUMMARY" | "CUSTOM";

export type PublicationStatus =
  | "NOT_SELECTED"
  | "DRAFT"
  | "READY"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "REVIEW_REQUIRED";

export type LinkedInMediaMode = "none" | "single-image" | "multi-image";
export type LinkedInLinkPlacement = "NONE" | "IN_POST";

export interface PexelsCandidate {
  provider: "pexels";
  providerId: string;
  sourceUrl: string;
  imageUrl: string;
  photographer: string;
  attribution: string;
  altText: string;
  order: number;
}

export interface UploadedMedia {
  provider: "upload";
  objectKey: string;
  fileName: string;
  altText: string;
  order: number;
  origin?: "manual" | "cloudflare-ai";
}

export type LinkedInMediaAsset = PexelsCandidate | UploadedMedia;

export interface ImagePlan {
  slotId: string;
  order: number;
  role: string;
  preferredSource: "internal" | "pexels" | "generated";
  concept: string;
  searchKeywords: string[];
  altTextDraft: string;
}

export interface FactualReview {
  requiresHumanFactCheck: boolean;
  factCheckNotes: string[];
}

export interface LinkedInErrorData {
  code: string;
  message: string;
  providerStatus?: number;
  retryable?: boolean;
  duplicateRisk?: boolean;
  retryAfterMs?: number;
  attempts?: number;
}

export interface GeneratedLinkedInPost {
  language?: PostLanguage;
  content?: string;
  style?: string;
  openingType?: string;
  audience?: string;
  hookSource?: string;
  insight?: string;
  hashtags?: string[];
}

export interface Publication {
  id: string;
  blogId: string;
  publishWeb: boolean;
  publishLinkedin: boolean;
  linkedinMode: LinkedInMode;
  linkedinContent: string | null;
  linkedinLinkPlacement: LinkedInLinkPlacement;
  linkedinRecordId: string | null;
  linkedinStatus: PublicationStatus;
  linkedinPostId: string | null;
  linkedinPublishedAt: string | null;
  linkedinError: LinkedInErrorData | null;
  linkedinMediaMode: LinkedInMediaMode;
  linkedinMedia: Array<LinkedInMediaAsset | ImagePlan>;
  linkedinFactCheck: FactualReview | null;
  linkedinGenerated: GeneratedLinkedInPost | null;
  linkedinPublishedLinkUrl: string | null;
}

export interface LinkedInDraftResponse {
  content: string;
  media: { mode: LinkedInMediaMode; images: ImagePlan[] };
  factualReview: FactualReview;
  generated: GeneratedLinkedInPost;
}

export interface LinkedInCommand { mode: LinkedInMode; content: string; media: LinkedInMediaAsset[]; linkPlacement: LinkedInLinkPlacement; factCheck: FactualReview; generation: Record<string, unknown>; action: "SAVE_DRAFT" | "PUBLISH_NOW"; }

export interface PublicationUpdate {
  publishWeb: boolean;
  publishLinkedin: boolean;
  linkedinMode: LinkedInMode;
  linkedinLinkPlacement: LinkedInLinkPlacement;
}

export interface LinkedInDraftRequest {
  mode: Exclude<LinkedInMode, "CUSTOM">;
  linkPlacement: LinkedInLinkPlacement;
  regenerate: boolean;
  language?: PostLanguage;
}

export interface LinkedInContentUpdate {
  content?: string;
  media?: LinkedInMediaAsset[];
}

export interface MediaSuggestionRequest {
  keywords?: string[];
}

export interface OrganizationVerification {
  readyForOrganicPosting: boolean;
  identity: Record<string, unknown>;
  organization: Record<string, unknown>;
  roles: Array<Record<string, unknown>>;
  scopes: string[];
  permissions: Record<string, unknown>;
}
