import React from "react";
import { ClockCounterClockwise, ArrowsClockwise } from "@phosphor-icons/react";
import type { LinkedInHistory } from "../../../types/LinkedIn";
import { formatCmsDateOnly } from "../../../utils/date";

interface LinkedInHistoryDrawerProps {
  showHistory: boolean;
  historyData?: LinkedInHistory;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onSync: () => void;
  isSyncing: boolean;
}

// Render company page live post synchronization panel.
export const LinkedInHistoryDrawer: React.FC<LinkedInHistoryDrawerProps> = ({
  showHistory,
  historyData,
  isLoading,
  isError,
  errorMessage,
  onSync,
  isSyncing,
}) => {
  if (!showHistory) return null;

  return (
    <div className="pop-in mb-5 rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold">
          <ClockCounterClockwise size={16} weight="light" className="text-[#6cb4f5]" />
          Lịch sử Company Page
        </h3>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          title="Đồng bộ lịch sử LinkedIn"
          className="btn btn-secondary !h-8"
        >
          <ArrowsClockwise size={14} weight="light" className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Đang đồng bộ..." : "Đồng bộ lịch sử"}
        </button>
      </div>

      {isLoading ? (
        <p className="py-2 text-center text-xs text-content-muted">Đang tải lịch sử...</p>
      ) : isError ? (
        <p className="rounded border border-amber-500/20 bg-amber-950/20 p-2 text-xs text-amber-400">
          {errorMessage || "Không thể tải lịch sử."}
        </p>
      ) : (historyData?.items.length ?? 0) === 0 ? (
        <p className="py-2 text-center text-xs text-content-muted">
          Chưa có dữ liệu lịch sử bài đăng nào.
        </p>
      ) : (
        <ul className="space-y-2">
          {historyData?.items.slice(0, 5).map((item) => (
            <li
              key={item.providerPostId}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 text-xs"
            >
              <div className="flex justify-between gap-3">
                <strong className="truncate">{item.topic}</strong>
                {item.publishedAt && (
                  <span className="shrink-0 text-content-muted">{formatCmsDateOnly(item.publishedAt)}</span>
                )}
              </div>
              <p className="mt-1 truncate text-content-muted">{item.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LinkedInHistoryDrawer;
