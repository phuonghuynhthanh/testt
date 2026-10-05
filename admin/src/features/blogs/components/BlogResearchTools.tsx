import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CaretDown, DownloadSimple, Funnel, Lightbulb, Plus, MagnifyingGlass } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  classifyBlogLinks,
  fetchBlogReferenceContent,
  searchBlogReferences,
  suggestBlogTitles,
} from "../../../services/blog/handleBlog";
import { apiErrorMessage } from "../../../types/Api";
import type { ClassifiedLink, FetchContentResponse, LinkReference } from "../../../types/Blog";

// Tag chip classes per reference quality, matching the design preview.
const TAG_CLASSES: Record<string, string> = {
  NORMAL: "chip",
  ADS: "chip !border-amber-500/30 !bg-amber-950/40 !text-amber-300",
  SPAM: "chip !border-rose-500/30 !bg-rose-950/40 !text-rose-300",
};

// Split extracted text into readable paragraphs, dropping empty lines and extra whitespace.
const extractParagraphs = (text?: string | null): string[] =>
  (text || "")
    .split(/\n{1,}/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

// Vietnamese labels for reference tags and link categories.
const TAG_LABELS: Record<string, string> = { NORMAL: "Bình thường", ADS: "Quảng cáo", SPAM: "Rác" };
const CATEGORY_LABELS: Record<string, string> = { organic: "Tự nhiên", ad: "Quảng cáo", spam: "Rác", duplicate: "Trùng lặp" };

// Badge classes per link classification category.
const CATEGORY_CLASSES: Record<string, string> = {
  organic: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30",
  ad: "bg-amber-950/40 text-amber-400 border-amber-500/30",
  spam: "bg-rose-950/40 text-rose-400 border-rose-500/30",
  duplicate: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

// Render the standalone workspace for searching and assessing blog references.
const BlogResearchTools = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState<"vietnamese" | "english">("vietnamese");
  const [titles, setTitles] = useState<string[]>([]);
  const [references, setReferences] = useState<LinkReference[]>([]);
  const [linksInput, setLinksInput] = useState("");
  const [classified, setClassified] = useState<ClassifiedLink[]>([]);
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetched, setFetched] = useState<FetchContentResponse | null>(null);

  const titleSuggestions = useMutation({
    mutationFn: () => suggestBlogTitles(keyword.trim(), language),
    onSuccess: setTitles,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const referenceSearch = useMutation({
    mutationFn: () => searchBlogReferences(keyword.trim(), language),
    onSuccess: setReferences,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const classification = useMutation({
    mutationFn: () => classifyBlogLinks(
      linksInput.split(/\s+/).map((url) => url.trim()).filter(Boolean),
    ),
    onSuccess: (result) => setClassified(result.classified_links),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const contentFetch = useMutation({
    mutationFn: () => fetchBlogReferenceContent(fetchUrl.trim()),
    onSuccess: (result) => {
      setFetched(result);
      if (!result.success) toast.error(result.error_message || "Không thể trích xuất nội dung.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  // Add one search result to the manual classification queue without duplicates.
  const queueReference = (url: string) => {
    const urls = linksInput.split(/\s+/).filter(Boolean);
    if (!urls.includes(url)) setLinksInput([...urls, url].join("\n"));
  };

  const canQuery = Boolean(keyword.trim());
  const canClassify = Boolean(linksInput.trim());
  const canFetch = Boolean(fetchUrl.trim());

  return (
    <div className="panel">
      <div className="space-y-3 p-4">
        <details open className="group rounded-xl border border-surface-border bg-surface-elevated">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold">
            Gợi ý tiêu đề và tìm nguồn
            <CaretDown size={16} weight="light" className="text-content-muted transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Từ khóa hoặc chủ đề..."
                className="inp min-w-0 flex-1"
              />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as "vietnamese" | "english")}
                aria-label="Ngôn ngữ"
                className="inp sm !h-[2.5rem] !w-auto"
              >
                <option value="vietnamese">Tiếng Việt</option>
                <option value="english">English</option>
              </select>
              <button
                type="button"
                disabled={!canQuery || titleSuggestions.isPending}
                onClick={() => titleSuggestions.mutate()}
                className="btn btn-secondary !h-[2.5rem]"
              >
                <Lightbulb size={16} weight="light" />
                <span>Gợi ý tiêu đề</span>
              </button>
              <button
                type="button"
                disabled={!canQuery || referenceSearch.isPending}
                onClick={() => referenceSearch.mutate()}
                className="btn btn-secondary !h-[2.5rem]"
              >
                <MagnifyingGlass size={16} weight="light" />
                <span>Tìm nguồn</span>
              </button>
            </div>

            {titles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {titles.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-950/20 py-1 pl-3 pr-1 text-xs text-purple-200"
                  >
                    {item}
                    <button
                      type="button"
                      className="rounded-md bg-purple-500/20 px-2 py-1 text-[11px] font-semibold hover:bg-purple-500/30"
                      onClick={() => {
                        sessionStorage.setItem("vq-prefill-title", item);
                        navigate("/blog/create-blog");
                      }}
                    >
                      Tạo bài
                    </button>
                  </span>
                ))}
              </div>
            )}

            {references.length > 0 && (
              <div className="space-y-2">
                {references.map((item) => (
                  <article key={item.url} className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-card p-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-cyan-400 hover:underline">
                        {item.title || item.url}
                      </a>
                      <p className="mt-1 truncate text-content-muted">{item.url}</p>
                    </div>
                    <span className={TAG_CLASSES[item.tag] ?? "chip"}>{TAG_LABELS[item.tag] ?? item.tag}</span>
                    <button
                      type="button"
                      onClick={() => queueReference(item.url)}
                      className="btn btn-secondary !h-8"
                    >
                      <Plus size={14} weight="light" />
                      <span>Thêm</span>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>

        <details open className="group rounded-xl border border-surface-border bg-surface-elevated">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold">
            Phân loại liên kết
            <CaretDown size={16} weight="light" className="text-content-muted transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <div className="flex items-start gap-2">
              <textarea
                rows={4}
                value={linksInput}
                onChange={(event) => setLinksInput(event.target.value)}
                placeholder="Mỗi URL một dòng..."
                className="inp min-w-0 flex-1"
              />
              <button
                type="button"
                disabled={!canClassify || classification.isPending}
                onClick={() => classification.mutate()}
                className="btn btn-secondary !h-[2.5rem]"
              >
                <Funnel size={16} weight="light" />
                <span>Phân loại</span>
              </button>
            </div>
            {classified.length > 0 && (
              <div className="space-y-2">
                {classified.map((item) => (
                  <div key={item.url} className="rounded-lg border border-surface-border bg-surface-card p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-content-secondary">{item.url}</p>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-medium ${
                          CATEGORY_CLASSES[item.category] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"
                        }`}
                      >
                        {CATEGORY_LABELS[item.category] ?? item.category} {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-content-muted">{item.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <details open className="group rounded-xl border border-surface-border bg-surface-elevated">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold">
            Trích xuất nội dung từ URL
            <CaretDown size={16} weight="light" className="text-content-muted transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <div className="flex gap-2">
              <input
                value={fetchUrl}
                onChange={(event) => setFetchUrl(event.target.value)}
                placeholder="https://example.com/article"
                className="inp min-w-0 flex-1"
              />
              <button
                type="button"
                disabled={!canFetch || contentFetch.isPending}
                onClick={() => contentFetch.mutate()}
                className="btn btn-secondary !h-[2.5rem]"
              >
                <DownloadSimple size={16} weight="light" />
                <span>Trích xuất</span>
              </button>
            </div>
            {fetched?.success && (
              <article className="rounded-lg border border-surface-border bg-surface-card">
                <header className="space-y-1 border-b border-surface-border p-4">
                  <a
                    href={fetched.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base font-semibold leading-snug hover:text-primary-green-dark hover:underline"
                  >
                    {fetched.title || fetched.url}
                  </a>
                  <p className="text-xs text-content-muted">
                    {fetched.author || "Không rõ tác giả"}
                    {fetched.published_date ? ` · ${fetched.published_date}` : ""}
                    {fetched.language ? ` · ${fetched.language}` : ""}
                  </p>
                </header>
                <div className="max-h-[32rem] space-y-3 overflow-y-auto p-4 text-sm leading-7 text-content-secondary">
                  {extractParagraphs(fetched.text_content || fetched.content).map((paragraph, index) => (
                    <p key={index} className="break-words">{paragraph}</p>
                  ))}
                  {extractParagraphs(fetched.text_content || fetched.content).length === 0 && (
                    <p className="italic text-content-muted">Trang này không có nội dung văn bản đọc được.</p>
                  )}
                </div>
              </article>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

export default BlogResearchTools;
