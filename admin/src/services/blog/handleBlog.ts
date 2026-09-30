import getAxiosClient from "../../lib/axios/axiosClient";
import type { PaginatedResponse } from "../../types/Api";
import type { BlogState, IBlogData, IBlogItemData } from "../../types/Blog";

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
