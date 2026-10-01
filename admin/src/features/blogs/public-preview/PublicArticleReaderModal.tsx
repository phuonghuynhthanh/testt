import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FiX, FiCalendar, FiUser, FiArrowLeft } from "react-icons/fi";
import { getPublicBlogDetail } from "../../../services/blog/handleBlog";
import { formatCmsDateOnly } from "../../../utils/date";
import { BlogThumbnail } from "../../../shared/ui";
import MarkdownContent from "../../../shared/markdown/MarkdownContent";

interface PublicArticleReaderModalProps {
  slug: string | null;
  onClose: () => void;
}

// Render public reader modal presenting article markdown content, author metadata, and related articles.
export const PublicArticleReaderModal: React.FC<PublicArticleReaderModalProps> = ({
  slug,
  onClose,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-3.5 bg-surface-elevated">
          <div className="flex items-center gap-2 text-xs text-content-muted">
            <button
              type="button"
              onClick={onClose}
              title="Quay lại"
              aria-label="Quay lại"
              className="inline-flex size-8 items-center justify-center rounded-lg text-content-secondary hover:bg-surface-hover hover:text-content-primary"
            >
              <FiArrowLeft className="text-sm" />
            </button>
            <span>/</span>
            <span className="text-emerald-400 font-medium">Bản xem trước công khai</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Đóng xem trước"
            aria-label="Đóng xem trước"
            className="size-8 inline-flex items-center justify-center rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {detailQuery.isLoading ? (
            <div className="py-20 text-center text-sm text-content-muted">
              Đang tải nội dung bài viết công khai...
            </div>
          ) : detailQuery.isError || !blog ? (
            <div className="py-12 text-center text-sm text-rose-400">
              Không thể tải nội dung bài viết.
            </div>
          ) : (
            <article className="space-y-6 max-w-3xl mx-auto">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  {blog.category || "Bài viết"}
                </span>

                <h1 className="text-2xl sm:text-3xl font-bold text-content-primary leading-tight">
                  {blog.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-content-muted border-b border-surface-border pb-4">
                  <div className="flex items-center gap-1.5">
                    <FiUser className="text-emerald-400" />
                    <span>{blog.seo?.author || "VietQuant Team"}</span>
                  </div>
                  {blog.modified_at && (
                    <div className="flex items-center gap-1.5">
                      <FiCalendar />
                      <span>{formatCmsDateOnly(blog.modified_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {blog.banner_url && (
                <div className="overflow-hidden rounded-xl border border-surface-border">
                  <BlogThumbnail
                    bannerUrl={blog.banner_url}
                    title={blog.title}
                    size="lg"
                  />
                </div>
              )}

              <div className="prose prose-invert max-w-none">
                <MarkdownContent content={blog.content || "Chưa có nội dung văn bản."} />
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicArticleReaderModal;
