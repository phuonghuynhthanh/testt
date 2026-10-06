import type { PostLanguage } from "./Language";

export type BlogState = "PENDING" | "APPROVED" | "REJECTED";

export interface SEO {
  title: string;
  description: string;
  url: string;
  keywords: string[];
  author: string;
  published_time?: string;
  modified_time?: string;
  banner_url?: string;
}

/** Fields an editor may send; the server owns the canonical URL. */
export type SEOInput = Omit<SEO, "url" | "published_time" | "modified_time" | "banner_url">;

/** Fields accepted by the Blog create endpoint. */
export interface BlogCreateInput {
  tag: string;
  title: string;
  banner_url: string;
  category: string;
  language?: PostLanguage;
  seo: SEOInput;
  content: string;
}

/** Fields accepted by the Blog update endpoint. */
export type BlogUpdateInput = Partial<BlogCreateInput> & { state?: BlogState };

export interface IBlogData {
  id?: string;
  tag: string;
  title: string;
  banner_url: string;
  link_post: string;
  category: string;
  language?: PostLanguage;
  seo: SEO;
  content: string;
  state?: BlogState;
  created_at?: string;
  modified_at?: string;
}

export interface IBlogItemData
  extends Omit<IBlogData, "seo" | "content" | "created_at"> {
  id: string;
  state: BlogState;
  modified_at: string;
  created_at?: string;
  /** Present when the list is requested with include=linkedin. */
  linkedinPost?: { id: string; status: string } | null;
}

export interface IBlogUpdateData extends IBlogData {
  id: string;
}

export interface IEditorData {
  title: string;
  body: string;
}

export interface LinkReference {
  title: string;
  url: string;
  tag: "NORMAL" | "ADS" | "SPAM";
}

export interface ClassifiedLink {
  url: string;
  category: "organic" | "ad" | "spam" | "duplicate";
  confidence: number;
  reason: string;
}

export interface ClassifyLinksResponse {
  classified_links: ClassifiedLink[];
  summary: Record<string, number>;
}

export interface FetchContentResponse {
  url: string;
  title?: string | null;
  content?: string | null;
  text_content?: string | null;
  author?: string | null;
  published_date?: string | null;
  language?: string | null;
  metadata: Record<string, unknown>;
  success: boolean;
  error_message?: string | null;
}

export interface ClientBlogItem {
  id: string;
  tag: string;
  title: string;
  banner_url: string;
  link_post: string;
  category: string;
  language?: PostLanguage;
  created_at: string;
  modified_at: string;
  seo?: SEO;
}

export interface ClientBlogListResponse {
  blogs: ClientBlogItem[];
  next_req: string | null;
}

export interface PublicBlogDetail extends IBlogData {
  related_blogs?: ClientBlogItem[];
}
