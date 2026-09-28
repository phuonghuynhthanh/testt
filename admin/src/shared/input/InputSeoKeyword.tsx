import React from "react";
import { IoMdAddCircle } from "react-icons/io";
import { FaRegWindowClose } from "react-icons/fa";
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
  return (
    <div>
      <div className="flex items-end mb-2 space-x-2">
        <InputField
          label="SEO Keywords"
          id="seo-keyword"
          name="seo-key"
          value={keywordInput}
          handleChange={(e) => setKeywordInput(e.target.value)}
          placeholder='Enter keywords separated by commas, e.g., "kw1, kw2, kw3"'
        />
        <button
          onClick={handleAddKeyword}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Add Keywords <IoMdAddCircle className="inline" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 border border-gray-300 p-2 bg-gray-100 rounded-md"
          >
            <span>{keyword}</span>
            <button
              onClick={() => handleDeleteKeyword(index)}
              className="text-red-500 hover:text-red-600"
              aria-label="Delete keyword"
            >
              <FaRegWindowClose />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InputSeoKeyword;
