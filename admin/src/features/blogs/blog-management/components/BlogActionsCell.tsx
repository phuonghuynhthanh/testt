import React from "react";
import { Link } from "react-router-dom";
import { Check, LinkedinLogo, PencilSimple, Trash, Eye } from "@phosphor-icons/react";
import type { BlogState } from "../../../../types/Blog";

interface BlogActionsCellProps {
  blogId: string;
  state: BlogState;
  onApprove: (blogId: string) => void;
  onDelete: (blogId: string) => void;
  isApproving?: boolean;
}

// Render icon-only row actions: view, edit, approve or LinkedIn, delete.
export const BlogActionsCell: React.FC<BlogActionsCellProps> = ({
  blogId,
  state,
  onApprove,
  onDelete,
  isApproving = false,
}) => {
  return (
    <span className="row">
      <Link
        to={`/blog/detail/${blogId}`}
        title="Xem chi tiết bài viết"
        aria-label="Xem chi tiết bài viết"
        className="ib"
      >
        <Eye size={18} weight="light" />
      </Link>

      <Link
        to={`/blog/default/${blogId}`}
        title="Chỉnh sửa bài viết"
        aria-label="Chỉnh sửa bài viết"
        className="ib"
      >
        <PencilSimple size={18} weight="light" />
      </Link>

      {state === "APPROVED" && (
        <Link
          to={`/publications/${blogId}`}
          title="Tạo bài LinkedIn"
          aria-label="Tạo bài LinkedIn"
          className="ib li"
        >
          <LinkedinLogo size={18} weight="light" />
        </Link>
      )}

      {state === "PENDING" && (
        <button
          type="button"
          onClick={() => onApprove(blogId)}
          disabled={isApproving}
          title={isApproving ? "Đang duyệt bài viết" : "Duyệt bài viết"}
          aria-label={isApproving ? "Đang duyệt bài viết" : "Duyệt bài viết"}
          className="ib ok"
        >
          <Check size={18} weight="light" className={isApproving ? "animate-spin" : ""} />
        </button>
      )}

      <button
        type="button"
        title="Xóa bài viết"
        aria-label="Xóa bài viết"
        onClick={() => onDelete(blogId)}
        className="ib bad"
      >
        <Trash size={18} weight="light" />
      </button>
    </span>
  );
};

export default BlogActionsCell;
