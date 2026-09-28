export interface SEO {
  title: string;
  description: string;
  url: string;
  keywords: string[];
  author: string;
  published_time?: string;
  modified_time?: string;
  banner_url: string;
}

export interface IBlogData {
  id: string;
  tag: string;
  title: string;
  banner_url: string;
  link_post: string;
  category: string;
  seo: SEO;
  content: string;

  state: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  modified_at: string;
}

export type LinkTag = "NORMAL" | "SPAM" | "ADS";

export interface ICrawledData {
  title: string;
  text: string;
}
export interface ILinkReference {
  title: string;
  url: string;
  tag: LinkTag;
  is_selected: boolean;
}

export interface IBlogState extends IBlogData {
  currentStep: number;
  intent_keyword?: string[];
  link_references: ILinkReference[];
  language: string;
  outline: string[] | [];
}

export interface BlogContextValue {
  state: IBlogState;
  update: (data: Partial<IBlogState>) => void;
  reset: () => void;
  finish: () => void;
}

export interface IBlogDetailData extends IBlogData {
  id: string;
  tag: string;
  title: string;
  banner_url: string;
  link_post: string;
  category: string;
  seo: SEO;
  content: string;
  state: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  modified_at: string;
}

// Data is use for Item in list Blog
export interface IBlogItemData extends Omit<
  IBlogData,
  "seo" | "content" | "created_at"
> {
  id: string;
  modified_at: string;
}

export interface IBlogUpdateData extends IBlogData {
  id: string;
}

export interface IBlogTags {
  id: string;
  title: string;
}

export interface IEditorData {
  title: string;
  body: string;
}

export interface IBlogAIGenerateResponse {
  message: string;
  statusCode: number;
  id?: string;
}
export interface IParamsBlogTitlesAIGenerate {
  keyword: string;
  quantity: number;
  language: string;
}

export type BlogCategory =
  | "ALL"
  | "NEWS"
  | "INVESTMENT_INSIGHTS"
  | "FOREIGN_INVESTMENT"
  | "KNOWLEDGE_BASE";
