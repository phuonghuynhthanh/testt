import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  itemUnit?: string;
  onPageChange: (newPage: number) => void;
  className?: string;
}

// Render accessible pagination navigation with previous/next controls and page summary.
export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  itemUnit = "mục",
  onPageChange,
  className = "",
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const isFirstPage = page <= 1;
  const isLastPage = page >= safeTotalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-content-secondary ${className}`}
    >
      <div className="text-xs sm:text-sm text-content-muted">
        {totalItems !== undefined ? (
          <span>
            Tổng cộng <strong className="text-content-primary font-medium">{totalItems}</strong> {itemUnit} (Trang {page} / {safeTotalPages})
          </span>
        ) : (
          <span>
            Trang <strong className="text-content-primary font-medium">{page}</strong> trên {safeTotalPages}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isFirstPage}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-card hover:bg-surface-elevated text-content-secondary hover:text-content-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Trang trước"
        >
          <FiChevronLeft className="w-4 h-4" />
          <span>Trước</span>
        </button>

        <span className="px-3 py-1 text-xs font-medium rounded-md bg-surface-elevated border border-surface-border text-content-primary">
          {page}
        </span>

        <button
          type="button"
          disabled={isLastPage}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-card hover:bg-surface-elevated text-content-secondary hover:text-content-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Trang sau"
        >
          <span>Sau</span>
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
