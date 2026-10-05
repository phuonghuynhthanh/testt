import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, PencilSimple, Trash, ArrowSquareOut, PaperPlaneTilt, ArrowClockwise } from "@phosphor-icons/react";
import type { LinkedInPost } from "../../../types/LinkedIn";
import { StatusBadge } from "../../../shared/ui";

interface LinkedInTableRowProps {
  post: LinkedInPost;
  index?: number;
  onPublish: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  isPublishing?: boolean;
  isRetrying?: boolean;
}

// Format a CMS timestamp as dd/MM/yyyy.
const formatLinkedInDate = (value?: string): string => {
  if (!value) return "Chưa cập nhật";
  const [date] = value.split("T");
  const [year, month, day] = date.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
};

// Render one LinkedIn post row as a grid list item with actions per status.
export const LinkedInTableRow: React.FC<LinkedInTableRowProps> = ({
  post,
  index = 0,
  onPublish,
  onRetry,
  onDelete,
  isPublishing,
  isRetrying,
}) => {
  const navigate = useNavigate();
  const first = post.content?.split("\n").find((line) => line.trim()) || "(Chưa có nội dung)";
  const title = post.topic || first;
  const locked = post.status === "PUBLISHING";
  const editable = ["DRAFT", "READY", "FAILED"].includes(post.status);

  // Open row details without intercepting independent buttons or links inside the row.
  const handleRowClick = (event: React.MouseEvent<HTMLLIElement>) => {
    if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
    navigate(`/linkedin/posts/${post.id}`);
  };

  return (
    <li
      onClick={handleRowClick}
      style={{ "--i": index } as React.CSSProperties}
      className="hrow row-in grid cursor-pointer gap-x-4 gap-y-3 px-3 py-2.5 transition-colors duration-300 hover:bg-surface-hover/50 lg:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_6rem_12.5rem] lg:items-center lg:px-5"
    >
      <div className="min-w-0">
        <Link
          to={`/linkedin/posts/${post.id}`}
          title={first}
          className="block truncate rounded text-sm font-semibold transition-colors duration-300 hover:text-primary-green"
        >
          {title}
        </Link>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-content-muted">{first}</p>
        {post.blogId && (
          <Link to={`/blog/detail/${post.blogId}`} className="mt-1 inline-block max-w-full truncate text-[11px] text-cyan-400 hover:underline">
            Bài blog: {post.blogTitle || post.blogId}
          </Link>
        )}
      </div>

      <div>
        <StatusBadge status={post.sourceType} />
      </div>
      <div>
        <StatusBadge status={post.status} />
      </div>
      <div className="text-xs text-content-muted">{formatLinkedInDate(post.modifiedAt)}</div>

      <div className="row-actions flex flex-wrap items-center gap-1 lg:justify-end">
        {["READY", "DRAFT"].includes(post.status) && (
          <button
            type="button"
            onClick={() => onPublish(post.id)}
            disabled={isPublishing}
            className="btn btn-li"
          >
            <PaperPlaneTilt size={14} weight="light" />
            {isPublishing ? "Đang gửi..." : "Đăng"}
          </button>
        )}

        {post.status === "FAILED" && (
          <button
            type="button"
            onClick={() => onRetry(post.id)}
            disabled={isRetrying}
            className="btn btn-danger"
          >
            <ArrowClockwise size={14} weight="light" />
            {isRetrying ? "Đang thử..." : "Thử lại"}
          </button>
        )}

        {locked && <span className="px-2 text-xs italic text-content-muted">Đang đăng...</span>}

        {post.providerPostId && (
          <a
            href={`https://www.linkedin.com/feed/update/${post.providerPostId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở bài trên LinkedIn"
            aria-label="Mở bài trên LinkedIn"
            className="iconbtn green"
          >
            <ArrowSquareOut size={18} weight="light" />
          </a>
        )}

        <Link
          to={`/linkedin/posts/${post.id}`}
          title={editable ? "Chỉnh sửa bài đăng" : "Xem chi tiết"}
          aria-label="Chi tiết"
          className="iconbtn cyan"
        >
          {editable ? <PencilSimple size={18} weight="light" /> : <Eye size={18} weight="light" />}
        </Link>

        <button
          type="button"
          title="Xóa bài khỏi CMS"
          aria-label="Xóa bài khỏi CMS"
          disabled={locked}
          onClick={() => onDelete(post.id)}
          className="iconbtn danger"
        >
          <Trash size={18} weight="light" />
        </button>
      </div>
    </li>
  );
};

export default LinkedInTableRow;
