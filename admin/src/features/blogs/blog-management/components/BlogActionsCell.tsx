import React from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiSend, FiEdit2, FiTrash2 } from "react-icons/fi";
import type { BlogState } from "../../../../types/Blog";

interface BlogActionsCellProps {
  blogId: string;
  state: BlogState;
  onApprove: (blogId: string) => void;
  onDelete: (blogId: string) => void;
  isApproving?: boolean;
}

// Render row actions including quick approve, direct publish, edit, and soft delete.
export const BlogActionsCell: React.FC<BlogActionsCellProps> = ({
  blogId,
  state,
  onApprove,
  onDelete,
  isApproving = false,
}) => {
  return (
    <div className="inline-flex items-center gap-1.5 justify-end">
      {state === "PENDING" && (
        <button
          type="button"
          onClick={() => onApprove(blogId)}
          disabled={isApproving}
          title={isApproving ? "Đang duyệt bài viết" : "Duyệt bài viết"}
          aria-label={isApproving ? "Đang duyệt bài viết" : "Duyệt bài viết"}
          className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-emerald-400 hover:bg-emerald-950/30 hover:border-emerald-500/40 transition-colors disabled:opacity-50"
        >
          <FiCheck className={`w-3.5 h-3.5 ${isApproving ? "animate-pulse" : ""}`} />
        </button>
      )}

      <Link
        to={`/publications/${blogId}`}
        title="Mở cấu hình xuất bản"
        aria-label="Mở cấu hình xuất bản"
        className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-content-primary hover:bg-surface-hover hover:border-primary-green/40 hover:text-primary-green transition-colors"
      >
        <FiSend className="w-3 h-3 text-primary-green" />
      </Link>

      <Link
        to={`/blog/default/${blogId}`}
        title="Chỉnh sửa bài viết"
        aria-label="Chỉnh sửa bài viết"
        className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-content-secondary hover:text-cyan-300 hover:bg-cyan-950/30 hover:border-cyan-800/40 transition-colors"
      >
        <FiEdit2 className="w-3.5 h-3.5" />
      </Link>

      <button
        type="button"
        title="Xóa bài viết"
        aria-label="Xóa bài viết"
        onClick={() => onDelete(blogId)}
        className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-content-secondary hover:text-rose-300 hover:bg-rose-950/30 hover:border-rose-800/40 transition-colors"
      >
        <FiTrash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default BlogActionsCell;
