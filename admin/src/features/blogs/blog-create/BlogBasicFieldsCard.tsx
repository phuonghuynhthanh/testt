import React from "react";
import type { Category } from "../../../types/Category";
import { SectionHeading } from "../../../shared/ui";
import { BlogBannerPicker } from "../../../shared/media/BlogBannerPicker";
import CategoryCombobox from "./CategoryCombobox";

interface BlogBasicFieldsCardProps {
  title: string;
  onUpdateTitle: (title: string) => void;
  category: string;
  onUpdateCategory: (category: string) => void;
  tag: string;
  onUpdateTag: (tag: string) => void;
  image: File | null;
  bannerUrl: string;
  onFileChange: (file: File | null) => void;
  onUseBanner: (objectKey: string) => void;
  bannerBusy: boolean;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
  categories: Category[];
  categoriesLoading: boolean;
  categoriesFailed: boolean;
  creatingCategory: boolean;
  onCreateCategory: (name: string) => void;
  onRetryCategories: () => void;
  articleContent: string;
}

export const BlogBasicFieldsCard: React.FC<BlogBasicFieldsCardProps> = ({
  title,
  onUpdateTitle,
  category,
  onUpdateCategory,
  tag,
  onUpdateTag,
  image,
  bannerUrl,
  onFileChange,
  onUseBanner,
  bannerBusy,
  onBusyChange,
  disabled,
  categories,
  categoriesLoading,
  categoriesFailed,
  creatingCategory,
  onCreateCategory,
  onRetryCategories,
  articleContent,
}) => {
  return (
    <>
      <div className="panel p-4 space-y-4">
        <SectionHeading title="Thông tin cơ bản" description="Tiêu đề, thể loại và định danh bài viết" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">
              Tiêu đề bài viết <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài viết..."
              className="inp w-full"
            />
          </div>

          <CategoryCombobox
            value={category}
            items={categories}
            loading={categoriesLoading}
            failed={categoriesFailed}
            creating={creatingCategory}
            onChange={onUpdateCategory}
            onCreate={onCreateCategory}
            onRetry={onRetryCategories}
          />

          <div>
            <label className="label">Thẻ Tag</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => onUpdateTag(e.target.value)}
              placeholder="Ví dụ: Tài chính, AI, Machine Learning..."
              className="inp w-full"
            />
          </div>

          <p className="hint rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 md:col-span-2">
            Đường dẫn sẽ được tạo tự động khi lưu bài.
          </p>
        </div>
      </div>

      <div className="panel p-4 space-y-4">
        <SectionHeading title="Ảnh bìa bài viết" description="Tải lên tệp ảnh (JPEG, PNG, WebP) - Tùy chọn" />
        <BlogBannerPicker
          file={image}
          objectKey={bannerUrl}
          context={`${title}\n${articleContent}`}
          disabled={disabled || bannerBusy}
          onBusyChange={onBusyChange}
          onFileChange={onFileChange}
          onUse={onUseBanner}
        />
      </div>
    </>
  );
};

export default BlogBasicFieldsCard;
