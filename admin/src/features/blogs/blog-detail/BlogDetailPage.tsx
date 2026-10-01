import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiEdit2, FiSend, FiTrash2, FiTag, FiFolder, FiGlobe } from "react-icons/fi";
import { toast } from "react-toastify";
import { getBlogDetail, deleteBlog } from "../../../services/blog/handleBlog";
import { formatCmsDate } from "../../../utils/date";
import { apiErrorMessage } from "../../../types/Api";
import { StatusBadge, ConfirmDialog, BlogThumbnail } from "../../../shared/ui";
import MarkdownContent from "../../../shared/markdown/MarkdownContent";

// Render comprehensive blog post detail view for administrative review and management.
export const BlogDetailPage: React.FC = () => {
  const { blog_id: blogId = "" } = useParams<{ blog_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const blogQuery = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId),
    enabled: Boolean(blogId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBlog(blogId),
    onSuccess: () => {
      toast.success("Đã chuyển bài viết vào thùng rác thành công.");
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      navigate("/blog");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const blog = blogQuery.data;

  if (blogQuery.isLoading) {
    return (
      <div className="py-24 text-center text-sm text-content-muted">
        Đang tải thông tin chi tiết bài viết...
      </div>
    );
  }

  if (blogQuery.isError || !blog) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-rose-400">Không tìm thấy bài viết hoặc đã xảy ra lỗi tải dữ liệu.</p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-elevated text-xs text-content-primary hover:bg-surface-hover"
        >
          <FiArrowLeft className="text-sm" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  const formattedSlug = blog.link_post ? `/${blog.link_post.replace(/^\/+/, "")}` : "";

  return (
    <section className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation and Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <Link
          to="/blog"
          title="Quay lại danh sách bài viết"
          aria-label="Quay lại danh sách bài viết"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors self-start"
        >
          <FiArrowLeft className="text-sm" />
          <span>Quay lại danh sách</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {blog.state === "APPROVED" && <Link
            to={`/publications/${blogId}`}
            title="Tạo bài LinkedIn"
            aria-label="Tạo bài LinkedIn"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-950/30 px-3.5 text-xs font-semibold text-teal-300 hover:bg-teal-950/50 transition-colors"
          >
            <FiSend className="text-sm" />
            <span>Tạo bài LinkedIn</span>
          </Link>}

          <Link
            to={`/blog/default/${blogId}`}
            title="Chỉnh sửa bài viết"
            aria-label="Chỉnh sửa bài viết"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-elevated px-3.5 text-xs font-semibold text-content-primary hover:bg-surface-hover transition-colors"
          >
            <FiEdit2 className="text-sm" />
            <span>Chỉnh sửa</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="Xóa bài viết"
            aria-label="Xóa bài viết"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 transition-colors"
          >
            <FiTrash2 className="text-sm" />
            <span>Xóa bài viết</span>
          </button>
        </div>
      </div>

      {/* Main Content & Metadata Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Article Body & Preview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={blog.state || "PENDING"} />
              {blog.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-elevated text-cyan-400 border border-surface-border">
                  <FiFolder className="text-[11px]" />
                  <span>{blog.category}</span>
                </span>
              )}
              {blog.tag && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-elevated text-amber-300 border border-surface-border">
                  <FiTag className="text-[11px]" />
                  <span>{blog.tag}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-content-primary leading-tight">
              {blog.title}
            </h1>

            {formattedSlug && (
              <p className="inline-flex items-center gap-1.5 text-xs text-content-muted font-mono bg-surface-elevated px-2.5 py-1 rounded-md border border-surface-border">
                <FiGlobe className="text-xs" />
                <span>{formattedSlug}</span>
              </p>
            )}

            {blog.banner_url && (
              <div className="overflow-hidden rounded-xl border border-surface-border mt-4">
                <BlogThumbnail
                  key={blog.banner_url}
                  bannerUrl={blog.banner_url}
                  title={blog.title}
                  size="lg"
                  className="max-h-[380px]"
                />
              </div>
            )}
          </div>

          {/* Article Markdown Content Card */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-content-primary text-base border-b border-surface-border pb-3">
              Nội dung bài viết
            </h3>
            <div className="py-2">
              {blog.content ? (
                <MarkdownContent content={blog.content} />
              ) : (
                <p className="text-xs text-content-muted italic">Bài viết chưa có nội dung văn bản.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Information & SEO Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Metadata Card */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-content-primary text-sm border-b border-surface-border pb-2.5">
              Thông tin hệ thống
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-surface-border/50">
                <span className="text-content-muted">Tác giả</span>
                <span className="font-medium text-content-primary">{blog.seo?.author || "VietQuant"}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-border/50">
                <span className="text-content-muted">Ngày tạo</span>
                <span className="font-medium text-content-primary">
                  {blog.created_at ? formatCmsDate(blog.created_at) : "Chưa cập nhật"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-content-muted">Cập nhật lần cuối</span>
                <span className="font-medium text-content-primary">
                  {blog.modified_at ? formatCmsDate(blog.modified_at) : "Chưa cập nhật"}
                </span>
              </div>
            </div>
          </div>

          {/* SEO Metadata Card */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-content-primary text-sm border-b border-surface-border pb-2.5">
              Cấu hình SEO
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-content-muted block mb-0.5">Tiêu đề SEO</label>
                <p className="font-medium text-content-primary">{blog.seo?.title || "Chưa cấu hình"}</p>
              </div>
              <div>
                <label className="text-content-muted block mb-0.5">Mô tả SEO</label>
                <p className="text-content-secondary leading-relaxed">{blog.seo?.description || "Chưa cấu hình"}</p>
              </div>
              {blog.seo?.keywords && blog.seo.keywords.length > 0 && (
                <div>
                  <label className="text-content-muted block mb-1.5">Từ khóa SEO</label>
                  <div className="flex flex-wrap gap-1.5">
                    {blog.seo.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded bg-surface-elevated text-[11px] text-content-secondary border border-surface-border"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa bài viết"
        message={`Bạn có chắc chắn muốn xóa bài viết "${blog.title}"? Bài viết sẽ được chuyển vào thùng rác.`}
        confirmLabel="Xóa bài viết"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </section>
  );
};

export default BlogDetailPage;
