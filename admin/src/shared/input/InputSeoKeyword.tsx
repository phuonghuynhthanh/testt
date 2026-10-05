import React from "react";
import { Plus, X } from "@phosphor-icons/react";
import InputField from "./InputField";

interface InputSeoKeywordProps {
  keywords: string[];
  keywordInput: string;
  setKeywordInput: (value: string) => void;
  handleAddKeyword: () => void;
  handleDeleteKeyword: (index: number) => void;
}

const InputSeoKeyword: React.FC<InputSeoKeywordProps> = ({
  keywords,
  keywordInput,
  setKeywordInput,
  handleAddKeyword,
  handleDeleteKeyword,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1" onKeyDown={handleKeyDown}>
          <InputField
            label="Từ khóa SEO"
            id="seo-keyword"
            name="seo-key"
            value={keywordInput}
            handleChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Nhập từ khóa và bấm Thêm..."
          />
        </div>
        <button
          type="button"
          onClick={handleAddKeyword}
          title="Thêm từ khóa"
          aria-label="Thêm từ khóa"
          className="btn btn-secondary h-9"
        >
          <Plus size={14} weight="light" className="text-primary-green" />
          <span>Thêm</span>
        </button>
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {keywords.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              className="chip h-6 text-xs text-content-secondary pr-1"
            >
              <span>{keyword}</span>
              <button
                type="button"
                onClick={() => handleDeleteKeyword(index)}
                className="ib w-4 h-4 rounded text-content-muted hover:text-rose-400"
                title={`Xóa từ khóa ${keyword}`}
                aria-label={`Xóa từ khóa ${keyword}`}
              >
                <X size={12} weight="light" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default InputSeoKeyword;
