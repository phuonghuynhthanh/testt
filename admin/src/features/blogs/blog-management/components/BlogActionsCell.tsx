import React from "react";
import { Link } from "react-router-dom";
import { Check, LinkedinLogo, PencilSimple, Trash, Eye } from "@phosphor-icons/react";
import type { BlogState } from "../../../../types/Blog";

interface BlogActionsCellProps {
  blogId: string;
  title: string;
  state: BlogState;
  onOpen: (blogId: string) => void;
  onApprove: (blogId: string) => void;
  onDelete: (blogId: string) => void;
  isApproving?: boolean;
}

// Render icon-only row actions: quick view, edit, approve or LinkedIn, delete.
export const BlogActionsCell: React.FC<BlogActionsCellProps> = ({
  blogId,
  title,
  state,
  onOpen,
  onApprove,
  onDelete,
  isApproving = false,
}) => {
  return (
    <span className="row">
      <button type="button" className="ib" title="Xem nhanh" aria-label={`Xem nhanh ${title}`} onClick={() => onOpen(blogId)}>
        <Eye size={18} weight="light" />
      </button>

      <Link to={`/blog/default/${blogId}`} title="Chỉnh sửa" aria-label={`Chỉnh sửa ${title}`} className="ib">
        <PencilSimple size={18} weight="light" />
      </Link>

      {state === "APPROVED" ? (
        <Link
          to={`/publications/${blogId}`}
          title="Tạo bài LinkedIn"
          aria-label={`Tạo bài LinkedIn từ ${title}`}
          className="ib li"
        >
          <LinkedinLogo size={18} weight="light" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onApprove(blogId)}
          disabled={isApproving}
          title="Duyệt"
          aria-label={`Duyệt ${title}`}
          className="ib ok"
        >
          <Check size={18} weight="light" />
        </button>
      )}

      <button type="button" title="Xóa" aria-label={`Xóa ${title}`} onClick={() => onDelete(blogId)} className="ib bad">
        <Trash size={18} weight="light" />
      </button>
    </span>
  );
};

export default BlogActionsCell;
