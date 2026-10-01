import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEdit2, FiTrash2, FiExternalLink } from "react-icons/fi";
import type { LinkedInPost, LinkedInPostStatus, LinkedInSourceType } from "../../../types/LinkedIn";

interface LinkedInTableRowProps {
  post: LinkedInPost;
  onPublish: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  isPublishing?: boolean;
  isRetrying?: boolean;
}

// Map source enum to readable Vietnamese source labels.
const getSourceLabel = (sourceType: LinkedInSourceType): string => {
  switch (sourceType) {
    case "INDEPENDENT_AI":
      return "AI độc lập";
    case "BLOG_ADAPTATION":
      return "Từ bài blog";
    case "CUSTOM":
      return "Tự soạn";
    default:
      return sourceType;
  }
};

// Render status dot badge matching semantic colors and review notes.
const renderStatusBadge = (status: LinkedInPostStatus) => {
  switch (status) {
    case "PUBLISHING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-950/40 text-cyan-400 border border-cyan-500/30">
          <span className="size-1.5 rounded-full bg-cyan-400" />
          <span>Đang đăng</span>
        </span>
      );
    case "READY":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/40 text-blue-400 border border-blue-500/30">
          <span className="size-1.5 rounded-full bg-blue-400" />
          <span>Sẵn sàng</span>
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
          <span className="size-1.5 rounded-full bg-zinc-400" />
          <span>Bản nháp</span>
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-950/40 text-purple-300 border border-purple-500/30">
            <span className="size-1.5 rounded-full bg-purple-400" />
            <span>Cần duyệt tay</span>
          </span>
          <span className="block text-[10px] text-content-muted">
            Không thử lại tự động
          </span>
        </div>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/40 text-rose-400 border border-rose-500/30">
          <span className="size-1.5 rounded-full bg-rose-400" />
          <span>Lỗi</span>
        </span>
      );
    case "PUBLISHED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span>Đã đăng</span>
        </span>
      );
    default:
      return <span className="text-xs text-content-muted">{status}</span>;
  }
};

// Format CMS timestamp into HH:mm DD/MM/YYYY.
const formatLinkedInDate = (value?: string): string => {
  if (!value) return "";
  const [date, time = ""] = value.split("T");
  const [year, month, day] = date.split("-");
  const clock = time.slice(0, 5);
  return clock && day && month && year
    ? `${clock} ${day}/${month}/${year}`
    : `${day}/${month}/${year}`;
};

// Render one row in the LinkedIn post management table with actions per status.
export const LinkedInTableRow: React.FC<LinkedInTableRowProps> = ({
  post,
  onPublish,
  onRetry,
  onDelete,
  isPublishing,
  isRetrying,
}) => {
  const navigate = useNavigate();
  const title = post.topic || post.content?.split("\n")[0] || "Bài đăng LinkedIn";
  const snippet =
    post.content?.split("\n").filter(Boolean)[1] ||
    post.content?.slice(0, 80) ||
    "";

  // Open row details without intercepting independent buttons or links inside the row.
  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
    navigate(`/linkedin/posts/${post.id}`);
  };

  return (
    <tr onClick={handleRowClick} className="cursor-pointer hover:bg-surface-hover/60 transition-colors group">
      <td className="py-3 px-4 max-w-sm sm:max-w-md">
        <h4 className="text-xs sm:text-sm font-semibold text-content-primary truncate group-hover:text-primary-green transition-colors">
          <Link to={`/linkedin/posts/${post.id}`} title="Xem chi tiết bài đăng LinkedIn" className="focus-visible:outline focus-visible:outline-primary-green">
            {title}
          </Link>
        </h4>
        <p className="text-[11px] text-content-muted truncate mt-0.5 leading-relaxed">
          {snippet}
        </p>
      </td>

      <td className="py-3 px-4 text-xs text-content-secondary whitespace-nowrap">
        {getSourceLabel(post.sourceType)}
      </td>

      <td className="py-3 px-4 whitespace-nowrap">
        {renderStatusBadge(post.status)}
      </td>

      <td className="py-3 px-4 text-xs text-content-muted whitespace-nowrap">
        {formatLinkedInDate(post.modifiedAt)}
      </td>

      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5 justify-end">
          {/* Action button per state */}
          {post.status === "PUBLISHING" && (
            <span className="text-xs text-content-muted italic px-2">Đang đăng...</span>
          )}

          {["READY", "DRAFT"].includes(post.status) && (
            <button
              type="button"
              onClick={() => onPublish(post.id)}
              disabled={isPublishing}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-950/40 text-teal-300 border border-teal-500/30 hover:bg-teal-900/40 transition-colors disabled:opacity-50"
            >
              {isPublishing ? "Đang gửi..." : "Đăng"}
            </button>
          )}

          {post.status === "FAILED" && (
            <button
              type="button"
              onClick={() => onRetry(post.id)}
              disabled={isRetrying}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/40 transition-colors disabled:opacity-50"
            >
              {isRetrying ? "Đang thử..." : "Thử lại"}
            </button>
          )}

          {/* Edit icon for editable states */}
          {["DRAFT", "READY", "FAILED"].includes(post.status) && (
            <Link
              to={`/linkedin/posts/${post.id}`}
              title="Chỉnh sửa bài đăng"
              aria-label="Chỉnh sửa bài đăng"
              className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-content-secondary hover:text-cyan-300 transition-colors"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* View icon for non-editable / published / review states */}
          {!["DRAFT", "READY", "FAILED"].includes(post.status) && (
            <Link
              to={`/linkedin/posts/${post.id}`}
              title="Xem chi tiết"
              aria-label="Xem chi tiết"
              className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-content-secondary hover:text-cyan-300 transition-colors"
            >
              <FiEye className="w-3.5 h-3.5" />
            </Link>
          )}

          {post.providerPostId && (
            <a
              href={`https://www.linkedin.com/feed/update/${post.providerPostId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở bài trên LinkedIn"
              aria-label="Mở bài trên LinkedIn"
              className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-[#0a66c2] hover:bg-surface-hover transition-colors"
            >
              <FiExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            title="Xóa bài khỏi CMS"
            aria-label="Xóa bài khỏi CMS"
            onClick={() => onDelete(post.id)}
            className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-content-secondary hover:text-rose-400 transition-colors"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default LinkedInTableRow;
