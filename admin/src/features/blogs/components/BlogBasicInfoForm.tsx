import type { ChangeEvent, Dispatch, SetStateAction } from "react";

import InputField from "../../../shared/input/InputField";
import InputUploadBanner from "../../../shared/input/InputUploadBanner";
import SelectField from "../../../shared/select/SelectField";
import { categories } from "../../../services/blog/handleBlog";
import type { IBlogData } from "../../../types/Blog";
import type {
  ImageAspectRatio,
  ImageQuality,
  ImageSize,
} from "../../../services/openrouter/handleImageGenerate";
import BlogBannerGenerator from "./BlogBannerGenerator";

interface BlogBasicInfoFormProps {
  blogData: IBlogData;
  bannerImage: File | null;
  imagePrompt: string;
  imageAspectRatio: ImageAspectRatio;
  imageSize: ImageSize;
  imageQuality: ImageQuality;
  isGeneratingBanner: boolean;
  setBannerImage: Dispatch<SetStateAction<File | null>>;
  onFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onPromptChange: (value: string) => void;
  onAspectRatioChange: (value: ImageAspectRatio) => void;
  onSizeChange: (value: ImageSize) => void;
  onQualityChange: (value: ImageQuality) => void;
  onGenerateBanner: () => void;
}

// Render editable blog metadata and banner controls for the update form.
const BlogBasicInfoForm = ({
  blogData,
  bannerImage,
  imagePrompt,
  imageAspectRatio,
  imageSize,
  imageQuality,
  isGeneratingBanner,
  setBannerImage,
  onFieldChange,
  onPromptChange,
  onAspectRatioChange,
  onSizeChange,
  onQualityChange,
  onGenerateBanner,
}: BlogBasicInfoFormProps) => {
  return (
    <div className="py-6 space-y-4">
      <div className="flex justify-between items-center gap-5">
        <InputField
          label="Blog Id"
          id="id"
          name="id"
          value={blogData.id}
          readOnly
        />
        <InputField
          label="Last Updated"
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
      <BlogBannerGenerator
        imagePrompt={imagePrompt}
        imageAspectRatio={imageAspectRatio}
        imageSize={imageSize}
        imageQuality={imageQuality}
        isGeneratingBanner={isGeneratingBanner}
        onPromptChange={onPromptChange}
        onAspectRatioChange={onAspectRatioChange}
        onSizeChange={onSizeChange}
        onQualityChange={onQualityChange}
        onGenerateBanner={onGenerateBanner}
      />
      <div className="flex justify-between items-center gap-5">
        <InputField
          label="Tag"
          id="tag"
          name="tag"
          value={blogData.tag}
          handleChange={onFieldChange}
          placeholder="Enter blog tag"
        />
        <SelectField
          label="Category"
          id="category"
          name="category"
          value={blogData.category}
          options={categories.filter((cat) => cat.value !== "ALL")}
          onChange={onFieldChange}
        />
      </div>
      <InputField
        label="Title"
        id="title"
        name="title"
        value={blogData.title}
        handleChange={onFieldChange}
        placeholder="Enter blog title"
      />
    </div>
  );
};

export default BlogBasicInfoForm;
