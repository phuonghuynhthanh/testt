import React from "react";
import { CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import type { BlogState } from "../../types/Blog";
import type { LinkedInPostStatus, LinkedInSourceType } from "../../types/LinkedIn";

type StatusValue = BlogState | LinkedInPostStatus | LinkedInSourceType | string;

interface StatusBadgeProps {
  status: StatusValue;
  /** "state" renders the icon-based badge used in the blog list table. */
  variant?: "badge" | "state";
}

// Label and Tailwind palette classes per status, matching the design preview exactly.
const BADGES: Record<string, [string, string]> = {
  APPROVED: ["Đã duyệt", "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"],
  PUBLISHED: ["Đã đăng", "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"],
  READY: ["Sẵn sàng", "bg-blue-950/40 text-blue-400 border-blue-500/30"],
  PENDING: ["Chờ duyệt", "bg-amber-950/40 text-amber-400 border-amber-500/30"],
  REVIEW_REQUIRED: ["Cần duyệt tay", "bg-amber-950/40 text-amber-400 border-amber-500/30"],
  PUBLISHING: ["Đang đăng", "bg-cyan-950/40 text-cyan-400 border-cyan-500/30"],
  REJECTED: ["Từ chối", "bg-rose-950/40 text-rose-400 border-rose-500/30"],
  FAILED: ["Thất bại", "bg-rose-950/40 text-rose-400 border-rose-500/30"],
  DRAFT: ["Bản nháp", "bg-zinc-800 text-zinc-300 border-zinc-700"],
  INDEPENDENT_AI: ["AI độc lập", "bg-purple-950/40 text-purple-300 border-purple-500/30"],
  BLOG_ADAPTATION: ["Từ bài blog", "bg-indigo-950/40 text-indigo-300 border-indigo-500/30"],
  CUSTOM: ["Tự soạn", "bg-zinc-800 text-zinc-300 border-zinc-700"],
};

const STATE_BADGES: Record<string, { cls: string; label: string; Icon: typeof Clock }> = {
  PENDING: { cls: "st-pending", label: "Chờ duyệt", Icon: Clock },
  APPROVED: { cls: "st-approved", label: "Đã duyệt", Icon: CheckCircle },
  REJECTED: { cls: "st-rejected", label: "Từ chối", Icon: XCircle },
};

// Render a status or source badge with semantic colors.
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = "badge" }) => {
  const key = String(status);
  const stateBadge = variant === "state" ? STATE_BADGES[key] : undefined;
  if (stateBadge) {
    return (
      <span className={`st ${stateBadge.cls}`}>
        <stateBadge.Icon size={14} weight="light" />
        {stateBadge.label}
      </span>
    );
  }

  const [label, classes] = BADGES[key] ?? [key, "bg-zinc-800 text-zinc-400 border-zinc-700"];

  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-md border px-2 text-xs font-medium ${classes}${
        key === "PUBLISHING" ? " animate-pulse" : ""
      }`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

export default StatusBadge;
