import React from "react";
import { MagnifyingGlass, UploadSimple, ArrowUp, ArrowDown, X } from "@phosphor-icons/react";
import type { LinkedInMediaAsset, LinkedInMediaMode } from "../../../types/Publication";
import { linkedinMediaKey, linkedinMediaUrl } from "../../../utils/linkedinMedia";
import { AIImagePanel } from "../../../shared/media/AIImagePanel";
import { SectionHeading } from "../../../shared/ui";

interface LinkedInPostMediaCardProps {
  immutable: boolean;
  mediaMode: LinkedInMediaMode;
  onMediaModeChange: (mode: LinkedInMediaMode) => void;
  keywords: string;
  onKeywordsChange: (kw: string) => void;
  onSearchMedia: () => void;
  isSearchingMedia: boolean;
  onUploadMedia: (files: File[]) => void;
  isUploadingMedia: boolean;
  candidates: LinkedInMediaAsset[];
  media: LinkedInMediaAsset[];
  onToggleCandidate: (item: LinkedInMediaAsset) => void;
  onMoveMedia: (key: string, delta: number) => void;
  onAltTextChange: (key: string, text: string) => void;
  onAddAiGeneratedMedia: (item: LinkedInMediaAsset) => void;
  topic: string;
  content: string;
}

// Media selection and candidate management section for LinkedIn post authoring.
export const LinkedInPostMediaCard: React.FC<LinkedInPostMediaCardProps> = ({
  immutable,
  mediaMode,
  onMediaModeChange,
  keywords,
  onKeywordsChange,
  onSearchMedia,
  isSearchingMedia,
  onUploadMedia,
  isUploadingMedia,
  candidates,
  media,
  onToggleCandidate,
  onMoveMedia,
  onAltTextChange,
  onAddAiGeneratedMedia,
  topic,
  content,
}) => {
  return (
    <div className="panel p-4 space-y-4">
      <SectionHeading title="Hình ảnh bài đăng" description="Tìm ảnh Pexels hoặc tải ảnh trực tiếp từ thiết bị" />

      <div className="flex items-center gap-2">
        <label className="hint">Chế độ ảnh:</label>
        <select
          disabled={immutable}
          value={mediaMode}
          onChange={(e) => onMediaModeChange(e.target.value as LinkedInMediaMode)}
          aria-label="Chế độ ảnh"
          className="inp sm !w-auto"
        >
          <option value="none">Không kèm ảnh</option>
          <option value="single-image">Một ảnh</option>
          <option value="multi-image">Nhiều ảnh (2-20)</option>
        </select>
      </div>

      {mediaMode !== "none" && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              disabled={immutable}
              value={keywords}
              onChange={(e) => onKeywordsChange(e.target.value)}
              placeholder="Từ khóa tìm ảnh Pexels..."
              className="inp"
            />
            <button
              type="button"
              disabled={immutable || isSearchingMedia}
              onClick={onSearchMedia}
              className="btn btn-secondary !h-[2.5rem]"
            >
              <MagnifyingGlass size={16} weight="light" className={isSearchingMedia ? "animate-spin" : ""} />
              <span>Tìm ảnh</span>
            </button>
            <label
              className={`btn btn-secondary !h-[2.5rem] cursor-pointer ${
                immutable || isUploadingMedia ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <UploadSimple size={16} weight="light" />
              <span>Tải ảnh lên</span>
              <input
                type="file"
                multiple={mediaMode === "multi-image"}
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length) onUploadMedia(files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {candidates.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {candidates.map((item) => {
                const key = linkedinMediaKey(item);
                const selected = media.some((m) => linkedinMediaKey(m) === key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={immutable}
                    onClick={() => onToggleCandidate(item)}
                    title={selected ? "Bỏ chọn ảnh này" : "Chọn ảnh này"}
                    className={`relative aspect-square overflow-hidden rounded-lg border bg-surface-elevated transition-all hover:border-primary-green/60 ${
                      selected ? "border-primary-green" : "border-surface-border"
                    }`}
                  >
                    <img src={linkedinMediaUrl(item)} alt={item.altText} className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          <p className="hint">
            Đã chọn: <strong className="text-content-primary">{media.length}</strong> ảnh{" "}
            {mediaMode === "multi-image" ? "(cần 2-20 ảnh)" : "(cần 1 ảnh)"}
          </p>

          {media.length > 0 && (
            <ul className="space-y-2">
              {media.map((item, index) => {
                const key = linkedinMediaKey(item);
                return (
                  <li key={key} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-elevated p-2.5">
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-surface-border bg-surface-elevated">
                      <img src={linkedinMediaUrl(item)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <input
                      value={item.altText ?? ""}
                      onChange={(e) => onAltTextChange(key, e.target.value)}
                      disabled={immutable}
                      placeholder="Mô tả ảnh (bắt buộc)..."
                      className="inp sm"
                    />
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        disabled={immutable || index === 0}
                        onClick={() => onMoveMedia(key, -1)}
                        className="iconbtn"
                        title="Đưa ảnh lên trước"
                        aria-label="Đưa ảnh lên trước"
                      >
                        <ArrowUp size={18} weight="light" />
                      </button>
                      <button
                        type="button"
                        disabled={immutable || index === media.length - 1}
                        onClick={() => onMoveMedia(key, 1)}
                        className="iconbtn"
                        title="Đưa ảnh xuống sau"
                        aria-label="Đưa ảnh xuống sau"
                      >
                        <ArrowDown size={18} weight="light" />
                      </button>
                      <button
                        type="button"
                        disabled={immutable}
                        onClick={() => onToggleCandidate(item)}
                        className="iconbtn danger"
                        title="Gỡ ảnh"
                        aria-label="Gỡ ảnh"
                      >
                        <X size={18} weight="light" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <AIImagePanel
            purpose="LINKEDIN"
            context={`${topic}
${content}`}
            disabled={immutable}
            onUse={(generated) => {
              const item = { ...generated.media, order: media.length + 1 };
              onAddAiGeneratedMedia(item);
            }}
          />
        </>
      )}
    </div>
  );
};

export default LinkedInPostMediaCard;
