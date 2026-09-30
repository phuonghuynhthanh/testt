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
      const toastId = toast.loading("Đang tạo nội dung SEO...");
      const title = inputTitle;
      const content = stripHtml(inputContent);
      const keywords = await getSeoKeywords(title, content);
      const description = await getSeoDescription(title, content);
      setDataSeoGenerate({
        listSeoKey: keywords,
        descript: description,
      });
      toast.update(toastId, {
        render: "Tạo nội dung SEO thành công!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
      onClose();
    } catch {
      toast.dismiss();
      toast.error("Không thể tạo nội dung SEO. Vui lòng thử lại.");
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTitle(e.target.value);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
  };

  // Render modal dialog for generating SEO metadata with OpenAI.
  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Tạo nội dung SEO">
      <div className="p-1 sm:p-2">
        <h2 className="text-xl font-semibold text-content-primary mb-2">
          Tạo nội dung SEO
        </h2>
        <p className="text-sm text-content-muted mb-6">
          Kiểm tra nội dung bên dưới trước khi tạo metadata SEO. AI sẽ phân tích thông tin này để tạo tiêu đề và mô tả tối ưu cho công cụ tìm kiếm.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="title"
              className="block text-xs font-medium mb-1.5 text-content-secondary"
            >
              Tiêu đề bài viết (dùng cho AI phân tích)
            </label>
            <input
              id="title"
              type="text"
              value={inputTitle}
              onChange={handleTitleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface-elevated text-content-primary placeholder-content-muted focus:outline-none focus:border-primary-green focus:ring-1 focus:ring-primary-green transition-colors text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-xs font-medium mb-1.5 text-content-secondary"
            >
              Nội dung bài viết (dùng cho AI phân tích)
            </label>
            <textarea
              id="content"
              value={inputContent}
              onChange={handleContentChange}
              rows={6}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface-elevated text-content-primary placeholder-content-muted focus:outline-none focus:border-primary-green focus:ring-1 focus:ring-primary-green transition-colors text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-green hover:bg-primary-green-dark text-primary-black transition-colors shadow-sm"
            >
              Tạo nội dung SEO
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SeoGenerate;
