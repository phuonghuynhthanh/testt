import { useState } from "react";
import { BsStars } from "react-icons/bs";
import { toast } from "react-toastify";

import InputSeoKeyword from "../../../shared/input/InputSeoKeyword";
import InputUploadBanner from "../../../shared/input/InputUploadBanner";
import InputField from "../../../shared/input/InputField";
import { getSeoData } from "../../../services/openai/handleSeoGenerate";

export interface IBlogSEO {
  tag: string;
  title: string;
  bannerUrl: string;
  seoKeywords: string[];
  seoTitle: string;
  seoDescription: string;
}

interface SeoEditorProps {
  onSeoDataChange: (data: IBlogSEO) => void;
  blogTitle: string;
  blogContent?: string;
  bannerImage: File | null;
  setBannerImage: (file: File) => void;
}

// Render SEO metadata editor with AI-assisted SEO keyword and description generation.
const SeoEditor = ({
  onSeoDataChange,
  blogTitle,
  blogContent = "",
  bannerImage,
  setBannerImage,
}: SeoEditorProps) => {
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [isGeneratingSeo, setIsGeneratingSeo] = useState<boolean>(false);
  const [seoData, setSeoData] = useState<IBlogSEO>({
    tag: "",
    title: blogTitle,
    bannerUrl: "",
    seoKeywords: [],
    seoTitle: blogTitle,
    seoDescription: "",
  });

  // Update a single field in the SEO state and notify the parent component.
  const handleFieldChange = (field: keyof IBlogSEO, value: unknown) => {
    const updatedData = { ...seoData, [field]: value };
    setSeoData(updatedData);
    onSeoDataChange(updatedData);
  };

  // Parse comma-separated keywords and append them to the existing list.
  const handleAddKeyword = () => {
    const newKeywords = keywordInput
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw !== "");
    const updatedKeywords = [...new Set([...seoData.seoKeywords, ...newKeywords])];
    const updatedData = { ...seoData, seoKeywords: updatedKeywords };
    setSeoData(updatedData);
    onSeoDataChange(updatedData);
    setKeywordInput("");
  };

  // Remove a keyword from the list by its index.
  const handleDeleteKeyword = (index: number) => {
    const updatedKeywords = seoData.seoKeywords.filter((_, i) => i !== index);
    handleFieldChange("seoKeywords", updatedKeywords);
  };

  // Generate SEO keywords and description using the backend OpenAI API.
  const handleGenerateSEO = async () => {
    const targetTitle = seoData.title || blogTitle;
    if (!targetTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề trước khi tạo nội dung SEO.");
      return;
    }

    const toastId = toast.loading("Đang tạo nội dung SEO bằng AI...");
    setIsGeneratingSeo(true);
    try {
      const generated = await getSeoData(targetTitle, blogContent);
      const uniqueKeywords = [
        ...new Set([...seoData.seoKeywords, ...generated.listSeoKey]),
      ];
      const updatedData: IBlogSEO = {
        ...seoData,
        seoKeywords: uniqueKeywords,
        seoDescription: generated.descript || seoData.seoDescription,
      };
      setSeoData(updatedData);
      onSeoDataChange(updatedData);
      toast.update(toastId, {
        render: "Đã tạo nội dung SEO thành công!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch {
      toast.update(toastId, {
        render: "Không thể tạo nội dung SEO. Vui lòng thử lại.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  return (
    <div className="px-5 space-y-4">
      <h2 className="text-2xl font-bold my-4 text-primary-white">Trình chỉnh sửa SEO</h2>

      <InputField
        label="Thẻ tag"
        id="tag"
        name="tag"
        value={seoData.tag}
        handleChange={(e) => handleFieldChange("tag", e.target.value)}
        placeholder="Nhập thẻ tag..."
      />

      <InputField
        label="Tiêu đề"
        id="title"
        name="title"
        value={seoData.title}
        handleChange={(e) => handleFieldChange("title", e.target.value)}
        placeholder="Nhập tiêu đề bài viết..."
      />

      <InputUploadBanner
        fileImage={bannerImage}
        setBannerImage={setBannerImage}
      />

      <button
        type="button"
        disabled={isGeneratingSeo}
        title={isGeneratingSeo ? "Đang tạo SEO" : "Tạo nội dung SEO bằng AI"}
        aria-label={isGeneratingSeo ? "Đang tạo SEO" : "Tạo nội dung SEO bằng AI"}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-xs font-semibold text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
        onClick={handleGenerateSEO}
      >
        <BsStars className={isGeneratingSeo ? "animate-pulse" : ""} />
        <span>{isGeneratingSeo ? "Đang tạo SEO..." : "Tạo nội dung SEO bằng AI"}</span>
      </button>

      <InputSeoKeyword
        keywords={seoData.seoKeywords}
        keywordInput={keywordInput}
        setKeywordInput={setKeywordInput}
        handleAddKeyword={handleAddKeyword}
        handleDeleteKeyword={handleDeleteKeyword}
      />

      <InputField
        label="Tiêu đề SEO"
        id="seoTitle"
        name="seoTitle"
        value={seoData.seoTitle}
        handleChange={(e) => handleFieldChange("seoTitle", e.target.value)}
        placeholder="Nhập tiêu đề SEO..."
      />

      <div>
        <label className="block font-medium text-primary-white mb-1">
          Mô tả SEO
        </label>
        <textarea
          value={seoData.seoDescription}
          onChange={(e) => handleFieldChange("seoDescription", e.target.value)}
          className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full h-24 resize-none"
          placeholder="Nhập mô tả SEO..."
        />
      </div>
    </div>
  );
};

export default SeoEditor;
