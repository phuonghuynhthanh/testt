import React from "react";
import { FiAlertTriangle, FiCheck } from "react-icons/fi";
import type { LinkedInMode } from "../../../types/Publication";

interface PublicationChannelCardProps {
  publishWeb: boolean;
  publishLinkedin: boolean;
  mode: LinkedInMode;
  includeWebLink: boolean;
  settingsDirty: boolean;
  isSaving: boolean;
  isPublished: boolean;
  onToggleWeb: () => void;
  onToggleLinkedin: () => void;
  onChangeMode: (mode: LinkedInMode) => void;
  onToggleWebLink: (checked: boolean) => void;
  onSaveSettings: () => void;
  hideSaveButton?: boolean;
}

// Render distribution channel toggles, LinkedIn mode selection, and save configuration trigger.
export const PublicationChannelCard: React.FC<PublicationChannelCardProps> = ({
  publishWeb,
  publishLinkedin,
  mode,
  includeWebLink,
  settingsDirty,
  isSaving,
  isPublished,
  onToggleWeb,
  onToggleLinkedin,
  onChangeMode,
  onToggleWebLink,
  onSaveSettings,
  hideSaveButton = false,
}) => {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <h3 className="font-semibold text-content-primary text-sm">Kênh đăng</h3>
        {settingsDirty && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <FiAlertTriangle className="text-xs" />
            <span>Cấu hình chưa lưu</span>
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Toggle Web */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="text-xs font-semibold text-content-primary block cursor-pointer">
              Đăng lên web
            </label>
            <p className="text-[11px] text-content-muted mt-0.5 leading-relaxed">
              Bài hiển thị trên website công khai (cần ở trạng thái Đã duyệt).
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleWeb}
            disabled={isPublished}
            aria-label="Đăng lên web"
            aria-pressed={publishWeb}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
              publishWeb ? "bg-teal-600" : "bg-surface-elevated border-surface-border"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                publishWeb ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Toggle LinkedIn */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="text-xs font-semibold text-content-primary block cursor-pointer">
              Đăng lên LinkedIn
            </label>
            <p className="text-[11px] text-content-muted mt-0.5 leading-relaxed">
              Đăng qua trang tổ chức LinkedIn của VietQuant.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleLinkedin}
            disabled={isPublished}
            aria-label="Đăng lên LinkedIn"
            aria-pressed={publishLinkedin}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
              publishLinkedin ? "bg-teal-600" : "bg-surface-elevated border-surface-border"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                publishLinkedin ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* LinkedIn Mode Options */}
      {publishLinkedin && (
        <div className="border-t border-surface-border pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-content-primary">Nội dung LinkedIn</h4>

          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-content-secondary">
              <input
                type="radio"
                name="linkedin-mode"
                checked={mode === "SAME"}
                disabled={isPublished}
                onChange={() => onChangeMode("SAME")}
                className="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="font-medium text-content-primary block">Giữ nguyên bài</span>
                <span className="text-[11px] text-content-muted">
                  Chuyển bài viết sang văn bản LinkedIn, bỏ cú pháp Markdown.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-content-secondary">
              <input
                type="radio"
                name="linkedin-mode"
                checked={mode === "SUMMARY"}
                disabled={isPublished}
                onChange={() => onChangeMode("SUMMARY")}
                className="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="font-medium text-content-primary block">Tóm tắt bằng AI</span>
                <span className="text-[11px] text-content-muted">
                  AI viết bản tóm tắt và tự kiểm tra sự thật.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-content-secondary">
              <input
                type="radio"
                name="linkedin-mode"
                checked={mode === "CUSTOM"}
                disabled={isPublished}
                onChange={() => onChangeMode("CUSTOM")}
                className="mt-0.5 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="font-medium text-content-primary block">Tự viết</span>
                <span className="text-[11px] text-content-muted">
                  Bạn soạn nội dung, hệ thống không chỉnh sửa.
                </span>
              </div>
            </label>
          </div>

          <label className="flex items-center gap-2 pt-2 text-xs text-content-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={includeWebLink}
              disabled={!publishWeb || isPublished}
              onChange={(e) => onToggleWebLink(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Chèn liên kết tới bài trên web</span>
          </label>
        </div>
      )}

      {!hideSaveButton && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSaveSettings}
            disabled={!settingsDirty || isSaving || isPublished}
            title={isSaving ? "Đang lưu cấu hình" : "Lưu cấu hình"}
            aria-label={isSaving ? "Đang lưu cấu hình" : "Lưu cấu hình"}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-40 transition-colors shadow-sm"
          >
            <FiCheck className={`text-sm ${isSaving ? "animate-pulse" : ""}`} />
            <span>{isSaving ? "Đang lưu..." : "Lưu cấu hình"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PublicationChannelCard;
