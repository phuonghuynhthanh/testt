import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BlogContextValue, IBlogState, SEO } from "../types/Blog";

/**
 * ===== CONSTANTS =====
 */

const STORAGE_KEY = "blog_draft";

const defaultSEO: SEO = {
  title: "",
  description: "",
  url: "",
  keywords: [],
  author: "",
  banner_url: "",
  published_time: "",
  modified_time: "",
};

const defaultState: IBlogState = {
  id: "",
  tag: "",
  title: "",
  banner_url: "",
  link_post: "",
  category: "INVESTMENT_INSIGHTS",
  seo: defaultSEO,
  content: "",
  outline: [],
  state: "PENDING",
  created_at: "",
  modified_at: "",

  currentStep: 1,
  intent_keyword: [],
  link_references: [],
  language: "english",
};

const BlogContext = createContext<BlogContextValue | null>(null);

interface BlogProviderProps {
  children: ReactNode;
}

export function BlogProvider({ children }: BlogProviderProps) {
  const [state, setState] = useState<IBlogState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as IBlogState) : defaultState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update: BlogContextValue["update"] = (data: Partial<IBlogState>) => {
    // console.log("current state", data);
    setState((prev: IBlogState) => ({ ...prev, ...data }));
  };

  const reset: BlogContextValue["reset"] = () => {
    const ok = window.confirm(
      "Are you sure you want to reset the blog draft? This action cannot be undone.",
    );

    if (ok) {
      localStorage.removeItem(STORAGE_KEY);
      setState(defaultState);
    }
  };

  const finish: BlogContextValue["finish"] = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  };

  return (
    <BlogContext.Provider value={{ state, update, reset, finish }}>
      {children}
    </BlogContext.Provider>
  );
}

export function useBlog() {
  const ctx = useContext(BlogContext);

  if (!ctx) {
    throw new Error("useBlog must be used inside <BlogProvider />");
  }

  return ctx;
}
