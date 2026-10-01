import React from "react";
import { FaLinkedin } from "react-icons/fa";
import { FiUpload, FiArrowUp, FiArrowDown } from "react-icons/fi";
import type {
  FactualReview,
  LinkedInMediaAsset,
  LinkedInMediaMode,
  PexelsCandidate,
} from "../../../types/Publication";
import { linkedinMediaKey, linkedinMediaUrl } from "../../../utils/linkedinMedia";

interface LinkedInWorkspaceCardProps {
  content: string;
  onContentChange: (val: string) => void;
  isGeneratingDraft: boolean;
  onGenerateDraft: () => void;
  showGenerateDraft?: boolean;
  mediaMode: LinkedInMediaMode;
  onMediaModeChange: (mode: LinkedInMediaMode) => void;
  candidates: (LinkedInMediaAsset | PexelsCandidate)[];
  selectedMedia: LinkedInMediaAsset[];
  onToggleMedia: (candidate: LinkedInMediaAsset) => void;
  onMoveMedia: (key: string, delta: number) => void;
  onUpdateAltText: (key: string, altText: string) => void;
  onUploadMedia: (files: File[]) => void;
  isUploading: boolean;
  keywordInput: string;
  onKeywordChange: (val: string) => void;
  onSearchMedia: () => void;
  isSearchingMedia: boolean;
  factCheck: FactualReview;
  factCheckAcknowledged: boolean;
  onAcknowledgeFactCheck: (val: boolean) => void;
  isPublished: boolean;
}

