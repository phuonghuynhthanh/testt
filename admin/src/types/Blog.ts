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

export interface IBlogData {
  id?: string;
  tag: string;
  title: string;
  banner_url: string;
  link_post: string;
  category: string;
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
}

export interface IBlogUpdateData extends IBlogData {
  id: string;
}

export interface IEditorData {
  title: string;
  body: string;
}
