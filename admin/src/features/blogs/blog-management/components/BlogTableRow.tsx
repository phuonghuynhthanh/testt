import React from "react";
import type { IBlogItemData } from "../../../../types/Blog";
import { formatCmsDateOnly } from "../../../../utils/date";
import { StatusBadge, BlogThumbnail } from "../../../../shared/ui";
import BlogActionsCell from "./BlogActionsCell";

interface BlogTableRowProps {
  blog: IBlogItemData;
  index: number;
  selected: boolean;
  keyboardActive: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  isApproving?: boolean;
}

// Render one dense blog row with selection, thumbnail + title, category, state, date and actions.
export const BlogTableRow: React.FC<BlogTableRowProps> = ({
  blog,
  index,
  selected,
  keyboardActive,
  onToggleSelect,
  onOpen,
  onApprove,
  onDelete,
  isApproving,
}) => {
  const formattedSlug = blog.link_post ? `/${blog.link_post.replace(/^\/+/, "")}` : "";
  const category = blog.category || "Chưa phân loại";

  return (
    <tr className={`${selected ? "sel" : ""}${keyboardActive ? " kb" : ""}`} data-id={blog.id} data-i={index}>
      <td className="c-chk">
        <label className="chk">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(blog.id)}
            aria-label={`Chọn bài ${blog.title}`}
          />
        </label>
      </td>

      <td className="c-ttl">
        <div className="c-title">
          <BlogThumbnail bannerUrl={blog.banner_url} title={blog.title} size="sm" />
          <div className="t-main">
            <button type="button" className="t-btn" title={blog.title} onClick={() => onOpen(blog.id)}>
              {blog.title}
            </button>
            <span className="sub">
              <span className="slug mono">{formattedSlug}</span>
              <span className="cat-in">{category}</span>
            </span>
          </div>
        </div>
      </td>

      <td className="c-cat" title={category}>
        {category}
      </td>

      <td className="c-state">
        <StatusBadge status={blog.state} variant="state" />
      </td>

      <td className="c-date mono" title={blog.modified_at}>
        {formatCmsDateOnly(blog.modified_at)}
      </td>

      <td className="c-act">
        <BlogActionsCell
          blogId={blog.id}
          title={blog.title}
          state={blog.state}
          onOpen={onOpen}
          onApprove={onApprove}
          onDelete={onDelete}
          isApproving={isApproving}
        />
      </td>
    </tr>
  );
};

export default BlogTableRow;
