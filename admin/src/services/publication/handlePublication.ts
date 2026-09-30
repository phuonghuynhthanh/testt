import type {
  LinkedInContentUpdate,
  LinkedInCommand,
  LinkedInDraftResponse,
  LinkedInDraftRequest,
  MediaSuggestionRequest,
  OrganizationVerification,
  PexelsCandidate,
  Publication,
  PublicationUpdate,
} from "../../types/Publication";
import getAxiosClient from "../../lib/axios/axiosClient";

// Load one Blog's independent distribution settings and publication history.
export const getPublication = async (blogId: string): Promise<Publication> =>
  (await getAxiosClient().get(`/publications/blogs/${blogId}`)).data;

// Persist target channels and LinkedIn generation options without publishing.
export const updatePublication = async (
  blogId: string,
  data: PublicationUpdate,
): Promise<Publication> =>
  (await getAxiosClient().put(`/publications/blogs/${blogId}`, data)).data;

// Generate a reviewable SAME or SUMMARY LinkedIn draft without publishing.
export const generateLinkedInDraft = async (
  blogId: string,
  data: LinkedInDraftRequest,
): Promise<LinkedInDraftResponse> =>
  (await getAxiosClient().post(`/publications/blogs/${blogId}/linkedin/draft`, data)).data;

// Save administrator-owned LinkedIn text or selected Pexels metadata.
export const saveLinkedInPublication = async (
  blogId: string,
  data: LinkedInContentUpdate,
): Promise<Publication> =>
  (await getAxiosClient().put(`/publications/blogs/${blogId}/linkedin`, data)).data;

// Save reviewed Blog-derived LinkedIn copy or publish it immediately.
export const commandBlogLinkedIn = async (blogId: string, data: LinkedInCommand): Promise<Publication> =>
  (await getAxiosClient().post(`/publications/blogs/${blogId}/linkedin`, data)).data;

// Ask the CMS backend for safe Pexels candidates based on the stored media plan.
export const suggestLinkedInMedia = async (
  blogId: string,
  data: MediaSuggestionRequest,
): Promise<PexelsCandidate[]> =>
  (await getAxiosClient().post(`/publications/blogs/${blogId}/linkedin/media/suggest`, data)).data.items;

// Explicitly publish configured channels through the CMS backend.
export const publishBlog = async (blogId: string): Promise<Publication> =>
  (await getAxiosClient().post(`/publications/blogs/${blogId}/publish`)).data;

// Retry only a backend-confirmed failed LinkedIn publication.
export const retryLinkedIn = async (blogId: string): Promise<Publication> =>
  (await getAxiosClient().post(`/publications/blogs/${blogId}/linkedin/retry`)).data;

// Verify backend-held Company Page credentials without exposing them to the browser.
export const verifyLinkedInOrganization = async (): Promise<OrganizationVerification> =>
  (await getAxiosClient().get("/linkedin/organization/verify")).data;
