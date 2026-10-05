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
    <div className="py-2 space-y-3.5">
      {blogData.modified_at && (
        <div className="flex items-center justify-end text-xs text-content-muted">
          <span>
            Cập nhật lần cuối: <strong className="mono text-content-secondary font-medium">{formatCmsDate(blogData.modified_at)}</strong>
          </span>
        </div>
      )}
      <BlogBannerPicker
        file={bannerImage}
        objectKey={blogData.banner_url}
        context={`${blogData.title}\n${blogContent}`}
        disabled={disabled || bannerBusy}
        onBusyChange={onBannerBusyChange}
        onFileChange={(file) => { onBannerUse(""); setBannerImage(file); }}
        onUse={onBannerUse}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputField
          label="Thẻ tag"
          id="tag"
          name="tag"
          value={blogData.tag}
          handleChange={onFieldChange}
          placeholder="Nhập thẻ tag..."
        />
        <div className="flex flex-1 flex-col">
          <label htmlFor="category" className="label mb-1.5">
            Danh mục
          </label>
          <input
            list="blog-update-categories"
            id="category"
            name="category"
            value={blogData.category}
            onChange={onFieldChange}
            placeholder="Chọn hoặc nhập danh mục mới..."
            className="inp w-full"
          />
          <datalist id="blog-update-categories">
            {categories.data?.items.map((category) => (
              <option key={category.id} value={category.name} />
            ))}
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
