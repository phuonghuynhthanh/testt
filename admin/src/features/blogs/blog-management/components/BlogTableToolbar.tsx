import React from "react";
import { Check, DownloadSimple, List, MagnifyingGlass, Rows, Trash, XCircle } from "@phosphor-icons/react";
import type { BlogSortKey } from "../../../../services/blog/handleBlog";
import type { BlogState } from "../../../../types/Blog";

export interface CategoryItem {
  id: string;
  name: string;
}

export type Density = "compact" | "cozy";

interface BlogTableToolbarProps {
  state?: BlogState;
  onSelectState: (state?: BlogState) => void;
  counts?: Record<BlogState | "ALL", number>;
  category: string;
  onSelectCategory: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  categories: CategoryItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  sortValue: string;
  onSortChange: (sort: BlogSortKey, dir: "asc" | "desc") => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  onExport: () => void;
  isExporting: boolean;
  selectedCount: number;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

const STATE_FILTERS: Array<{ value: BlogState | undefined; label: string }> = [
  { value: undefined, label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
];

const SORT_OPTIONS: Array<[string, string]> = [
  ["modified:desc", "Mới cập nhật"],
  ["modified:asc", "Cũ nhất"],
  ["title:asc", "Tiêu đề A–Z"],
  ["state:asc", "Trạng thái"],
];

// Render the panel toolbar: status tabs, search, filters, density, export and the bulk action overlay.
export const BlogTableToolbar: React.FC<BlogTableToolbarProps> = ({
  state,
  onSelectState,
  counts,
  category,
  onSelectCategory,
  categories,
  searchTerm,
  onSearchChange,
  searchRef,
  sortValue,
  onSortChange,
  density,
  onDensityChange,
  onExport,
  isExporting,
  selectedCount,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  onClearSelection,
}) => {
  const hasSelection = selectedCount > 0;

  return (
    <div className="toolbar">
      <div className="tb-inner" {...(hasSelection ? ({ inert: "" } as object) : {})}>
        <div className="filters" role="group" aria-label="Lọc theo trạng thái">
          {STATE_FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectState(item.value)}
              aria-pressed={state === item.value}
            >
              {item.label}
              <span className="n mono">{counts ? counts[item.value ?? "ALL"] : "–"}</span>
            </button>
          ))}
        </div>

        <div className="tb-right">
          <label className="search">
            <span className="sr-only">Tìm bài viết</span>
            <MagnifyingGlass size={16} weight="light" />
            <input
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm tiêu đề, slug, tag"
              autoComplete="off"
              className="field"
            />
            <kbd aria-hidden="true">/</kbd>
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

          <select
            value={sortValue}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":");
              onSortChange(key as BlogSortKey, dir as "asc" | "desc");
            }}
            aria-label="Sắp xếp theo"
            className="sel only-m"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="seg" role="group" aria-label="Mật độ hàng">
            <button type="button" aria-pressed={density === "compact"} onClick={() => onDensityChange("compact")}>
              <List size={14} weight="light" />
              Gọn
            </button>
            <button type="button" aria-pressed={density === "cozy"} onClick={() => onDensityChange("cozy")}>
              <Rows size={14} weight="light" />
              Thoáng
            </button>
          </div>

          <button type="button" className="btn btn-ghost" onClick={onExport} disabled={isExporting}>
            <DownloadSimple size={16} weight="light" />
            {isExporting ? "Đang xuất..." : "Xuất CSV"}
          </button>
        </div>
      </div>

      {hasSelection && (
        <div className="bulk" role="region" aria-label="Thao tác hàng loạt">
          <span className="cnt">
            <span className="mono">{selectedCount}</span> đã chọn
          </span>
          <button type="button" className="btn btn-ghost" onClick={onBulkApprove}>
            <Check size={16} weight="light" />
            Duyệt
          </button>
          <button type="button" className="btn btn-ghost" onClick={onBulkReject}>
            <XCircle size={16} weight="light" />
            Từ chối
          </button>
          <button type="button" className="btn btn-danger" onClick={onBulkDelete}>
            <Trash size={16} weight="light" />
            Xóa
          </button>
          <span className="sp" />
          <button type="button" className="btn btn-ghost" onClick={onClearSelection}>
            Bỏ chọn
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogTableToolbar;
