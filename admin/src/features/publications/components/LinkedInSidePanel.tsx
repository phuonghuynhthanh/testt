import React from "react";
import {
  ArrowClockwise,
  ChatCircle,
  CheckCircle,
  Circle,
  FloppyDisk,
  PaperPlaneTilt,
  Repeat,
  ThumbsUp,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import type { LinkedInMediaAsset } from "../../../types/Publication";
import { StatusBadge } from "../../../shared/ui";
import { linkedinMediaUrl } from "../../../utils/linkedinMedia";

export const LINKEDIN_MAX_CHARS = 3000;

interface LinkedInSidePanelProps {
  status?: string;
  lastErrorMessage?: string;
  publishedLinkUrl?: string | null;
  /** Standalone posts require a topic; blog adaptations take it from the article. */
  showTopicCheck?: boolean;
  topic: string;
  content: string;
  mediaMode: string;
  media: LinkedInMediaAsset[];
  requiresFactCheck: boolean;
  factCheckAcknowledged: boolean;
  immutable: boolean;
  canSave: boolean;
  canPublish: boolean;
  canRetry: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isRetrying: boolean;
  onSave: () => void;
  onPublish: () => void;
  onRetry: () => void;
}

// Render a text with hashtags highlighted like the LinkedIn feed.
const HighlightedText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(#[\p{L}\p{N}_]+)/gu).map((part, index) =>
      part.startsWith("#") ? (
        <span key={index} className="text-[#6cb4f5]">{part}</span>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      ),
    )}
  </>
);

// Render the LinkedIn-style preview card for the current draft.
const LinkedInPreviewCard: React.FC<{ content: string; media: LinkedInMediaAsset[] }> = ({ content, media }) => {
  const images = media.slice(0, 4);
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-[#1b1f23]">
      <div className="flex items-center gap-3 p-4">
        <span className="grid h-11 w-11 place-items-center rounded-md bg-primary-black text-xs font-bold text-primary-green ring-1 ring-surface-border">
          VQ
        </span>
        <div>
          <p className="text-sm font-semibold">VietQuant</p>
          <p className="text-[11px] text-content-muted">Công ty · Vừa xong</p>
        </div>
      </div>
      <p className="whitespace-pre-line px-4 pb-3 text-[13px] leading-relaxed text-content-secondary">
        {content ? <HighlightedText text={content} /> : "Nội dung bài đăng sẽ hiển thị tại đây."}
      </p>
      {images.length > 0 && (
        <div className={`grid gap-0.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.map((item, index) => (
            <div key={index} className={`relative bg-surface-elevated ${images.length === 1 ? "h-56" : "h-32"}`}>
              <img
                src={linkedinMediaUrl(item)}
                alt={item.altText || ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-around border-t border-surface-border px-2 py-2 text-xs text-content-muted">
        <span className="flex items-center gap-1.5"><ThumbsUp size={16} weight="light" />Thích</span>
        <span className="flex items-center gap-1.5"><ChatCircle size={16} weight="light" />Bình luận</span>
        <span className="flex items-center gap-1.5"><Repeat size={16} weight="light" />Chia sẻ</span>
      </div>
    </div>
  );
};

// Render the sticky side column: publish checklist, actions and the feed preview.
export const LinkedInSidePanel: React.FC<LinkedInSidePanelProps> = ({
  status,
  lastErrorMessage,
  publishedLinkUrl,
  showTopicCheck = true,
  topic,
  content,
  mediaMode,
  media,
  requiresFactCheck,
  factCheckAcknowledged,
  immutable,
  canSave,
  canPublish,
  canRetry,
  isSaving,
  isPublishing,
  isRetrying,
  onSave,
  onPublish,
  onRetry,
}) => {
  const count = media.length;
  const length = content.trim().length;
  const mediaOk =
    mediaMode === "none" ? count === 0 : mediaMode === "single-image" ? count === 1 : count >= 2 && count <= 20;
  const checks = [
    ...(showTopicCheck ? [{ ok: Boolean(topic.trim()), label: "Có chủ đề bài đăng" }] : []),
    {
      ok: length > 0 && length <= LINKEDIN_MAX_CHARS,
      label: length > LINKEDIN_MAX_CHARS ? `Nội dung vượt ${LINKEDIN_MAX_CHARS} ký tự` : "Có nội dung bài đăng",
    },
    {
      ok: mediaOk,
      label: mediaMode === "none" ? "Không kèm ảnh" : mediaMode === "single-image" ? "Đã chọn 1 ảnh" : "Đã chọn 2-20 ảnh",
    },
    ...(count ? [{ ok: media.every((item) => (item.altText || "").trim()), label: "Mọi ảnh có mô tả" }] : []),
    ...(requiresFactCheck ? [{ ok: factCheckAcknowledged, label: "Đã xác nhận kiểm tra thông tin" }] : []),
  ];

  const failed = status === "FAILED";
  const published = status === "PUBLISHED";

  return (
    <>
      <div className="panel">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Điều kiện đăng</h4>
            {status && <StatusBadge status={status} />}
          </div>
          <ul className="space-y-1.5 text-xs">
            {checks.map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-2 ${item.ok ? "text-content-secondary" : "text-content-muted"}`}
              >
                {item.ok ? (
                  <CheckCircle size={16} weight="light" className="text-primary-green" />
                ) : (
                  <Circle size={16} weight="light" />
                )}
                {item.label}
              </li>
            ))}
          </ul>

          {published ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
              <CheckCircle size={16} weight="light" className="mr-1 inline align-middle" />
              Bài đã được đăng lên LinkedIn.
              {publishedLinkUrl && (
                <p className="mt-1 truncate font-mono text-[11px] text-emerald-200/80">{publishedLinkUrl}</p>
              )}
            </div>
          ) : failed ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
              <WarningCircle size={16} weight="light" className="mr-1 inline align-middle" />
              {lastErrorMessage || "Đăng bài thất bại."}
            </div>
          ) : status === "REVIEW_REQUIRED" ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-300">
              <Warning size={16} weight="light" className="mr-1 inline align-middle" />
              {lastErrorMessage || "Cần kiểm tra thủ công trước khi đăng."}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {!immutable && (
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave || isSaving}
                className="btn btn-secondary flex-1"
              >
                <FloppyDisk size={16} weight="light" />
                {isSaving ? "Đang lưu..." : "Lưu bản nháp"}
              </button>
            )}
            {failed ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={!canRetry || isRetrying}
                className="btn btn-solid-danger flex-1"
              >
                <ArrowClockwise size={16} weight="light" className={isRetrying ? "animate-spin" : ""} />
                Thử lại xuất bản
              </button>
            ) : (
              !immutable && (
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={!canPublish || isPublishing}
                  className="btn btn-li flex-1"
                >
                  <PaperPlaneTilt size={16} weight="light" />
                  {isPublishing ? "Đang đăng..." : "Đăng lên LinkedIn"}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-content-muted">Xem trước trên LinkedIn</p>
        <LinkedInPreviewCard content={content} media={media} />
      </div>
    </>
  );
};

export default LinkedInSidePanel;
