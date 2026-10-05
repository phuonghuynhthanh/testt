import { useState } from "react";
import { Sparkle, CircleNotch } from "@phosphor-icons/react";
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

  const handleFieldChange = (field: keyof IBlogSEO, value: unknown) => {
    const updatedData = { ...seoData, [field]: value };
    setSeoData(updatedData);
    onSeoDataChange(updatedData);
  };

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

  const handleDeleteKeyword = (index: number) => {
    const updatedKeywords = seoData.seoKeywords.filter((_, i) => i !== index);
    handleFieldChange("seoKeywords", updatedKeywords);
  };

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
    <div className="space-y-3.5">
      <h2 className="text-lg font-semibold text-content-primary mb-2">Trình chỉnh sửa SEO</h2>

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

      <div>
        <button
          type="button"
          disabled={isGeneratingSeo}
          title={isGeneratingSeo ? "Đang tạo SEO" : "Tạo nội dung SEO bằng AI"}
          aria-label={isGeneratingSeo ? "Đang tạo SEO" : "Tạo nội dung SEO bằng AI"}
          className="btn btn-ai"
          onClick={handleGenerateSEO}
        >
          {isGeneratingSeo ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : (
            <Sparkle size={14} weight="light" className="text-purple-300" />
          )}
          <span>{isGeneratingSeo ? "Đang tạo SEO..." : "Tạo nội dung SEO bằng AI"}</span>
        </button>
      </div>

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
        <label className="label mb-1.5">
          Mô tả SEO
        </label>
        <textarea
          value={seoData.seoDescription}
          onChange={(e) => handleFieldChange("seoDescription", e.target.value)}
          className="inp w-full h-24 resize-none"
          placeholder="Nhập mô tả SEO..."
        />
      </div>
    </div>
  );
};

export default SeoEditor;
