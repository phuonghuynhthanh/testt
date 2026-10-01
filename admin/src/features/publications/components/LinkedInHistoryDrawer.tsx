import React from "react";
import { FaLinkedin } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import type { LinkedInHistory } from "../../../types/LinkedIn";
import { formatCmsDate } from "../../../utils/date";

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
    <div className="bg-surface-card rounded-xl border border-surface-border p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-surface-border">
        <h3 className="font-semibold text-content-primary text-xs flex items-center gap-2">
          <FaLinkedin className="text-[#0a66c2]" />
          <span>Lịch sử Company Page</span>
        </h3>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          title={isSyncing ? "Đang đồng bộ lịch sử" : "Đồng bộ lịch sử LinkedIn"}
          aria-label={isSyncing ? "Đang đồng bộ lịch sử" : "Đồng bộ lịch sử LinkedIn"}
          className="inline-flex size-7 items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-cyan-400 hover:bg-surface-hover disabled:opacity-50"
        >
          <FiRefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-content-muted py-2 text-center">Đang tải lịch sử...</p>
      ) : isError ? (
        <p className="text-xs text-amber-400 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/20">
          {errorMessage || "Không thể tải lịch sử."}
        </p>
      ) : (historyData?.items.length ?? 0) === 0 ? (
        <p className="text-xs text-content-muted py-2 text-center">
          Chưa có dữ liệu lịch sử bài đăng nào.
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {historyData?.items.map((item) => (
            <article
              key={item.providerPostId}
              className="bg-surface-elevated/50 p-2.5 rounded-lg border border-surface-border/60 text-xs space-y-1"
            >
              <strong className="text-content-primary font-medium block">
                {item.topic}
              </strong>
              <p className="text-content-secondary line-clamp-2 leading-relaxed">
                {item.content}
              </p>
              {item.publishedAt && (
                <span className="text-[11px] text-content-muted block">
                  Đăng lúc: {formatCmsDate(item.publishedAt)}
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkedInHistoryDrawer;
