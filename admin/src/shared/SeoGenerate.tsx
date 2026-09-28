import { useState } from "react";

import { toast } from "react-toastify";
import type { IEditorData } from "../types/Blog";
import type { IDataSeoGenerate } from "../types/OpenAi";
import {
  getSeoDescription,
  getSeoKeywords,
} from "../services/openai/handleSeoGenerate";
import Modal from "./Popup/Modal";

interface SeoGenerateProps {
  dataArticle: IEditorData;
  setDataSeoGenerate: (value: React.SetStateAction<IDataSeoGenerate>) => void;
  onClose: () => void;
}

const SeoGenerate: React.FC<SeoGenerateProps> = ({
  dataArticle,
  setDataSeoGenerate,
  onClose,
}) => {
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };
  const [inputTitle, setInputTitle] = useState<string>(dataArticle.title);
  const [inputContent, setInputContent] = useState<string>(
    stripHtml(dataArticle.body),
  );

  const handleConfirm = async () => {
    try {
      const toastId = toast.loading("Generating SEO content...");
      const title = inputTitle;
      const content = stripHtml(inputContent);
      const keywords = await getSeoKeywords(title, content);
      const description = await getSeoDescription(title, content);
      setDataSeoGenerate({
        listSeoKey: keywords,
        descript: description,
      });
      toast.update(toastId, {
        render: "SEO content generated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
      onClose();
    } catch {
      toast.dismiss();
      toast.error("Failed to generate SEO content. Please try again.");
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTitle(e.target.value);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
  };

  return (
    <div className="fixed flex items-center justify-center h-screen z-[200]">
      <Modal isOpen={true} onClose={onClose}>
        <div className="p-4">
          <h2 className="text-xl text-gray-th2 font-semibold mb-2">
            Generate SEO Content
          </h2>
          <p className="text-gray-600 mb-6">
            Review the content below before generating SEO metadata. Our AI will
            analyze this information to create optimized meta title and
            description for better search engine visibility.
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="title"
                className="block font-medium mb-1 text-gray-th2"
              >
                Article Title (for AI analysis)
              </label>
              <input
                id="title"
                type="text"
                value={inputTitle}
                onChange={handleTitleChange}
                className="w-full p-2 border rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label
                htmlFor="content"
                className="block font-medium mb-1 text-gray-th2"
              >
                Article Content (for AI analysis)
              </label>
              <textarea
                id="content"
                value={inputContent}
                onChange={handleContentChange}
                rows={6}
                className="w-full p-2 border rounded-md bg-gray-50"
              />
            </div>

            <button
              onClick={handleConfirm}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Generate SEO Content
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SeoGenerate;
