import React from "react";
import { X, Eye, PencilSimple, Code, FloppyDisk, CircleNotch } from "@phosphor-icons/react";

export type BlogPreviewMode = "edit" | "markdown" | "preview";

interface HeaderActionButtonProps {
  onClose: () => void;
  onModeChange: (mode: BlogPreviewMode) => void;
  mode: BlogPreviewMode;
  onSave?: () => void;
  isLoading?: boolean;
}

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({
  onClose,
  onModeChange,
  mode = "edit",
  onSave,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={onClose}
          title="Đóng"
          aria-label="Đóng"
          className="btn btn-ghost"
        >
          <X size={15} weight="light" />
          <span>Đóng</span>
        </button>

        <div className="seg">
          <button
            type="button"
            onClick={() => onModeChange("edit")}
            title="Soạn thảo"
            aria-label="Soạn thảo"
            aria-pressed={mode === "edit"}
          >
            <PencilSimple size={14} weight="light" />
            <span>Soạn thảo</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("markdown")}
            title="Mã Markdown"
            aria-label="Mã Markdown"
            aria-pressed={mode === "markdown"}
          >
            <Code size={14} weight="light" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("preview")}
            title="Xem trước"
            aria-label="Xem trước"
            aria-pressed={mode === "preview"}
          >
            <Eye size={14} weight="light" />
            <span>Xem trước</span>
          </button>
        </div>
      </div>

      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={isLoading}
          title={isLoading ? "Đang lưu thay đổi" : "Lưu thay đổi"}
          aria-label={isLoading ? "Đang lưu thay đổi" : "Lưu thay đổi"}
          className="btn btn-primary"
        >
          {isLoading ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : (
            <FloppyDisk size={14} weight="light" />
          )}
          <span>{isLoading ? "Đang lưu..." : "Lưu thay đổi"}</span>
        </button>
      )}
    </div>
  );
};

export default HeaderActionButton;
