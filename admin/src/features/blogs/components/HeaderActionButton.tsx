import { IoClose } from "react-icons/io5";
import { MdPreview, MdEdit, MdCode } from "react-icons/md";
import { IoIosSave } from "react-icons/io";

export type BlogPreviewMode = "edit" | "markdown" | "preview";

// Render action controls for blog preview and mode switcher.
const HeaderActionButton = ({
  onClose,
  onModeChange,
  mode = "edit",
  onSave,
  isLoading = false,
}: {
  onClose: () => void;
  onModeChange: (mode: BlogPreviewMode) => void;
  mode: BlogPreviewMode;
  onSave: () => void;
  isLoading: boolean;
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={onClose}
          title="Đóng"
          aria-label="Đóng"
          className="inline-flex h-9 items-center gap-1.5 px-3 bg-surface-elevated hover:bg-surface-hover text-content-primary border border-surface-border rounded-xl transition-all duration-200 shadow-sm text-xs font-medium"
        >
          <IoClose className="w-4 h-4" />
          <span>Đóng</span>
        </button>

        {/* Segmented Control Toggle */}
        <div className="grid w-full grid-cols-3 items-center bg-surface-elevated rounded-xl p-1 border border-surface-border sm:flex sm:w-auto gap-1">
          <button
            type="button"
            onClick={() => onModeChange("edit")}
            title="Soạn thảo"
            aria-label="Soạn thảo"
            className={`
              inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
              ${
                mode === "edit"
                  ? "bg-surface-card text-content-primary shadow-sm border border-surface-border"
                  : "bg-transparent text-content-muted hover:text-content-primary"
              }
            `}
          >
            <MdEdit className="w-3.5 h-3.5" />
            <span>Soạn thảo</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("markdown")}
            title="Mã Markdown"
            aria-label="Mã Markdown"
            className={`
              inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
              ${
                mode === "markdown"
                  ? "bg-surface-card text-content-primary shadow-sm border border-surface-border"
                  : "bg-transparent text-content-muted hover:text-content-primary"
              }
            `}
          >
            <MdCode className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange("preview")}
            title="Xem trước"
            aria-label="Xem trước"
            className={`
              inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
              ${
                mode === "preview"
                  ? "bg-surface-card text-content-primary shadow-sm border border-surface-border"
                  : "bg-transparent text-content-muted hover:text-content-primary"
              }
            `}
          >
            <MdPreview className="w-3.5 h-3.5" />
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
          className="inline-flex h-9 items-center gap-2 px-4 bg-primary-green hover:bg-primary-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-primary-black font-semibold text-xs rounded-xl transition-all duration-200 shadow-md"
        >
          {isLoading ? (
            <svg
              className="animate-spin h-3.5 w-3.5 text-primary-black"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <IoIosSave className="text-base" />
          )}
          <span>{isLoading ? "Đang lưu..." : "Lưu thay đổi"}</span>
        </button>
      )}
    </div>
  );
};

export default HeaderActionButton;
