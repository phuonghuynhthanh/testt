import getAxiosClient from "../../lib/axios/axiosClient";
import type { PaginatedResponse } from "../../types/Api";
import type { LinkedInDraftResponse, LinkedInHistory, LinkedInPost, LinkedInPostStatus, LinkedInSourceType } from "../../types/LinkedIn";
import type { LinkedInAudience } from "../../types/LinkedIn";
import type { FactualReview, GeneratedLinkedInPost, LinkedInMediaAsset, LinkedInMediaMode, OrganizationVerification, PexelsCandidate, UploadedMedia } from "../../types/Publication";

export interface LinkedInListParams { page: number; pageSize: number; status?: LinkedInPostStatus; sourceType?: LinkedInSourceType; }
export interface LinkedInPostInput { content: string; topic: string; mediaMode: LinkedInMediaMode; media: LinkedInMediaAsset[]; factCheck: FactualReview; generation: GeneratedLinkedInPost; sourceType: LinkedInSourceType; action?: "SAVE_DRAFT" | "PUBLISH_NOW"; }

// Fetch one filtered page of standalone LinkedIn posts.
export const listLinkedInPosts = async (params: LinkedInListParams): Promise<PaginatedResponse<LinkedInPost>> => (await getAxiosClient().get("/linkedin/posts", { params })).data;
// Fetch one standalone LinkedIn post for editing or review.
export const getLinkedInPost = async (id: string) => (await getAxiosClient().get<LinkedInPost>(`/linkedin/posts/${id}`)).data;
// Generate a preview-only standalone LinkedIn draft.
export const generateLinkedInDraft = async (data: { topic: string; context?: string; targetAudience: LinkedInAudience; requestedMediaMode: LinkedInMediaMode }) => (await getAxiosClient().post<LinkedInDraftResponse>("/linkedin/ai/generate-draft", data)).data;
// Ask AI for fresh topic proposals.
export const proposeLinkedInTopics = async (data: { count: number; recentLimit: number; targetAudience: LinkedInAudience; guideline?: string }) => (await getAxiosClient().post<{ topics: string[] }>("/linkedin/ai/propose-topics", data)).data;
// Create a reviewed LinkedIn draft or publish it immediately.
export const createLinkedInPost = async (data: LinkedInPostInput) => (await getAxiosClient().post<LinkedInPost>("/linkedin/posts", data)).data;
// Update a contract-permitted standalone LinkedIn post.
export const updateLinkedInPost = async (id: string, data: Partial<LinkedInPostInput>) => (await getAxiosClient().put<LinkedInPost>(`/linkedin/posts/${id}`, data)).data;
// Soft-delete a standalone LinkedIn post from the CMS.
export const deleteLinkedInPost = async (id: string) => getAxiosClient().delete(`/linkedin/posts/${id}`);
// Restore a recently soft-deleted standalone LinkedIn post.
export const restoreLinkedInPost = async (id: string) => (await getAxiosClient().post<LinkedInPost>(`/linkedin/posts/${id}/restore`)).data;
// Publish a reviewed READY post.
export const publishLinkedInPost = async (id: string) => (await getAxiosClient().post<LinkedInPost>(`/linkedin/posts/${id}/publish`)).data;
// Retry a failed post through the backend safety checks.
export const retryLinkedInPost = async (id: string) => (await getAxiosClient().post<LinkedInPost>(`/linkedin/posts/${id}/retry`)).data;
// Suggest Pexels candidates from a persisted post and optional keywords.
export const suggestPostMedia = async (id: string, keywords: string[] = []) => (await getAxiosClient().post<{ items: PexelsCandidate[] }>(`/linkedin/posts/${id}/media/suggest`, keywords)).data.items;
// Search Pexels directly for an unsaved post.
export const searchLinkedInMedia = async (keywords: string[]) => (await getAxiosClient().post<{ items: PexelsCandidate[] }>("/linkedin/media/search", keywords)).data.items;
// Upload one administrator image and return contract-ready LinkedIn media metadata.
export const uploadLinkedInMedia = async (file: File) => {
  const form = new FormData();
  form.append("image", file);
  return (await getAxiosClient().post<UploadedMedia>("/linkedin/media/upload", form)).data;
};
// Load recent live Company Page history.
export const getLinkedInHistory = async (limit = 5) => (await getAxiosClient().get<LinkedInHistory>("/linkedin/history/recent", { params: { limit } })).data;
// Synchronize provider history into the CMS.
export const syncLinkedInHistory = async () => (await getAxiosClient().post<LinkedInHistory>("/linkedin/history/sync")).data;
// Verify configured LinkedIn organization identity and permissions.
export const verifyLinkedInOrganization = async () => (await getAxiosClient().get<OrganizationVerification>("/linkedin/organization/verify")).data;
