import React from "react";
import { FiSearch } from "react-icons/fi";
import type { BlogState } from "../../../../types/Blog";

export interface CategoryItem {
  id: string;
  name: string;
}

interface BlogTableToolbarProps {
  state?: BlogState;
  onSelectState: (state?: BlogState) => void;
  category: string;
  onSelectCategory: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  categories: CategoryItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalItems?: number;
}

const STATE_FILTERS: Array<{ value: BlogState | undefined; label: string }> = [
  { value: undefined, label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
];

// Render filter bar with segmented status pills, category selector, counter, and search box.
export const BlogTableToolbar: React.FC<BlogTableToolbarProps> = ({
  state,
  onSelectState,
  category,
  onSelectCategory,
  categories,
  searchTerm,
  onSearchChange,
  totalItems = 0,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface-card p-3.5 rounded-xl border border-surface-border">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-surface-elevated p-1 border border-surface-border">
          {STATE_FILTERS.map((item) => {
            const isActive = state === item.value;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelectState(item.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-surface-card text-content-primary shadow-xs border border-surface-border"
                    : "text-content-secondary hover:text-content-primary"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <select
          id="cat-filter"
          value={category}
          onChange={onSelectCategory}
          className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
        <span className="text-xs text-content-muted whitespace-nowrap">
          {totalItems} bài
        </span>

        <div className="relative flex-1 lg:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tiêu đề hoặc slug"
            className="w-full rounded-lg border border-surface-border bg-surface-elevated pl-8 pr-3 py-1.5 text-xs text-content-primary placeholder-content-muted focus:outline-none focus:ring-1 focus:ring-primary-green"
          />
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-xs pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default BlogTableToolbar;
