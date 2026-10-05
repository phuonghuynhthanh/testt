import React from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  itemUnit?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  onPageChange: (newPage: number) => void;
  /** "dense" matches the blog list footer; "default" matches the shared pager used elsewhere. */
  variant?: "default" | "dense";
}

// Build the visible page numbers, collapsing far pages into ellipses.
const buildPageItems = (page: number, totalPages: number): Array<number | "…"> => {
  const items: Array<number | "…"> = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) items.push(p);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return items;
};

// Render the range summary, optional page-size select and numbered pager.
export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  itemUnit,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
  onPageChange,
  variant = "default",
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const dense = variant === "dense";

  const start = totalItems !== undefined ? (totalItems > 0 ? (page - 1) * pageSize + 1 : 0) : undefined;
  const end = totalItems !== undefined ? Math.min(page * pageSize, totalItems) : undefined;

  const pageButtonClass = (active: boolean) =>
    dense
      ? "pg mono"
      : `grid h-8 min-w-8 place-items-center rounded-md border px-2 text-xs font-medium font-mono transition-colors disabled:pointer-events-none disabled:opacity-30 ${
          active
            ? "border-[#475569] bg-surface-elevated text-content-primary"
            : "border-transparent text-content-secondary hover:bg-surface-elevated"
        }`;

  const summary =
    totalItems !== undefined ? (
      dense ? (
        <span>
          Hiển thị <span className="mono">{start}–{end}</span> trên <span className="mono">{totalItems}</span>
        </span>
      ) : (
        <p className="text-xs text-content-muted">
          Hiển thị {start}-{end} trên {totalItems} {itemUnit}
        </p>
      )
    ) : (
      <span>
        Trang <span className="mono">{page}</span> trên <span className="mono">{safeTotalPages}</span>
      </span>
    );

  const sizeSelect = onPageSizeChange && (
    dense ? (
      <label className="flex items-center gap-2">
        Mỗi trang
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Số dòng mỗi trang"
          className="sel"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>
    ) : (
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        aria-label="Số dòng mỗi trang"
        className="inp sm !w-auto"
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>{size} / trang</option>
        ))}
      </select>
    )
  );

  const pager = (
    <nav className={dense ? "pager" : "flex items-center gap-1"} aria-label="Phân trang">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        title="Trang trước"
        aria-label="Trang trước"
        className={pageButtonClass(false)}
      >
        <CaretLeft size={14} weight="light" />
      </button>
      {buildPageItems(page, safeTotalPages).map((item, index) =>
        item === "…" ? (
          <span key={`gap-${index}`} className="px-1 text-xs text-content-muted" aria-hidden="true">…</span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={`Trang ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={pageButtonClass(item === page)}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= safeTotalPages}
        onClick={() => onPageChange(page + 1)}
        title="Trang sau"
        aria-label="Trang sau"
        className={pageButtonClass(false)}
      >
        <CaretRight size={14} weight="light" />
      </button>
    </nav>
  );

  if (dense) {
    return (
      <div className="foot">
        <div className="foot-l">
          {summary}
          {sizeSelect}
        </div>
        {pager}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border px-4 py-3">
      {summary}
      <div className="flex items-center gap-3">
        {sizeSelect}
        {pager}
      </div>
    </div>
  );
};

export default Pagination;
