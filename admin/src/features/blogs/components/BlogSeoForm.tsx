import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { BsStars } from "react-icons/bs";

import InputField from "../../../shared/input/InputField";
import InputSeoKeyword from "../../../shared/input/InputSeoKeyword";
import SeoGenerate from "../../../shared/SeoGenerate";
import type { IBlogData, IEditorData } from "../../../types/Blog";
import type { IDataSeoGenerate } from "../../../types/OpenAi";

interface BlogSeoFormProps {
  blogData: IBlogData;
  content: IEditorData;
  isOpenGenerate: boolean;
  keywordInput: string;
  onFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onGenerateSEO: () => void;
  onCloseGenerate: () => void;
  setDataSeoGenerate: Dispatch<SetStateAction<IDataSeoGenerate>>;
  setKeywordInput: (value: string) => void;
  onAddKeyword: () => void;
  onDeleteKeyword: (index: number) => void;
}

// Render SEO metadata inputs and AI SEO generation controls.
const BlogSeoForm = ({
  blogData,
  content,
  isOpenGenerate,
  keywordInput,
  onFieldChange,
  onGenerateSEO,
  onCloseGenerate,
  setDataSeoGenerate,
  setKeywordInput,
  onAddKeyword,
  onDeleteKeyword,
}: BlogSeoFormProps) => {
  return (
    <>
      <h4 className="text-xl">SEO</h4>
      <hr className="my-2" />
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-10">
          <InputField
            label="Published Time"
            id="published_time"
            name="published_time"
            value={blogData.seo.published_time ?? ""}
            readOnly
          />
          <InputField
            label="Modified Time"
            id="modified_time"
            name="modified_time"
            value={blogData.seo.modified_time ?? ""}
            readOnly
          />
        </div>
        <InputField
          label="SEO Title"
          id="seo.title"
          name="seo.title"
          value={blogData.seo.title}
          placeholder="Enter SEO title"
          handleChange={onFieldChange}
        />
        <button
          className="px-2 py-2 text-lg text-primary-white font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center gap-2"
          onClick={onGenerateSEO}
        >
          Generate SEO Content with AI <BsStars className="inline" />
        </button>
        {isOpenGenerate && (
          <SeoGenerate
            dataArticle={content}
            onClose={onCloseGenerate}
            setDataSeoGenerate={setDataSeoGenerate}
          />
        )}
        <div className="flex flex-col">
          <label
            htmlFor="seo.description"
            className="text-gray-th2 font-medium text-primary-white"
          >
            SEO Description
          </label>
          <input
            type="text"
            id="seo.description"
            name="seo.description"
            value={blogData.seo.description}
            onChange={onFieldChange}
            className="border border-gray-300 rounded-md p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter SEO Description"
          />
        </div>
        <InputSeoKeyword
          keywords={blogData.seo.keywords}
          keywordInput={keywordInput}
          setKeywordInput={setKeywordInput}
          handleAddKeyword={onAddKeyword}
          handleDeleteKeyword={onDeleteKeyword}
        />
      </div>
    </>
  );
};

export default BlogSeoForm;
