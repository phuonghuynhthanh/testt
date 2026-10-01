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
  publishLinkedin: boolean;
  settingsDirty: boolean;
  content: string;
  onContentChange: (val: string) => void;
  isGeneratingDraft: boolean;
  onGenerateDraft: () => void;
  mediaMode: LinkedInMediaMode;
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
  onSaveDraft: () => void;
  canSaveDraft: boolean;
  isSavingDraft: boolean;
  isPublished: boolean;
}

// Render the right-side LinkedIn workspace, displaying idle prompt or full draft & media editing suite.
export const LinkedInWorkspaceCard: React.FC<LinkedInWorkspaceCardProps> = ({
  publishLinkedin,
  settingsDirty,
  content,
  onContentChange,
  isGeneratingDraft,
  onGenerateDraft,
  mediaMode,
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
  onSaveDraft,
  canSaveDraft,
  isSavingDraft,
  isPublished,
}) => {
  // Keep the editor disabled until the selected LinkedIn channel is saved.
  if (!publishLinkedin || settingsDirty) {
    const needsSave = publishLinkedin && settingsDirty;

    return (
      <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[320px] space-y-3">
        <div className="size-12 rounded-full bg-surface-elevated flex items-center justify-center text-content-muted">
          <FaLinkedin className="text-2xl opacity-40" />
        </div>
        <h4 className="text-sm font-semibold text-content-primary">
          {needsSave ? "Chưa lưu kênh LinkedIn" : "LinkedIn đang tắt"}
        </h4>
        <p className="text-xs text-content-muted max-w-xs leading-relaxed">
          {needsSave
            ? "Lưu cấu hình kênh trước khi tạo hoặc chỉnh sửa nội dung LinkedIn."
            : "Bật \"Đăng lên LinkedIn\" và lưu cấu hình để soạn nội dung."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <h3 className="font-semibold text-content-primary text-sm flex items-center gap-2">
          <FaLinkedin className="text-[#0a66c2]" />
          <span>Nội dung bài đăng LinkedIn</span>
        </h3>
        <button
          type="button"
          onClick={onGenerateDraft}
          disabled={isGeneratingDraft || isPublished}
          className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
        >
          {isGeneratingDraft ? "Đang tạo..." : content ? "Tạo lại" : "Tạo bản nháp"}
        </button>
      </div>

      <textarea
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
              className="rounded"
            />
            <span>Tôi đã kiểm tra tính chính xác của các thông tin trên.</span>
          </label>
        </div>
      )}

      {/* Media suite */}
      {mediaMode !== "none" && (
        <div className="space-y-3 border-t border-surface-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-content-primary">Hình ảnh đính kèm</h4>
            <div className="flex items-center gap-2">
              <input
                value={keywordInput}
                onChange={(e) => onKeywordChange(e.target.value)}
                placeholder="Từ khóa Pexels..."
                className="rounded-lg border border-surface-border bg-surface-elevated px-2.5 py-1 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
              />
              <button
                type="button"
                onClick={onSearchMedia}
                disabled={isSearchingMedia}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-surface-elevated hover:bg-surface-hover border border-surface-border text-content-primary"
              >
                {isSearchingMedia ? "Đang tìm..." : "Tìm ảnh"}
              </button>
              <label
                title={isUploading ? "Đang tải ảnh" : "Tải ảnh lên"}
                aria-label={isUploading ? "Đang tải ảnh" : "Tải ảnh lên"}
                className={`inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-surface-border bg-surface-elevated text-content-primary hover:bg-surface-hover ${
                  isUploading ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <FiUpload className="text-xs" />
                <input
                  type="file"
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
                      value={cand.altText || ""}
                      onChange={(e) => onUpdateAltText(key, e.target.value)}
                      placeholder="Alt text..."
                      className="w-full rounded border border-surface-border bg-surface-card px-1.5 py-0.5 text-[11px] text-content-primary focus:outline-none"
                    />
                    <div className="flex items-center gap-1">
                      {selected && selectedMedia.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => onMoveMedia(key, -1)}
                            title="Đưa ảnh lên trước"
                            aria-label="Đưa ảnh lên trước"
                            className="flex-1 py-0.5 rounded border border-surface-border bg-surface-card text-center"
                          >
                            <FiArrowUp className="mx-auto text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveMedia(key, 1)}
                            title="Đưa ảnh xuống sau"
                            aria-label="Đưa ảnh xuống sau"
                            className="flex-1 py-0.5 rounded border border-surface-border bg-surface-card text-center"
                          >
                            <FiArrowDown className="mx-auto text-[10px]" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleMedia(cand as LinkedInMediaAsset)}
                        className={`flex-1 py-0.5 rounded font-medium text-center ${
                          selected
                            ? "bg-rose-950/40 text-rose-300 border border-rose-800/40"
                            : "bg-teal-600 text-white"
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

      <div className="border-t border-surface-border pt-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={!canSaveDraft || isSavingDraft || isPublished}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition-colors shadow-sm"
        >
          {isSavingDraft ? "Đang lưu..." : "Lưu bản nháp LinkedIn"}
        </button>
      </div>
    </div>
  );
};

export default LinkedInWorkspaceCard;
