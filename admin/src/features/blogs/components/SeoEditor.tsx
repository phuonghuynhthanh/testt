import { useEffect, useState } from "react";

import { BsStars } from "react-icons/bs";
import { toast } from "react-toastify";
import InputSeoKeyword from "../../../shared/input/InputSeoKeyword";
import InputUploadBanner from "../../../shared/input/InputUploadBanner";
import InputField from "../../../shared/input/InputField";
import type { IDataSeoGenerate } from "../../../types/OpenAi";
import {
  generateBannerWithOpenRouterOptions,
  type ImageAspectRatio,
  type ImageQuality,
  type ImageSize,
} from "../../../services/openrouter/handleImageGenerate";
import { buildBlogBannerPrompt } from "../../../utils/blogImagePrompt";

interface IBlogSEO {
  tag: string;
  title: string;
  bannerUrl: string;
  seoKeywords: string[];
  seoTitle: string;
  seoDescription: string;
}

type SeoEditorProps = {
  onSeoDataChange: (data: IBlogSEO) => void; // Prop to pass the entire SEO data object
  blogTitle: string;
  bannerImage: File | null;
  setBannerImage: (file: File) => void;
};

const SeoEditor = ({
  onSeoDataChange,
  blogTitle,
  bannerImage,
  setBannerImage,
}: SeoEditorProps) => {
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [seoData, setSeoData] = useState<IBlogSEO>({
    tag: "", // Set default tag value to an empty string
    title: blogTitle,
    bannerUrl: "",
    seoKeywords: [],
    seoTitle: blogTitle,
    seoDescription: "",
  });

  const handleFieldChange = (field: keyof IBlogSEO, value: unknown) => {
    const updatedData = { ...seoData, [field]: value };
    setSeoData(updatedData);
    onSeoDataChange(updatedData); // Update parent with the modified seoData
  };

  const handleAddKeyword = () => {
    const newKeywords = keywordInput
      .split(",")
      .map((kw) => kw.trim())
      .filter((kw) => kw !== "");
    setSeoData((prevData) => ({
      ...prevData,
      seoKeywords: [...prevData.seoKeywords, ...newKeywords],
    }));
    setKeywordInput(""); // Clear the input field after adding
  };

  const handleDeleteKeyword = (index: number) => {
    const updatedKeywords = seoData.seoKeywords.filter((_, i) => i !== index);
    handleFieldChange("seoKeywords", updatedKeywords);
  };
  const [isOpenGenerate, setIsOpenGenerate] = useState<boolean>(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState<boolean>(false);
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [imageAspectRatio, setImageAspectRatio] =
    useState<ImageAspectRatio>("16:9");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [imageQuality, setImageQuality] = useState<ImageQuality>("low");
  const [dataSeoGenerate] = useState<IDataSeoGenerate>({
    listSeoKey: [],
    descript: "",
  });
  const handleGenerateSEO = () => {
    setIsOpenGenerate(true);
  };

  const handleGenerateBanner = async () => {
    const prompt = buildBlogBannerPrompt({
      title: seoData.title || blogTitle,
      tag: seoData.tag,
      seoKeywords: seoData.seoKeywords,
      seoDescription: seoData.seoDescription,
      aspectRatio: imageAspectRatio,
      customPrompt: imagePrompt,
    });

    const toastId = toast.loading("Generating banner with OpenRouter...");
    setIsGeneratingBanner(true);
    try {
      const file = await generateBannerWithOpenRouterOptions(prompt, {
        aspectRatio: imageAspectRatio,
        imageSize,
        quality: imageQuality,
      });
      setBannerImage(file);
      toast.update(toastId, {
        render: "Generated banner is ready.",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (error) {
      toast.update(toastId, {
        render: `${error}`,
        type: "error",
        isLoading: false,
        autoClose: 3500,
      });
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const areArraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  useEffect(() => {
    if (!dataSeoGenerate.listSeoKey?.length) return;

    const uniqueKeywords = Array.from(
      new Set([...seoData.seoKeywords, ...dataSeoGenerate.listSeoKey]),
    );

    const newDescription = dataSeoGenerate.descript ?? "";

    // nếu giống thì không setState => tránh render thừa và vòng lặp
    if (
      areArraysEqual(uniqueKeywords, seoData.seoKeywords) &&
      newDescription === seoData.seoDescription
    ) {
      return;
    }

    setSeoData((prev) => ({
      ...prev,
      seoKeywords: uniqueKeywords,
      seoDescription: newDescription,
    }));
  }, [dataSeoGenerate, seoData.seoKeywords, seoData.seoDescription]);

  return (
    <div className="px-5 space-y-4">
      <h2 className="text-2xl font-bold my-4 text-primary-white">SEO Editor</h2>
      {/* Tag Input */}
      <InputField
        label="Tag"
        id="tag"
        name="tag"
        value={seoData.tag}
        handleChange={(e) => handleFieldChange("tag", e.target.value)}
        placeholder="Enter blog tag"
      />

      {/* Title Input */}
      <InputField
        label="Title"
        id="title"
        name="title"
        value={seoData.title}
        handleChange={(e) => handleFieldChange("title", e.target.value)}
        placeholder="Enter your title"
      />

      {/* Banner Upload Input */}

      <InputUploadBanner
        fileImage={bannerImage}
        setBannerImage={setBannerImage}
      />
      <div className="space-y-2">
        <InputField
          label="Banner Prompt (Optional)"
          id="bannerPrompt"
          name="bannerPrompt"
          value={imagePrompt}
          handleChange={(e) => setImagePrompt(e.target.value)}
          placeholder="Example: Symbolic editorial image matching the title, no text, no faces"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block font-medium text-primary-white mb-1">
              Aspect Ratio
            </label>
            <select
              className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full"
              value={imageAspectRatio}
              onChange={(e) =>
                setImageAspectRatio(e.target.value as ImageAspectRatio)
              }
            >
              {["16:9", "4:3", "3:2", "1:1", "9:16", "21:9"].map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-primary-white mb-1">
              Image Size
            </label>
            <select
              className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full"
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value as ImageSize)}
            >
              {["1K", "2K", "4K"].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-primary-white mb-1">
              Quality
            </label>
            <select
              className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full"
              value={imageQuality}
              onChange={(e) => setImageQuality(e.target.value as ImageQuality)}
            >
              {["low", "medium", "high"].map((quality) => (
                <option key={quality} value={quality}>
                  {quality}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-2 text-sm text-white font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          onClick={handleGenerateBanner}
          disabled={isGeneratingBanner}
        >
          {isGeneratingBanner
            ? "Generating banner..."
            : "Generate Banner with OpenRouter"}
        </button>
      </div>

      <button
        className="px-2 py-2 text-lg text-white font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center gap-2"
        onClick={handleGenerateSEO}
      >
        Generate SEO Content with AI <BsStars className="inline" />
      </button>
      {isOpenGenerate && (
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-md">
          <p className="text-yellow-800">
            SEO Generation feature not implemented yet
          </p>
          <button
            onClick={() => setIsOpenGenerate(false)}
            className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Close
          </button>
        </div>
      )}

      {/* SEO Keywords Input */}
      <InputSeoKeyword
        keywords={seoData.seoKeywords}
        keywordInput={keywordInput}
        setKeywordInput={setKeywordInput}
        handleAddKeyword={handleAddKeyword}
        handleDeleteKeyword={handleDeleteKeyword}
      />

      {/* SEO Title Input */}
      <InputField
        label="SEO Title"
        id="seoTitle"
        name="seoTitle"
        value={seoData.seoTitle}
        handleChange={(e) => handleFieldChange("seoTitle", e.target.value)}
        placeholder="Enter SEO title"
      />

      {/* SEO Description Input */}
      <div>
        <label className="block font-medium text-primary-white mb-1">
          SEO Description
        </label>
        <textarea
          value={seoData.seoDescription}
          onChange={(e) => handleFieldChange("seoDescription", e.target.value)}
          className="border border-gray-300 bg-primary-black-medium text-primary-white rounded-md p-2 w-full h-24 resize-none"
          placeholder="Enter SEO description"
        />
      </div>
    </div>
  );
};

export default SeoEditor;
