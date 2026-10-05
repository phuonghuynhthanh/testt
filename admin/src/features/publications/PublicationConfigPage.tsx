import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Eye } from "@phosphor-icons/react";
import { getBlogDetail } from "../../services/blog/handleBlog";
import { PUBLIC_SITE_URL } from "../../config/config";
import { BlogThumbnail, PageHeader, SectionHeading } from "../../shared/ui";
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

  if (blogQuery.isLoading) {
    return <p className="py-16 text-center text-xs text-content-muted">Đang tải bài nguồn…</p>;
  }

  if (blogQuery.isError || !blog) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-xs text-rose-400">Không thể tải bài nguồn.</p>
        <Link to="/blog" className="btn btn-secondary">Quay về quản lý bài viết</Link>
      </div>
    );
  }

  if (blog.state !== "APPROVED") {
    return (
      <div className="panel space-y-3 border-amber-500/30 p-5 text-xs text-amber-300">
        <p>Bài website chưa được duyệt. Duyệt bài trong quản lý bài viết trước khi tạo bài LinkedIn.</p>
        <Link to="/blog" className="btn btn-secondary">Quay về quản lý bài viết</Link>
      </div>
    );
  }

  const websiteUrl = `${PUBLIC_SITE_URL}/insights/${encodeURIComponent(blog.link_post.replace(/^\/+/, ""))}`;

  return (
    <section className="mx-auto max-w-[1096px]">
      <Link to="/publications" className="btn btn-ghost mb-5">
        <ArrowLeft size={16} weight="light" />
        <span>Quay lại Xuất bản bài viết</span>
      </Link>

      <PageHeader
        title="Soạn bài LinkedIn từ blog"
        description="Biên soạn, kiểm tra tính xác thực và đăng bài trực tiếp lên LinkedIn."
      />

      <div className="panel mb-6 p-4 space-y-4">
        <SectionHeading title="Bài viết nguồn" />
        <div className="flex items-center gap-3.5">
          <BlogThumbnail bannerUrl={blog.banner_url} title={blog.title} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{blog.title}</p>
            <p className="mt-0.5 text-[11px] text-content-muted">
              {blog.category} · /{blog.link_post}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !h-8">
                <ArrowUpRight size={14} weight="light" />
                Xem trên website
              </a>
            )}
            <Link to={`/blog/detail/${blogId}`} className="btn btn-ghost !h-8">
              <Eye size={14} weight="light" />
              Xem bài
            </Link>
          </div>
        </div>
      </div>

      <PublicationConfigWorkspace key={blogId} blogId={blogId} />
    </section>
  );
};

export default PublicationConfigPage;
