import type { PostLanguage } from "../../types/Language";
import getAxiosClient from "../../lib/axios/axiosClient";
import type { PaginatedResponse } from "../../types/Api";
import type { BlogCreateInput, BlogState, BlogUpdateInput, ClassifyLinksResponse, FetchContentResponse, IBlogData, IBlogItemData, LinkReference } from "../../types/Blog";

export type BlogSortKey = "modified" | "title" | "category" | "state";
export interface BlogListParams { page: number; pageSize: number; state?: BlogState; category?: string; language?: PostLanguage; search?: string; sort?: BlogSortKey; dir?: "asc" | "desc"; include?: "linkedin"; }

export type BlogCounts = Record<BlogState | "ALL", number>;
export interface BlogStatBucket { count: number; last7: number; prev7: number; daily14: number[]; }
export type BlogStats = Record<BlogState | "ALL", BlogStatBucket>;
export interface BulkStateItem { id: string; state: BlogState; modifiedAt?: string | null; }

// Count Blogs per state for the current category/search, ignoring the state tab.
export const getBlogCounts = async (params: { category?: string; search?: string } = {}): Promise<BlogCounts> =>
  (await getAxiosClient().get("/blog/admin/counts", { params })).data;
// Fetch KPI totals with 7-day trends and 14-day sparkline buckets.
export const getBlogStats = async (): Promise<BlogStats> => (await getAxiosClient().get("/blog/admin/stats")).data;
// Change the state of up to 100 Blogs in one transaction; modifiedAt restores a timestamp on undo.
export const bulkUpdateBlogState = async (items: BulkStateItem[]) =>
  (await getAxiosClient().post<{ updated: number; items: Array<{ id: string; state: BlogState; modified_at: string }>; notFound: string[] }>("/blog/admin/bulk-state", { items })).data;
// Soft-delete up to 100 Blogs in one transaction.
export const bulkDeleteBlogs = async (ids: string[]) =>
  (await getAxiosClient().post<{ deleted: number; notFound: string[] }>("/blog/admin/bulk-delete", { ids })).data;
// Restore soft-deleted Blogs while keeping their original modified_at.
export const bulkRestoreBlogs = async (ids: string[]) =>
  (await getAxiosClient().post<{ restored: number; notFound: string[] }>("/blog/admin/bulk-restore", { ids })).data;
// Change a single Blog state, optionally restoring an earlier timestamp.
export const patchBlogState = async (id: string, state: BlogState, modifiedAt?: string | null) =>
  (await getAxiosClient().patch<{ id: string; state: BlogState; modified_at: string }>(`/blog/${id}/state`, { state, modifiedAt })).data;
// Download the filtered list as CSV and report whether the 5,000-row cap truncated it.
export const exportBlogsCsv = async (params: Omit<BlogListParams, "page" | "pageSize" | "include">) => {
  const response = await getAxiosClient().get<Blob>("/blog/admin/export.csv", { params, responseType: "blob" });
  return { blob: response.data, truncated: response.headers["x-truncated"] === "true" };
};

// Fetch one backend-paginated Blog page; filters stay in the query key at call sites.
export const getListBlogs = async (params: BlogListParams): Promise<PaginatedResponse<IBlogItemData>> => (await getAxiosClient().get("/blog/admin/blogs", { params })).data;
// Fetch a Blog editor record.
export const getBlogDetail = async (blogId: string): Promise<IBlogData> => (await getAxiosClient().get(`/blog/admin/${blogId}`)).data;
// Create a Blog with the exact optional-image multipart contract.
export const createBlogPost = async (data: BlogCreateInput, image: File | null, action: "SAVE_PENDING" | "PUBLISH_NOW") => { const form = new FormData(); form.append("blog_data", JSON.stringify(data)); form.append("action", action); if (image) form.append("image", image); return (await getAxiosClient().post("/blog", form)).data as IBlogData; };
// Update the existing Blog with an optional replacement banner.
export const updateBlog = async (data: BlogUpdateInput & { id?: string }, image?: File | null) => { if (!data.id) throw new Error("Thiếu ID bài viết"); const { id, ...payload } = data; const form = new FormData(); form.append("blog_data", JSON.stringify(payload)); if (image) form.append("image", image); return (await getAxiosClient().put(`/blog/${id}`, form)).data as IBlogData; };
// Soft-delete and restore without claiming provider-side removal.
export const deleteBlog = async (id: string) => (await getAxiosClient().delete(`/blog/${id}`)).data;
// Restore a recently soft-deleted Blog.
export const restoreBlog = async (id: string) => (await getAxiosClient().post(`/blog/${id}/restore`)).data as IBlogData;
// Generate an editable, preview-only AI Blog draft.
export const generateBlogDraft = async (title: string, category: string, language: PostLanguage = "vietnamese") => (await getAxiosClient().post<IBlogData>("/blog/ai/generate-draft", { title, category, language })).data;
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
export const getClientBlogs = async (params?: { num_of_blogs?: number; category?: string; limit?: number }) =>
  (await getAxiosClient().get<import("../../types/Blog").ClientBlogListResponse>("/blog/client/blogs", { params })).data;
// Fetch public blog detail and related articles by URL slug.
export const getPublicBlogDetail = async (link_post: string, limit = 4) =>
  (await getAxiosClient().get<import("../../types/Blog").PublicBlogDetail>(`/blog/link/${link_post}`, { params: { limit, related: "category" } })).data;
