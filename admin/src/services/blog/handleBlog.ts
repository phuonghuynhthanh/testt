import getAxiosClient from "../../lib/axios/axiosClient";
import type { PaginatedResponse } from "../../types/Api";
import type { BlogState, ClassifyLinksResponse, FetchContentResponse, IBlogData, IBlogItemData, LinkReference } from "../../types/Blog";

export interface BlogListParams { page: number; pageSize: number; state?: BlogState; category?: string; }

// Fetch one backend-paginated Blog page; filters stay in the query key at call sites.
export const getListBlogs = async (params: BlogListParams): Promise<PaginatedResponse<IBlogItemData>> => (await getAxiosClient().get("/blog/admin/blogs", { params })).data;
// Fetch a Blog editor record.
export const getBlogDetail = async (blogId: string): Promise<IBlogData> => (await getAxiosClient().get(`/blog/admin/${blogId}`)).data;
// Create a Blog with the exact optional-image multipart contract.
export const createBlogPost = async (data: IBlogData, image: File | null, action: "SAVE_PENDING" | "PUBLISH_NOW") => { const form = new FormData(); form.append("blog_data", JSON.stringify(data)); form.append("action", action); if (image) form.append("image", image); return (await getAxiosClient().post("/blog", form)).data as IBlogData; };
// Update the existing Blog with an optional replacement banner.
export const updateBlog = async (data: Partial<IBlogData> & { id?: string }, image?: File | null) => { if (!data.id) throw new Error("Thiếu ID bài viết"); const form = new FormData(); form.append("blog_data", JSON.stringify(data)); if (image) form.append("image", image); return (await getAxiosClient().put(`/blog/${data.id}`, form)).data as IBlogData; };
// Soft-delete and restore without claiming provider-side removal.
export const deleteBlog = async (id: string) => (await getAxiosClient().delete(`/blog/${id}`)).data;
// Restore a recently soft-deleted Blog.
export const restoreBlog = async (id: string) => (await getAxiosClient().post(`/blog/${id}/restore`)).data as IBlogData;
// Check whether a Blog slug is already used.
export const checkDuplicateBlogLink = async (link_post: string) => (await getAxiosClient().get<boolean>("/blog/is-duplicate-link-post", { params: { link_post } })).data;
// Generate an editable, preview-only AI Blog draft.
export const generateBlogDraft = async (title: string, category: string) => (await getAxiosClient().post<IBlogData>("/blog/ai/generate-draft", { title, category })).data;
// Generate a bounded set of Blog title suggestions.
export const suggestBlogTitles = async (keyword: string, language: "vietnamese" | "english") =>
  (await getAxiosClient().get<string[]>("/blog/openai/ai-generate-list-title", { params: { keyword, quantity: 5, language } })).data;
// Search and pre-classify reference links for Blog research.
export const searchBlogReferences = async (keyword: string, language: "vietnamese" | "english") =>
  (await getAxiosClient().post<LinkReference[]>("/blog/search-references", { keyword, language, max_results: 10, exclude_ads: false, exclude_spam: false })).data;
// Classify administrator-supplied URLs for spam, ads, and duplicates.
export const classifyBlogLinks = async (urls: string[]) =>
  (await getAxiosClient().post<ClassifyLinksResponse>("/blog/classify-links", { links: urls.map((url) => ({ url })) })).data;
// Extract readable article content and metadata from one source URL.
export const fetchBlogReferenceContent = async (url: string) =>
  (await getAxiosClient().post<FetchContentResponse>("/blog/fetch-content", { url, include_metadata: true })).data;
// Fetch public blog list as guest visitors see.
export const getClientBlogs = async (params?: { num_of_blogs?: number; category?: string }) =>
  (await getAxiosClient().get<import("../../types/Blog").ClientBlogListResponse>("/blog/client/blogs", { params })).data;
// Fetch public blog detail and related articles by URL slug.
export const getPublicBlogDetail = async (link_post: string, limit = 4) =>
  (await getAxiosClient().get<import("../../types/Blog").PublicBlogDetail>(`/blog/link/${link_post}`, { params: { limit } })).data;
