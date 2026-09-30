import React from "react";
import { IoMdAddCircle } from "react-icons/io";
import { IoCloseOutline } from "react-icons/io5";
import InputField from "./InputField";

interface InputSeoKeywordProps {
  keywords: string[];
  keywordInput: string;
  setKeywordInput: (value: string) => void;
  handleAddKeyword: () => void;
  handleDeleteKeyword: (index: number) => void;
}

// Render dynamic SEO keyword chips with entry input and deletion actions.
const InputSeoKeyword: React.FC<InputSeoKeywordProps> = ({
  keywords,
  keywordInput,
  setKeywordInput,
  handleAddKeyword,
  handleDeleteKeyword,
}) => {
  // Submit keyword entry when user presses Enter key.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2.5">
        <div className="flex-1" onKeyDown={handleKeyDown}>
          <InputField
            label="Từ khóa SEO"
            id="seo-keyword"
            name="seo-key"
            value={keywordInput}
            handleChange={(e) => setKeywordInput(e.target.value)}
            placeholder='Nhập từ khóa và bấm Thêm (hoặc phân tách bằng dấu phẩy)...'
          />
        </div>
        <button
          type="button"
          onClick={handleAddKeyword}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover text-content-primary hover:text-white border border-surface-border text-xs font-semibold h-[38px] transition-colors"
        >
          <IoMdAddCircle className="text-primary-green text-base" />
          <span>Thêm từ khóa</span>
        </button>
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {keywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-surface-border text-xs text-content-secondary group"
            >
              <span>{keyword}</span>
              <button
                type="button"
                onClick={() => handleDeleteKeyword(index)}
                className="text-content-muted hover:text-rose-400 transition-colors p-0.5"
                aria-label={`Xóa từ khóa ${keyword}`}
              >
                <IoCloseOutline className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default InputSeoKeyword;
