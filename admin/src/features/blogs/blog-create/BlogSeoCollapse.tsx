import React, { useState } from "react";
import { CaretDown, CaretUp, Sparkle } from "@phosphor-icons/react";
import type { SEO } from "../../../types/Blog";

interface BlogSeoCollapseProps {
  seo: SEO;
  onUpdateSeo: <K extends keyof SEO>(field: K, value: SEO[K]) => void;
  onGenerateSeo: () => void;
  generating: boolean;
  canGenerate: boolean;
}

export const BlogSeoCollapse: React.FC<BlogSeoCollapseProps> = ({
  seo,
  onUpdateSeo,
  onGenerateSeo,
  generating,
  canGenerate,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen((prev) => !prev);

  return (
    <div className="panel overflow-hidden">
      <div
        onClick={handleToggle}
        className="flex cursor-pointer select-none items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-elevated/40 sm:p-6"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Cấu hình SEO</h3>
            <span className="chip !text-[11px] text-content-muted">
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
            className="switch"
          />
          <div className="text-content-muted text-sm">
            {isOpen ? <CaretUp size={16} weight="light" /> : <CaretDown size={16} weight="light" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-surface-border/60 px-5 pb-6 pt-4 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={generating || !canGenerate}
              onClick={onGenerateSeo}
              className="btn btn-ai"
            >
              <Sparkle size={14} weight="light" />
              <span>{generating ? "Đang tạo SEO..." : "Tạo SEO bằng AI"}</span>
            </button>
            <p role="status" className="hint">
              {generating ? "Đang tạo mô tả và từ khóa; nội dung bài viết được giữ nguyên." : canGenerate ? "AI tạo mô tả và từ khóa. Bạn có thể chỉnh sửa trước khi lưu." : "Nhập tiêu đề và nội dung bài viết trước khi tạo SEO."}
            </p>
          </div>
          <fieldset disabled={generating} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">
                Tiêu đề SEO
              </label>
              <input
                type="text"
                value={seo.title}
                onChange={(e) => onUpdateSeo("title", e.target.value)}
                placeholder="Nhập tiêu đề SEO..."
                className="inp w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">
                Mô tả SEO <span className="hint ml-1 font-normal">{seo.description.length}/160</span>
              </label>
              <textarea
                rows={3}
                value={seo.description}
                onChange={(e) => onUpdateSeo("description", e.target.value)}
                placeholder="Nhập mô tả tóm tắt..."
                className="inp w-full"
              />
            </div>

            <p className="hint rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 md:col-span-2">
              URL SEO được hệ thống tạo từ đường dẫn bài viết khi lưu.
            </p>

            <div>
              <label className="label">
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
                className="inp w-full"
              />
            </div>

            <div>
              <label className="label">
                Tác giả
              </label>
              <input
                type="text"
                value={seo.author}
                onChange={(e) => onUpdateSeo("author", e.target.value)}
                placeholder="VietQuant"
                className="inp w-full"
              />
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
};

export default BlogSeoCollapse;
