import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PencilSimple, LinkedinLogo, Trash, Tag, Folder, Globe } from "@phosphor-icons/react";
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
      <div className="py-24 text-center text-xs text-content-muted">
        Đang tải thông tin chi tiết bài viết...
      </div>
    );
  }

  if (blogQuery.isError || !blog) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-xs text-rose-400">Không tìm thấy bài viết hoặc đã xảy ra lỗi tải dữ liệu.</p>
        <Link to="/blog" className="btn btn-secondary">
          <ArrowLeft weight="light" className="text-sm" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  const formattedSlug = blog.link_post ? `/${blog.link_post.replace(/^\/+/, "")}` : "";

  return (
    <section className="max-w-[1096px] mx-auto">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-surface-border pb-4 sm:flex-row sm:items-center">
        <Link
          to="/blog"
          title="Quay lại danh sách bài viết"
          aria-label="Quay lại danh sách bài viết"
          className="btn btn-ghost self-start"
        >
          <ArrowLeft size={16} weight="light" />
          <span>Quay lại danh sách</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {blog.state === "APPROVED" && (
            <Link
              to={`/publications/${blogId}`}
              title="Tạo bài LinkedIn"
              aria-label="Tạo bài LinkedIn"
              className="btn btn-li"
            >
              <LinkedinLogo size={16} weight="light" />
              <span>Tạo bài LinkedIn</span>
            </Link>
          )}

          <Link
            to={`/blog/default/${blogId}`}
            title="Chỉnh sửa bài viết"
            aria-label="Chỉnh sửa bài viết"
            className="btn btn-secondary"
          >
            <PencilSimple size={16} weight="light" />
            <span>Chỉnh sửa</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="Xóa bài viết"
            aria-label="Xóa bài viết"
            className="btn btn-danger"
          >
            <Trash size={16} weight="light" />
            <span>Xóa bài viết</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="panel overflow-hidden">
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={blog.state || "PENDING"} />
                {blog.category && (
                  <span className="chip text-cyan-300">
                    <Folder size={12} weight="light" />
                    {blog.category}
                  </span>
                )}
                {blog.tag && (
                  <span className="chip text-amber-300">
                    <Tag size={12} weight="light" />
                    {blog.tag}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{blog.title}</h1>

              {formattedSlug && (
                <p className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-elevated px-2.5 py-1 font-mono text-xs text-content-muted">
                  <Globe size={14} weight="light" />
                  {formattedSlug}
                </p>
              )}
            </div>

            {blog.banner_url && (
              <div className="border-t border-surface-border bg-surface-elevated">
                <BlogThumbnail
                  key={blog.banner_url}
                  bannerUrl={blog.banner_url}
                  title={blog.title}
                  size="lg"
                  className="!h-56 !rounded-none !border-0 sm:!h-80"
                />
              </div>
            )}
          </div>

          <div className="panel p-6">
            <h3 className="mb-4 border-b border-surface-border pb-3 text-base font-semibold">Nội dung bài viết</h3>
            {blog.content ? (
              <MarkdownContent content={blog.content} />
            ) : (
              <p className="text-xs italic text-content-muted">Bài viết chưa có nội dung văn bản.</p>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="panel p-5">
            <h3 className="mb-2 border-b border-surface-border pb-2.5 text-sm font-semibold">Thông tin hệ thống</h3>
            <div className="text-xs">
              <div className="flex items-center justify-between border-b border-surface-border/50 py-2">
                <span className="text-content-muted">Tác giả</span>
                <span className="font-medium">{blog.seo?.author || "VietQuant"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-surface-border/50 py-2">
                <span className="text-content-muted">Ngày tạo</span>
                <span className="font-medium">{blog.created_at ? formatCmsDate(blog.created_at) : "Chưa cập nhật"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-content-muted">Cập nhật lần cuối</span>
                <span className="font-medium">{blog.modified_at ? formatCmsDate(blog.modified_at) : "Chưa cập nhật"}</span>
              </div>
            </div>
          </div>

          <div className="panel space-y-3 p-5 text-xs">
            <h3 className="border-b border-surface-border pb-2.5 text-sm font-semibold">Cấu hình SEO</h3>
            <div>
              <span className="mb-0.5 block text-content-muted">Tiêu đề SEO</span>
              <p className="font-medium">{blog.seo?.title || "Chưa cấu hình"}</p>
            </div>
            <div>
              <span className="mb-0.5 block text-content-muted">Mô tả SEO</span>
              <p className="leading-relaxed text-content-secondary">{blog.seo?.description || "Chưa cấu hình"}</p>
            </div>
            {blog.seo?.keywords && blog.seo.keywords.length > 0 && (
              <div>
                <span className="mb-1.5 block text-content-muted">Từ khóa SEO</span>
                <div className="flex flex-wrap gap-1.5">
                  {blog.seo.keywords.map((kw) => (
                    <span key={kw} className="chip !rounded-md">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
