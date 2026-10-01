import React from "react";
import { FiCheckCircle, FiClock } from "react-icons/fi";
import type { LinkedInPostStatus, LinkedInSourceType } from "../../../types/LinkedIn";

interface LinkedInTableToolbarProps {
  status: LinkedInPostStatus | "";
  onStatusChange: (status: LinkedInPostStatus | "") => void;
  sourceType: LinkedInSourceType | "";
  onSourceTypeChange: (source: LinkedInSourceType | "") => void;
  onResetFilters: () => void;
  onVerify: () => void;
  isVerifying: boolean;
  verified: boolean | null;
  showHistory: boolean;
  onToggleHistory: () => void;
}

const STATUS_FILTERS: Array<{ value: LinkedInPostStatus | ""; label: string }> = [
  { value: "", label: "Mọi trạng thái" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "READY", label: "Sẵn sàng" },
  { value: "PUBLISHING", label: "Đang đăng" },
  { value: "PUBLISHED", label: "Đã đăng" },
  { value: "FAILED", label: "Lỗi" },
  { value: "REVIEW_REQUIRED", label: "Cần duyệt tay" },
];

const SOURCE_FILTERS: Array<{ value: LinkedInSourceType | ""; label: string }> = [
  { value: "", label: "Mọi nguồn" },
  { value: "INDEPENDENT_AI", label: "AI độc lập" },
  { value: "BLOG_ADAPTATION", label: "Từ bài blog" },
  { value: "CUSTOM", label: "Tự soạn" },
];

// Render filter dropdowns, quick clear button, and connection actions for the LinkedIn table.
export const LinkedInTableToolbar: React.FC<LinkedInTableToolbarProps> = ({
  status,
  onStatusChange,
  sourceType,
  onSourceTypeChange,
  onResetFilters,
  onVerify,
  isVerifying,
  verified,
  showHistory,
  onToggleHistory,
}) => {
  const hasFilters = Boolean(status || sourceType);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-card p-3 rounded-xl border border-surface-border">
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as LinkedInPostStatus | "")}
          className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
        >
          {STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={sourceType}
          onChange={(e) => onSourceTypeChange(e.target.value as LinkedInSourceType | "")}
          className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
        >
          {SOURCE_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-content-muted hover:text-content-primary underline px-1 py-1 transition-colors"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Kiểm tra kết nối LinkedIn"
          aria-label="Kiểm tra kết nối LinkedIn"
          onClick={onVerify}
          disabled={isVerifying}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-surface-elevated px-2.5 text-xs font-medium text-emerald-400 hover:bg-surface-hover disabled:opacity-50 transition-colors"
        >
          <FiCheckCircle className="text-sm" />
          <span className="hidden lg:inline">{isVerifying ? "Đang kiểm tra..." : "Kiểm tra kết nối"}</span>
        </button>

        {verified !== null && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              verified
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                : "bg-amber-950/40 text-amber-400 border-amber-500/30"
            }`}
          >
            {verified ? "Đã kết nối" : "Chưa kết nối"}
          </span>
        )}

        <button
          type="button"
          title={showHistory ? "Ẩn lịch sử Company Page" : "Hiện lịch sử Company Page"}
          aria-label={showHistory ? "Ẩn lịch sử Company Page" : "Hiện lịch sử Company Page"}
          onClick={onToggleHistory}
          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            showHistory
              ? "bg-surface-elevated text-primary-green border-primary-green/40"
              : "border-surface-border bg-surface-elevated text-content-secondary hover:bg-surface-hover"
          }`}
        >
          <FiClock className="text-sm" />
          <span className="hidden lg:inline">{showHistory ? "Ẩn lịch sử" : "Lịch sử"}</span>
        </button>
      </div>
    </div>
  );
};

export default LinkedInTableToolbar;
