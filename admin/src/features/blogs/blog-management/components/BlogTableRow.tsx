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

// Render one dense blog row: thumbnail + title, category, state, date and icon actions.
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
    <tr>
      <td className="c-ttl">
        <div className="c-title">
          <Link to={`/blog/detail/${blog.id}`} className="shrink-0" title="Xem chi tiết bài viết" tabIndex={-1}>
            <BlogThumbnail bannerUrl={blog.banner_url} title={blog.title} size="sm" />
          </Link>
          <div className="t-main">
            <Link to={`/blog/detail/${blog.id}`} className="t-btn" title={blog.title}>
              {blog.title}
            </Link>
            {formattedSlug && (
              <span className="sub">
                <span className="mono" title={formattedSlug}>{formattedSlug}</span>
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="c-cat" title={blog.category || undefined}>
        {blog.category || "Chưa phân loại"}
      </td>

      <td className="c-state">
        <StatusBadge status={blog.state} variant="state" />
      </td>

      <td className="c-date mono">{formatCmsDateOnly(blog.modified_at)}</td>

      <td className="c-act">
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
