import React from "react";
import { Link } from "react-router-dom";
import type { IBlogItemData } from "../../../../types/Blog";
import { formatCmsDateOnly } from "../../../../utils/date";
import { StatusBadge, BlogThumbnail } from "../../../../shared/ui";
import BlogActionsCell from "./BlogActionsCell";

interface BlogTableRowProps {
  blog: IBlogItemData;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  isApproving?: boolean;
}

// Render one article row displaying thumbnail, title, slug, category, status, and action controls.
export const BlogTableRow: React.FC<BlogTableRowProps> = ({
  blog,
  onApprove,
  onDelete,
  isApproving,
}) => {
  const formattedSlug = blog.link_post
    ? `/${blog.link_post.replace(/^\/+/, "")}`
    : "";

  return (
    <tr className="hover:bg-surface-hover/60 transition-colors group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-0 max-w-md">
          <Link to={`/blog/detail/${blog.id}`} className="shrink-0" title="Xem chi tiết bài viết">
            <BlogThumbnail
              bannerUrl={blog.banner_url}
              title={blog.title}
              size="md"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/blog/detail/${blog.id}`} className="block" title={blog.title}>
              <h4 className="text-xs sm:text-sm font-semibold text-content-primary truncate group-hover:text-primary-green transition-colors">
                {blog.title}
              </h4>
            </Link>
            {formattedSlug && (
              <p
                className="text-[11px] text-content-muted truncate font-mono mt-0.5"
                title={formattedSlug}
              >
                {formattedSlug}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="py-3 px-4 text-xs text-content-secondary whitespace-nowrap">
        {blog.category || "Chưa phân loại"}
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        <StatusBadge status={blog.state} />
      </td>

      <td className="py-3 px-4 text-xs text-content-muted whitespace-nowrap">
        {formatCmsDateOnly(blog.modified_at)}
      </td>

      <td className="py-3 px-4 text-right whitespace-nowrap">
        <BlogActionsCell
          blogId={blog.id}
          state={blog.state}
          onApprove={onApprove}
          onDelete={onDelete}
          isApproving={isApproving}
        />
      </td>
    </tr>
  );
};

export default BlogTableRow;
