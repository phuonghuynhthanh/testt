import React from "react";
import { CheckCircle, Clock, PlugsConnected, X } from "@phosphor-icons/react";
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

// Render filter dropdowns, quick clear button, and connection actions for the LinkedIn list.
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
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface-card p-3.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as LinkedInPostStatus | "")}
          aria-label="Lọc theo trạng thái"
          className="inp sm !w-auto"
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
          aria-label="Lọc theo nguồn"
          className="inp sm !w-auto"
        >
          {SOURCE_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button type="button" onClick={onResetFilters} className="btn btn-ghost !h-9">
            <X size={14} weight="light" />
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {verified !== null && (
          <span
            className={`chip ${
              verified
                ? "!border-emerald-500/30 !bg-emerald-950/40 !text-emerald-400"
                : "!border-amber-500/30 !bg-amber-950/40 !text-amber-400"
            }`}
          >
            <CheckCircle size={14} weight="light" />
            {verified ? "Kết nối sẵn sàng đăng bài" : "Chưa kết nối"}
          </span>
        )}

        <button type="button" onClick={onVerify} disabled={isVerifying} className="btn btn-secondary">
          <PlugsConnected size={16} weight="light" />
          {isVerifying ? "Đang kiểm tra..." : "Kiểm tra kết nối LinkedIn"}
        </button>

        <button
          type="button"
          onClick={onToggleHistory}
          aria-pressed={showHistory}
          className="btn btn-secondary"
        >
          <Clock size={16} weight="light" />
          {showHistory ? "Ẩn lịch sử Company Page" : "Hiện lịch sử Company Page"}
        </button>
      </div>
    </div>
  );
};

export default LinkedInTableToolbar;
