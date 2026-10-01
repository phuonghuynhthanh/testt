import React from "react";
import { FiCheck, FiAlertTriangle, FiSend } from "react-icons/fi";

interface PublicationPublishCardProps {
  isApproved: boolean;
  settingsDirty: boolean;
  canPublish: boolean;
  isPublishing: boolean;
  publishLabel: string;
  onPublishClick: () => void;
}

// Render readiness checklist and trigger button for multi-channel publication.
export const PublicationPublishCard: React.FC<PublicationPublishCardProps> = ({
  isApproved,
  settingsDirty,
  canPublish,
  isPublishing,
  publishLabel,
  onPublishClick,
}) => {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-4">
      <div className="border-b border-surface-border pb-3">
        <h3 className="font-semibold text-content-primary text-sm">Xuất bản</h3>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          {isApproved ? (
            <FiCheck className="text-emerald-400 shrink-0" />
          ) : (
            <FiAlertTriangle className="text-amber-400 shrink-0" />
          )}
          <span className={isApproved ? "text-content-secondary" : "text-amber-400"}>
            {isApproved ? "Bài viết đã được duyệt." : "Bài viết chưa được duyệt."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!settingsDirty ? (
            <FiCheck className="text-emerald-400 shrink-0" />
          ) : (
            <FiAlertTriangle className="text-amber-400 shrink-0" />
          )}
          <span className={!settingsDirty ? "text-content-secondary" : "text-amber-400"}>
            {!settingsDirty ? "Cấu hình kênh đã được lưu." : "Có cấu hình kênh chưa lưu."}
          </span>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onPublishClick}
          disabled={!canPublish || isPublishing}
          title={isPublishing ? "Đang xuất bản" : publishLabel || "Xuất bản"}
          aria-label={isPublishing ? "Đang xuất bản" : publishLabel || "Xuất bản"}
          className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-40 transition-colors shadow-sm"
        >
          <FiSend className={`text-sm ${isPublishing ? "animate-pulse" : ""}`} />
        </button>
      </div>
    </div>
  );
};

export default PublicationPublishCard;
