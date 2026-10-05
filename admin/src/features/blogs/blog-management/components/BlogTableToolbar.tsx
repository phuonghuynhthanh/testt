import React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
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

// Render the panel toolbar: status filter tabs on the left, search and category on the right.
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
    <div className="toolbar">
      <div className="tb-inner">
        <div className="filters" role="group" aria-label="Lọc theo trạng thái">
          {STATE_FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectState(item.value)}
              aria-pressed={state === item.value}
            >
              {item.label}
              {item.value === undefined && <span className="n mono">{totalItems}</span>}
            </button>
          ))}
        </div>

        <div className="tb-right">
          <label className="search">
            <span className="sr-only">Tìm bài viết</span>
            <MagnifyingGlass size={16} weight="light" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm tiêu đề, slug, tag"
              autoComplete="off"
              className="field"
            />
          </label>

          <select
            id="cat-filter"
            value={category}
            onChange={onSelectCategory}
            aria-label="Lọc theo danh mục"
            className="sel"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default BlogTableToolbar;
