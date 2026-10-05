import type { ChangeEvent, Dispatch, SetStateAction } from "react";

import InputField from "../../../shared/input/InputField";
import type { IBlogData } from "../../../types/Blog";
import { useQuery } from "@tanstack/react-query";
import { listCategories } from "../../../services/category/handleCategory";

import { formatCmsDate } from "../../../utils/date";
import { BlogBannerPicker } from "../../../shared/media/BlogBannerPicker";

interface BlogBasicInfoFormProps {
  blogData: IBlogData;
  bannerImage: File | null;
  setBannerImage: Dispatch<SetStateAction<File | null>>;
  onFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onBannerUse: (objectKey: string) => void;
  blogContent: string;
  bannerBusy: boolean;
  disabled: boolean;
  onBannerBusyChange: (busy: boolean) => void;
}

// Render basic blog metadata inputs and banner image upload.
const BlogBasicInfoForm = ({
  blogData,
  bannerImage,
  setBannerImage,
  onFieldChange,
  onBannerUse,
  blogContent,
  bannerBusy,
  disabled,
  onBannerBusyChange,
}: BlogBasicInfoFormProps) => {
  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  return (
    <div className="py-6 space-y-4">
      {blogData.modified_at && (
        <div className="flex items-center justify-end text-xs text-content-muted">
          <span>Cập nhật lần cuối: <strong className="text-content-secondary font-medium">{formatCmsDate(blogData.modified_at)}</strong></span>
        </div>
      )}
      <BlogBannerPicker file={bannerImage} objectKey={blogData.banner_url} context={`${blogData.title}\n${blogContent}`}
        disabled={disabled || bannerBusy} onBusyChange={onBannerBusyChange}
        onFileChange={(file) => { onBannerUse(""); setBannerImage(file); }} onUse={onBannerUse} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <InputField
          label="Thẻ tag"
          id="tag"
          name="tag"
          value={blogData.tag}
          handleChange={onFieldChange}
          placeholder="Nhập thẻ tag..."
        />
        <div className="flex flex-1 flex-col">
          <label htmlFor="category" className="text-xs font-medium text-content-secondary mb-1.5">Danh mục</label>
          <input
            list="blog-update-categories"
            id="category"
            name="category"
            value={blogData.category}
            onChange={onFieldChange}
            placeholder="Chọn hoặc nhập danh mục mới..."
            className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
          />
          <datalist id="blog-update-categories">
            {categories.data?.items.map((category) => <option key={category.id} value={category.name} />)}
          </datalist>
        </div>
      </div>
      <InputField
        label="Tiêu đề"
        id="title"
        name="title"
        value={blogData.title}
        handleChange={onFieldChange}
        placeholder="Nhập tiêu đề bài viết..."
      />
    </div>
  );
};

export default BlogBasicInfoForm;
