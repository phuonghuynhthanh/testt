import type { ChangeEvent, Dispatch, SetStateAction } from "react";

import InputField from "../../../shared/input/InputField";
import InputUploadBanner from "../../../shared/input/InputUploadBanner";
import SelectField from "../../../shared/select/SelectField";
import { categories } from "../../../services/blog/handleBlog";
import type { IBlogData } from "../../../types/Blog";

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
  return (
    <div className="py-6 space-y-4">
      <div className="flex justify-between items-center gap-5">
        <InputField
          label="Mã bài viết"
          id="id"
          name="id"
          value={blogData.id}
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
        <SelectField
          label="Danh mục"
          id="category"
          name="category"
          value={blogData.category}
          options={categories.filter((cat) => cat.value !== "ALL")}
          onChange={onFieldChange}
        />
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
