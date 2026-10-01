import React, { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import type { SEO } from "../../../types/Blog";
import { BsStars } from "react-icons/bs";

interface BlogSeoCollapseProps {
  seo: SEO;
  onUpdateSeo: <K extends keyof SEO>(field: K, value: SEO[K]) => void;
  onGenerateSeo: () => void;
  generating: boolean;
  canGenerate: boolean;
}

// Render collapsible SEO configuration fields with an interactive toggle switch.
export const BlogSeoCollapse: React.FC<BlogSeoCollapseProps> = ({
  seo,
  onUpdateSeo,
  onGenerateSeo,
  generating,
  canGenerate,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle open and close state of the SEO section.
  const handleToggle = () => setIsOpen((prev) => !prev);

  return (
    <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden transition-all">
      <div
        onClick={handleToggle}
        className="p-6 flex items-center justify-between cursor-pointer select-none hover:bg-surface-elevated/40 transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-content-primary text-base">Cấu hình SEO</h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-elevated text-content-muted border border-surface-border">
              Không bắt buộc
            </span>
          </div>
          <p className="text-xs text-content-muted">
            Tối ưu thẻ tìm kiếm, tiêu đề và mô tả bài viết trên công cụ tìm kiếm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            aria-label={isOpen ? "Ẩn cấu hình SEO" : "Hiện cấu hình SEO"}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-green focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card ${
              isOpen ? "bg-primary-green" : "bg-surface-elevated border border-surface-border"
            }`}
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                isOpen ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <div className="text-content-muted text-sm">
            {isOpen ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-surface-border/60">
          <div className="flex flex-wrap items-center gap-3 my-3">
            <button type="button" disabled={generating || !canGenerate} onClick={onGenerateSeo} className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              <BsStars aria-hidden="true" />{generating ? "Đang tạo SEO..." : "Tạo SEO bằng AI"}
            </button>
            <p role="status" className="text-xs text-content-muted">{generating ? "Đang tạo mô tả và từ khóa; nội dung bài viết được giữ nguyên." : canGenerate ? "AI tạo mô tả và từ khóa. Bạn có thể chỉnh sửa trước khi lưu." : "Nhập tiêu đề và nội dung bài viết trước khi tạo SEO."}</p>
          </div>
          <fieldset disabled={generating} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Tiêu đề SEO
              </label>
              <input
                type="text"
                value={seo.title}
                onChange={(e) => onUpdateSeo("title", e.target.value)}
                placeholder="Nhập tiêu đề SEO..."
                className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Mô tả SEO
              </label>
              <textarea
                rows={3}
                value={seo.description}
                onChange={(e) => onUpdateSeo("description", e.target.value)}
                placeholder="Nhập mô tả tóm tắt..."
                className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition resize-y"
              />
            </div>

            <p className="md:col-span-2 rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-xs text-content-muted">URL SEO được hệ thống tạo từ đường dẫn bài viết khi lưu.</p>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Từ khóa SEO (cách nhau bởi dấu phẩy)
              </label>
              <input
                type="text"
                value={seo.keywords.join(", ")}
                onChange={(e) =>
                  onUpdateSeo(
                    "keywords",
                    e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="keyword 1, keyword 2..."
                className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Tác giả
              </label>
              <input
                type="text"
                value={seo.author}
                onChange={(e) => onUpdateSeo("author", e.target.value)}
                placeholder="VietQuant"
                className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
              />
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
};

export default BlogSeoCollapse;