// Render editable LinkedIn content with generated or manually uploaded image selections.
export const LinkedInWorkspaceCard: React.FC<LinkedInWorkspaceCardProps> = ({
  content,
  onContentChange,
  isGeneratingDraft,
  onGenerateDraft,
  showGenerateDraft = true,
  mediaMode,
  onMediaModeChange,
  candidates,
  selectedMedia,
  onToggleMedia,
  onMoveMedia,
  onUpdateAltText,
  onUploadMedia,
  isUploading,
  keywordInput,
  onKeywordChange,
  onSearchMedia,
  isSearchingMedia,
  factCheck,
  factCheckAcknowledged,
  onAcknowledgeFactCheck,
  isPublished,
}) => {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <h3 className="font-semibold text-content-primary text-sm flex items-center gap-2">
          <FaLinkedin className="text-[#0a66c2]" />
          <span>2. Chuẩn bị bài LinkedIn</span>
        </h3>
        {showGenerateDraft && (
          <button
            type="button"
            onClick={onGenerateDraft}
            disabled={isGeneratingDraft || isPublished}
            className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {isGeneratingDraft ? "Đang tạo..." : content ? "Tạo lại" : "Tạo bản nháp"}
          </button>
        )}
      </div>

      <textarea
        aria-label="Nội dung bài đăng LinkedIn"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        disabled={isPublished}
        rows={6}
        className="w-full rounded-lg border border-surface-border bg-surface-elevated p-3 text-xs sm:text-sm text-content-primary placeholder-content-muted focus:border-primary-green focus:outline-none focus:ring-1 focus:ring-primary-green transition"
        placeholder="Soạn thảo nội dung bài đăng LinkedIn..."
      />

      {factCheck.requiresHumanFactCheck && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200 space-y-1.5">
          <strong className="text-amber-300 block">Kiểm tra thông tin sự thật</strong>
          <ul className="ml-4 list-disc space-y-0.5">
            {factCheck.factCheckNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={factCheckAcknowledged}
              onChange={(e) => onAcknowledgeFactCheck(e.target.checked)}
              disabled={isPublished}
              className="rounded"
            />
            <span>Tôi đã kiểm tra tính chính xác của các thông tin trên.</span>
          </label>
        </div>
      )}

      {/* Allow manual image selection independently of generated image plans. */}
      <label className="flex flex-wrap items-center gap-3 text-xs text-content-secondary">
        Chế độ ảnh
        <select aria-label="Chế độ ảnh" value={mediaMode} disabled={isPublished} onChange={(event) => onMediaModeChange(event.target.value as LinkedInMediaMode)} className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-content-primary">
          <option value="none">Không kèm ảnh</option>
          <option value="single-image">Một ảnh</option>
          <option value="multi-image">Nhiều ảnh (2–20)</option>
        </select>
      </label>
      {mediaMode !== "none" && (
        <div className="space-y-3 border-t border-surface-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-content-primary">Hình ảnh đính kèm</h4>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={keywordInput}
                onChange={(e) => onKeywordChange(e.target.value)}
                disabled={isPublished}
                placeholder="Từ khóa Pexels..."
                className="rounded-lg border border-surface-border bg-surface-elevated px-2.5 py-1 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
              />
              <button
                type="button"
                onClick={onSearchMedia}
                disabled={isSearchingMedia || isPublished}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-surface-elevated hover:bg-surface-hover border border-surface-border text-content-primary"
              >
                {isSearchingMedia ? "Đang tìm..." : "Tìm ảnh"}
              </button>
              <label
                title={isUploading ? "Đang tải ảnh" : "Tải ảnh lên"}
                aria-label={isUploading ? "Đang tải ảnh" : "Tải ảnh lên"}
                className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-surface-border bg-surface-elevated px-2.5 text-xs font-medium text-content-primary hover:bg-surface-hover ${
                  isUploading || isPublished ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <FiUpload className="text-xs" />
                <span>{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                <input
                  type="file"
                  disabled={isPublished || isUploading}
                  multiple={mediaMode === "multi-image"}
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) onUploadMedia(files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <p className="text-xs text-content-muted">Đã chọn {selectedMedia.length} ảnh · {mediaMode === "single-image" ? "Cần 1 ảnh" : "Cần 2–20 ảnh"}. Nhập mô tả cho ảnh trước khi lưu.</p>
          {candidates.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {candidates.map((cand) => {
                const key = linkedinMediaKey(cand);
                const selected = selectedMedia.some((item) => linkedinMediaKey(item) === key);
                return (
                  <div
                    key={key}
                    className={`rounded-lg border bg-surface-elevated overflow-hidden text-[11px] p-1.5 space-y-1.5 ${
                      selected ? "border-primary-green ring-1 ring-primary-green" : "border-surface-border"
                    }`}
                  >
                    <img
                      src={linkedinMediaUrl(cand)}
                      alt={cand.altText || "LinkedIn preview"}
                      className="h-20 w-full object-cover rounded"
                    />
                    <input
                      value={selectedMedia.find((item) => linkedinMediaKey(item) === key)?.altText ?? cand.altText ?? ""}
                      onChange={(e) => onUpdateAltText(key, e.target.value)}
                      disabled={isPublished}
                      aria-label="Mô tả ảnh"
                      placeholder="Mô tả ảnh (bắt buộc)..."
                      className="w-full rounded border border-surface-border bg-surface-card px-1.5 py-0.5 text-[11px] text-content-primary focus:outline-none"
                    />
                    <div className="flex items-center gap-1">
                      {selected && selectedMedia.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => onMoveMedia(key, -1)}
                            disabled={isPublished || selectedMedia.findIndex((item) => linkedinMediaKey(item) === key) === 0}
                            title="Đưa ảnh lên trước"
                            aria-label="Đưa ảnh lên trước"
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-surface-border bg-surface-card py-0.5 text-center"
                          >
                            <FiArrowUp className="text-[10px]" />
                            <span>Lên</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveMedia(key, 1)}
                            disabled={isPublished || selectedMedia.findIndex((item) => linkedinMediaKey(item) === key) === selectedMedia.length - 1}
                            title="Đưa ảnh xuống sau"
                            aria-label="Đưa ảnh xuống sau"
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-surface-border bg-surface-card py-0.5 text-center"
                          >
                            <FiArrowDown className="text-[10px]" />
                            <span>Xuống</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleMedia(cand as LinkedInMediaAsset)}
                        disabled={isPublished}
                        className={`flex-1 py-0.5 rounded font-medium text-center ${
                          selected
                            ? "bg-rose-950/40 text-rose-300 border border-rose-800/40"
                            : "bg-teal-700 text-white hover:bg-teal-800"
                        }`}
                      >
                        {selected ? "Bỏ" : "Chọn"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default LinkedInWorkspaceCard;
