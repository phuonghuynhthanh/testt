import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBlogDetail } from "../../services/blog/handleBlog";
import { DOMAIN_WEBSITE } from "../../config/config";
import { PageHeader } from "../../shared/ui";
import PublicationConfigWorkspace from "./components/PublicationConfigWorkspace";

// Permit LinkedIn adaptation only after the source website article has been approved.
const PublicationConfigPage = () => {
  const { blog_id: blogId = "" } = useParams<{ blog_id: string }>();
  const blogQuery = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId),
    enabled: Boolean(blogId),
  });
  const blog = blogQuery.data;
  if (blogQuery.isLoading) return <p className="py-16 text-center text-content-muted">Đang tải bài nguồn…</p>;
  if (blogQuery.isError || !blog) return <p className="py-16 text-center text-rose-400">Không thể tải bài nguồn. <Link to="/blog" className="underline">Quay về quản lý bài viết</Link></p>;
  if (blog.state !== "APPROVED") return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 p-6 text-sm text-amber-300">
      <p>Bài website chưa được duyệt. Duyệt bài trong quản lý bài viết trước khi tạo bài LinkedIn.</p>
      <Link to="/blog" className="underline">Quay về quản lý bài viết</Link>
    </div>
  );
  const websiteUrl = DOMAIN_WEBSITE ? `${DOMAIN_WEBSITE}/blog/${encodeURIComponent(blog.link_post)}` : undefined;
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Link to="/publications" className="text-xs text-content-muted hover:text-primary-green">← Quay lại Xuất bản bài viết</Link>
      <PageHeader title="Đăng LinkedIn từ bài website" description="Chuyển bài đã duyệt thành bài LinkedIn, chọn ảnh và tùy chọn đính kèm liên kết." />
      <div className="rounded-xl border border-surface-border bg-surface-card p-5 space-y-2">
        <p className="text-xs text-content-muted">Bài nguồn · Đã duyệt và hiển thị trên website</p>
        <h2 className="text-base font-semibold text-content-primary">{blog.title}</h2>
        <div className="flex flex-wrap gap-4 text-xs text-primary-green">
          <Link to={`/blog/detail/${blogId}`}>Xem chi tiết bài nguồn</Link>
          {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer">Xem bài trên website ↗</a>}
        </div>
      </div>
      <PublicationConfigWorkspace key={blogId} blogId={blogId} />
    </section>
  );
};

export default PublicationConfigPage;
