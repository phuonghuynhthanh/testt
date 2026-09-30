import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FiDownload, FiList, FiPlus, FiSearch } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  classifyBlogLinks,
  fetchBlogReferenceContent,
  searchBlogReferences,
  suggestBlogTitles,
} from "../../../services/blog/handleBlog";
import { apiErrorMessage } from "../../../types/Api";
import type { ClassifiedLink, FetchContentResponse, LinkReference } from "../../../types/Blog";
import { SectionHeading } from "../../../shared/ui";

interface BlogResearchToolsProps {
  title: string;
  onTitleSelect: (title: string) => void;
  onContentInsert: (content: string) => void;
}

const actionClass = "inline-flex size-9 items-center justify-center rounded-lg border border-surface-border bg-surface-elevated text-content-primary transition-colors hover:bg-surface-hover disabled:opacity-40";

// Expose the Blog research APIs without adding another administration page.
const BlogResearchTools = ({ title, onTitleSelect, onContentInsert }: BlogResearchToolsProps) => {
  const [keyword, setKeyword] = useState(title);
  const [language, setLanguage] = useState<"vietnamese" | "english">("vietnamese");
  const [titles, setTitles] = useState<string[]>([]);
  const [references, setReferences] = useState<LinkReference[]>([]);
  const [linksInput, setLinksInput] = useState("");
  const [classified, setClassified] = useState<ClassifiedLink[]>([]);
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetched, setFetched] = useState<FetchContentResponse | null>(null);

  useEffect(() => {
    if (!keyword.trim() && title.trim()) setKeyword(title);
  }, [keyword, title]);

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

  // Insert only readable extracted text after an explicit administrator action.
  const insertFetchedContent = () => {
    const content = fetched?.text_content || fetched?.content;
    if (content) onContentInsert(content);
  };

  const canQuery = Boolean(keyword.trim());
  const canClassify = Boolean(linksInput.trim());
  const canFetch = Boolean(fetchUrl.trim());

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <SectionHeading title="Nguồn tham khảo" description="Gợi ý tiêu đề, tìm kiếm, phân loại và trích xuất nguồn cho bài viết" />
      <div className="space-y-3">
        <details className="rounded-lg border border-surface-border bg-surface-elevated p-4">
          <summary className="cursor-pointer text-sm font-semibold text-content-primary">Gợi ý tiêu đề và tìm nguồn</summary>
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Từ khóa hoặc chủ đề..." className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green" />
              <select value={language} onChange={(event) => setLanguage(event.target.value as "vietnamese" | "english")} className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-content-primary">
                <option value="vietnamese">Tiếng Việt</option>
                <option value="english">English</option>
              </select>
              <button type="button" title="Gợi ý tiêu đề" aria-label="Gợi ý tiêu đề" disabled={!canQuery || titleSuggestions.isPending} onClick={() => titleSuggestions.mutate()} className={actionClass}><FiList /></button>
              <button type="button" title="Tìm nguồn tham khảo" aria-label="Tìm nguồn tham khảo" disabled={!canQuery || referenceSearch.isPending} onClick={() => referenceSearch.mutate()} className={actionClass}><FiSearch /></button>
            </div>
            {titles.length > 0 && <div className="flex flex-wrap gap-2">{titles.map((item) => <button key={item} type="button" onClick={() => onTitleSelect(item)} className="rounded-lg border border-purple-500/30 bg-purple-950/20 px-3 py-1.5 text-left text-xs text-purple-200 hover:bg-purple-900/30">{item}</button>)}</div>}
            {references.length > 0 && <div className="space-y-2">{references.map((item) => <article key={item.url} className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-card p-3 text-xs">
              <div className="min-w-0 flex-1"><a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-cyan-400 hover:underline">{item.title || item.url}</a><p className="mt-1 truncate text-content-muted">{item.url}</p><span className="mt-1 inline-block rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-content-secondary">{item.tag}</span></div>
              <button type="button" title="Thêm vào danh sách phân loại" aria-label="Thêm vào danh sách phân loại" onClick={() => queueReference(item.url)} className={actionClass}><FiPlus /></button>
            </article>)}</div>}
          </div>
        </details>

        <details className="rounded-lg border border-surface-border bg-surface-elevated p-4">
          <summary className="cursor-pointer text-sm font-semibold text-content-primary">Phân loại liên kết</summary>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2">
              <textarea rows={4} value={linksInput} onChange={(event) => setLinksInput(event.target.value)} placeholder="Mỗi URL một dòng..." className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green" />
              <button type="button" title="Phân loại liên kết" aria-label="Phân loại liên kết" disabled={!canClassify || classification.isPending} onClick={() => classification.mutate()} className={actionClass}><FiList /></button>
            </div>
            {classified.length > 0 && <div className="space-y-2">{classified.map((item) => <div key={item.url} className="rounded-lg border border-surface-border bg-surface-card p-3 text-xs"><p className="truncate text-content-primary">{item.url}</p><p className="mt-1 text-content-muted">{item.category} · {Math.round(item.confidence * 100)}% · {item.reason}</p></div>)}</div>}
          </div>
        </details>

        <details className="rounded-lg border border-surface-border bg-surface-elevated p-4">
          <summary className="cursor-pointer text-sm font-semibold text-content-primary">Trích xuất nội dung từ URL</summary>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input value={fetchUrl} onChange={(event) => setFetchUrl(event.target.value)} placeholder="https://example.com/article" className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green" />
              <button type="button" title="Trích xuất nội dung" aria-label="Trích xuất nội dung" disabled={!canFetch || contentFetch.isPending} onClick={() => contentFetch.mutate()} className={actionClass}><FiSearch /></button>
            </div>
            {fetched?.success && <div className="rounded-lg border border-surface-border bg-surface-card p-3 text-xs"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="text-content-primary">{fetched.title || fetched.url}</strong><p className="mt-1 text-content-muted">{fetched.author || "Không rõ tác giả"}{fetched.published_date ? ` · ${fetched.published_date}` : ""}</p></div><button type="button" title="Chèn nội dung vào bài viết" aria-label="Chèn nội dung vào bài viết" disabled={!(fetched.text_content || fetched.content)} onClick={insertFetchedContent} className={actionClass}><FiDownload /></button></div><p className="mt-3 line-clamp-5 whitespace-pre-wrap text-content-secondary">{fetched.text_content || fetched.content}</p></div>}
          </div>
        </details>
      </div>
    </div>
  );
};

export default BlogResearchTools;
