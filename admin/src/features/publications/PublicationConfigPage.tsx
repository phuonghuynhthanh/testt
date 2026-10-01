import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import { getBlogDetail } from "../../services/blog/handleBlog";
import { PageHeader } from "../../shared/ui";
import PublicationConfigWorkspace from "./components/PublicationConfigWorkspace";

// Render publication configuration page with back link, header, and publication workspace.
const PublicationConfigPage: React.FC = () => {
  const { blog_id: blogId = "" } = useParams<{ blog_id: string }>();

  const blogQuery = useQuery({
    queryKey: ["blogDetail", blogId],
    queryFn: () => getBlogDetail(blogId),
    enabled: Boolean(blogId),
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/publications"
          title="Quay lại danh sách xuất bản"
          aria-label="Quay lại danh sách xuất bản"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
        >
          <FiArrowLeft className="text-sm" />
          <span>Quay lại danh sách</span>
        </Link>
        <PageHeader
          title={blogQuery.data?.title ? `Xuất bản: ${blogQuery.data.title}` : "Cấu hình xuất bản"}
          description="Thiết lập kênh phát hành, nội dung LinkedIn và tiến trình xuất bản đa nền tảng."
        />
      </div>

      <PublicationConfigWorkspace
        blogId={blogId}
        blogState={blogQuery.data?.state}
      />
    </section>
  );
};

export default PublicationConfigPage;
