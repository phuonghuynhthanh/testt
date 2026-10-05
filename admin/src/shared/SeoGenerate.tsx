import React, { useState } from "react";
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
        autoClose: 3000,
      });
      onClose();
    } catch {
      toast.dismiss();
      toast.error("Không thể tạo nội dung SEO. Vui lòng thử lại.");
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Tạo nội dung SEO">
      <div className="p-1 sm:p-2">
        <h2 className="text-lg font-semibold text-content-primary mb-1">
          Tạo nội dung SEO
        </h2>
        <p className="text-xs text-content-muted mb-4">
          Kiểm tra nội dung bên dưới trước khi tạo metadata SEO. AI sẽ phân tích thông tin này để tạo tiêu đề và mô tả tối ưu cho công cụ tìm kiếm.
        </p>

        <div className="flex flex-col gap-3.5">
          <div>
            <label
              htmlFor="title"
              className="label mb-1 text-xs font-medium text-content-secondary"
            >
              Tiêu đề bài viết (dùng cho AI phân tích)
            </label>
            <input
              id="title"
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              className="inp w-full"
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="label mb-1 text-xs font-medium text-content-secondary"
            >
              Nội dung bài viết (dùng cho AI phân tích)
            </label>
            <textarea
              id="content"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              rows={5}
              className="inp w-full"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn btn-primary"
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
