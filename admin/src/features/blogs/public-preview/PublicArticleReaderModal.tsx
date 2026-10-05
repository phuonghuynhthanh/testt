import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Globe } from "@phosphor-icons/react";
import { getPublicBlogDetail } from "../../../services/blog/handleBlog";
import { formatCmsDateOnly } from "../../../utils/date";
import { IMAGE_URL, API_SERVICES } from "../../../config/config";
import MarkdownContent from "../../../shared/markdown/MarkdownContent";

interface PublicArticleReaderModalProps {
  slug: string | null;
  onClose: () => void;
  onOpen?: (slug: string) => void;
}

// Resolve a stored banner key to a displayable URL.
const resolveBanner = (url: string): string => {
  if (/^(https?:|data:)/i.test(url)) return url;
  const base = IMAGE_URL || API_SERVICES || "";
  return base ? `${base.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}` : `/${url.replace(/^\/+/, "")}`;
};

// Render public reader modal presenting article markdown content and author metadata.
export const PublicArticleReaderModal: React.FC<PublicArticleReaderModalProps> = ({
  slug,
  onClose,
  onOpen,
}) => {
  const detailQuery = useQuery({
    queryKey: ["public-blog-detail", slug],
    queryFn: () => (slug ? getPublicBlogDetail(slug) : null),
    enabled: Boolean(slug),
  });

  if (!slug) return null;

  const blog = detailQuery.data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="pop-in relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-surface-border bg-surface-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={onClose} className="btn btn-secondary" data-autofocus>
            <ArrowLeft size={16} weight="light" />
            Đóng xem trước
          </button>
          <span className="chip">
            <Globe size={12} weight="light" />
            Giao diện khách truy cập
          </span>
        </div>

        {detailQuery.isLoading ? (
          <div className="py-20 text-center text-xs text-content-muted">
            Đang tải nội dung bài viết công khai...
          </div>
        ) : detailQuery.isError || !blog ? (
          <div className="py-12 text-center text-xs text-rose-400">
            Không thể tải nội dung bài viết.
          </div>
        ) : (
          <article className="space-y-5">
            <span className="inline-block rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              {blog.category || "Bài viết"}
            </span>
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{blog.title}</h1>
            <p className="text-xs text-content-muted">
              {blog.seo?.author || "VietQuant Team"}
              {blog.modified_at ? ` · ${formatCmsDateOnly(blog.modified_at)}` : ""}
            </p>

            {blog.banner_url && (
              <div className="relative h-48 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated sm:h-72">
                <img src={resolveBanner(blog.banner_url)} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <MarkdownContent content={blog.content || "Chưa có nội dung văn bản."} />

            {blog.related_blogs && blog.related_blogs.length > 0 && (
              <div className="mt-8 border-t border-surface-border pt-5">
                <h3 className="mb-3 text-sm font-semibold">Bài viết liên quan</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {blog.related_blogs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpen?.(item.link_post || item.id)}
                      className="rounded-xl border border-surface-border bg-surface-elevated p-3 text-left text-xs font-medium transition-colors hover:border-primary-green/40"
                    >
                      <span className="line-clamp-3">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
};

export default PublicArticleReaderModal;
