import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { BsStars } from "react-icons/bs";
import InputField from "../../../shared/input/InputField";
import InputSeoKeyword from "../../../shared/input/InputSeoKeyword";
import SeoGenerate from "../../../shared/SeoGenerate";
import SectionHeading from "../../../shared/ui/SectionHeading";
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

// Render SEO metadata inputs and AI SEO generation controls with dark surface styling.
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
    <div className="space-y-5 bg-surface-card p-6 rounded-xl border border-surface-border">
      <SectionHeading
        title="Thông tin SEO & Metadata"
        description="Tối ưu hóa thẻ mô tả, từ khóa tìm kiếm và cấu hình chia sẻ bài viết"
        action={
          <button
            type="button"
            title="Tạo SEO bằng AI"
            aria-label="Tạo SEO bằng AI"
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-900/50 hover:text-purple-200 shadow-xs"
            onClick={onGenerateSEO}
          >
            <BsStars className="text-sm text-purple-400" />
            <span>Tạo SEO bằng AI</span>
          </button>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Thời gian xuất bản"
            id="published_time"
            name="published_time"
            value={blogData.seo.published_time ?? ""}
            placeholder="Tự động khi xuất bản"
            readOnly
          />
          <InputField
            label="Thời gian chỉnh sửa"
            id="modified_time"
            name="modified_time"
            value={blogData.seo.modified_time ?? ""}
            placeholder="Tự động khi cập nhật"
            readOnly
          />
        </div>

        <InputField
          label="Tiêu đề SEO"
          id="seo.title"
          name="seo.title"
          value={blogData.seo.title}
          placeholder="Nhập tiêu đề SEO bài viết..."
          handleChange={onFieldChange}
        />

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
            className="text-xs font-medium text-content-secondary mb-1.5"
          >
            Mô tả SEO (Meta Description)
          </label>
          <textarea
            id="seo.description"
            name="seo.description"
            rows={3}
            value={blogData.seo.description}
            onChange={onFieldChange as unknown as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
            className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3.5 py-2 text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition resize-y"
            placeholder="Nhập đoạn tóm tắt ngắn cho công cụ tìm kiếm Google..."
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
    </div>
  );
};

export default BlogSeoForm;
