import type { ChangeEvent, Dispatch, SetStateAction } from "react";

import InputField from "../../../shared/input/InputField";
import InputUploadBanner from "../../../shared/input/InputUploadBanner";
import type { IBlogData } from "../../../types/Blog";
import { useQuery } from "@tanstack/react-query";
import { listCategories } from "../../../services/category/handleCategory";

interface BlogBasicInfoFormProps {
  blogData: IBlogData;
  bannerImage: File | null;
  setBannerImage: Dispatch<SetStateAction<File | null>>;
  onFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

// Render basic blog metadata inputs and banner image upload.
const BlogBasicInfoForm = ({
  blogData,
  bannerImage,
  setBannerImage,
  onFieldChange,
}: BlogBasicInfoFormProps) => {
  const categories = useQuery({
    queryKey: ["categories", { page: 1, pageSize: 100 }],
    queryFn: () => listCategories(),
  });

  return (
    <div className="py-6 space-y-4">
      <div className="flex justify-between items-center gap-5">
        <InputField
          label="Mã bài viết"
          id="id"
          name="id"
          value={blogData.id ?? ""}
          readOnly
        />
        <InputField
          label="Cập nhật lần cuối"
          id="modified_at"
          name="modified_at"
          value={blogData.modified_at ?? ""}
          readOnly
        />
      </div>
      <InputUploadBanner
        fileImage={bannerImage}
        bannerUrl={blogData.banner_url}
        setBannerImage={setBannerImage}
      />
      <div className="flex justify-between items-center gap-5">
        <InputField
          label="Thẻ tag"
          id="tag"
          name="tag"
          value={blogData.tag}
          handleChange={onFieldChange}
          placeholder="Nhập thẻ tag..."
        />
        <div className="flex flex-1 flex-col">
          <label htmlFor="category" className="font-medium text-primary-white">Danh mục</label>
          <input
            list="blog-update-categories"
            id="category"
            name="category"
            value={blogData.category}
            onChange={onFieldChange}
            placeholder="Chọn hoặc nhập danh mục mới..."
            className="mt-1 rounded-md border border-gray-300 bg-primary-black-light p-2 text-primary-white"
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
