import React from "react";
import type { BlogState } from "../../types/Blog";
import type { LinkedInPostStatus, LinkedInSourceType } from "../../types/LinkedIn";

type StatusValue = BlogState | LinkedInPostStatus | LinkedInSourceType | string;

interface StatusBadgeProps {
  status: StatusValue;
  size?: "sm" | "md";
  className?: string;
}

interface BadgeConfig {
  label: string;
  classes: string;
}

// Map each known status or source enum to a human-readable Vietnamese label and semantic theme classes.
const getBadgeConfig = (status: StatusValue): BadgeConfig => {
  switch (status) {
    case "APPROVED":
      return {
        label: "Đã duyệt",
        classes: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30",
      };
    case "PUBLISHED":
      return {
        label: "Đã đăng",
        classes: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30",
      };
    case "READY":
      return {
        label: "Sẵn sàng",
        classes: "bg-blue-950/40 text-blue-400 border-blue-500/30",
      };
    case "PENDING":
      return {
        label: "Chờ duyệt",
        classes: "bg-amber-950/40 text-amber-400 border-amber-500/30",
      };
    case "REVIEW_REQUIRED":
      return {
        label: "Cần xem xét",
        classes: "bg-amber-950/40 text-amber-400 border-amber-500/30",
      };
    case "PUBLISHING":
      return {
        label: "Đang đăng",
        classes: "bg-cyan-950/40 text-cyan-400 border-cyan-500/30",
      };
    case "REJECTED":
      return {
        label: "Từ chối",
        classes: "bg-rose-950/40 text-rose-400 border-rose-500/30",
      };
    case "FAILED":
      return {
        label: "Thất bại",
        classes: "bg-rose-950/40 text-rose-400 border-rose-500/30",
      };
    case "DRAFT":
      return {
        label: "Bản nháp",
        classes: "bg-zinc-800 text-zinc-300 border-zinc-700",
      };
    case "INDEPENDENT_AI":
      return {
        label: "AI Độc lập",
        classes: "bg-purple-950/40 text-purple-300 border-purple-500/30",
      };
    case "BLOG_ADAPTATION":
      return {
        label: "Chuyển từ Blog",
        classes: "bg-indigo-950/40 text-indigo-300 border-indigo-500/30",
      };
    case "CUSTOM":
      return {
        label: "Thủ công",
        classes: "bg-zinc-800 text-zinc-300 border-zinc-700",
      };
    default:
      return {
        label: String(status),
        classes: "bg-zinc-800 text-zinc-400 border-zinc-700",
      };
  }
};

// Render a styled status indicator badge with semantic colors and localized label.
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "sm",
  className = "",
}) => {
  const { label, classes } = getBadgeConfig(status);
  const sizeClasses =
    size === "sm"
      ? "text-xs px-2.5 py-0.5"
      : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide whitespace-nowrap ${classes} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {label}
    </span>
  );
};

export default StatusBadge;
