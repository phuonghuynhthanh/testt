import React from "react";

interface LinkedInPaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
}

// Render customized pagination bar showing page index, record count, and page size selector.
export const LinkedInPagination: React.FC<LinkedInPaginationProps> = ({
  page,
  totalPages,
  totalItems = 0,
  pageSize,
  onPageSizeChange,
  onPageChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface-card border-t border-surface-border text-xs text-content-secondary">
      <div>
        <span>
          Trang {page}/{Math.max(1, totalPages)} · {totalItems} bản ghi
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-surface-border bg-surface-elevated px-2.5 py-1 text-xs text-content-primary focus:outline-none"
        >
          <option value={10}>10 dòng</option>
          <option value={20}>20 dòng</option>
          <option value={50}>50 dòng</option>
        </select>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-1 rounded-md border border-surface-border bg-surface-elevated text-content-primary hover:bg-surface-hover disabled:opacity-30 transition-colors"
        >
          Trước
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 rounded-md border border-surface-border bg-surface-elevated text-content-primary hover:bg-surface-hover disabled:opacity-30 transition-colors"
        >
          Sau
        </button>
      </div>
    </div>
  );
};

export default LinkedInPagination;
