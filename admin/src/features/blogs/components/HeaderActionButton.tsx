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
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-content-primary border border-surface-border rounded-xl transition-all duration-200 font-medium text-sm shadow-sm"
        >
          <IoClose className="w-5 h-5" />
          <span>Đóng</span>
        </button>

        {/* Segmented Control Toggle */}
        <div className="flex items-center bg-surface-elevated rounded-xl p-1 border border-surface-border">
          <button
            onClick={() => onModeChange("edit")}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs
              ${
                mode === "edit"
                  ? "bg-surface-card text-content-primary shadow-sm border border-surface-border"
                  : "bg-transparent text-content-muted hover:text-content-primary"
              }
            `}
          >
            <MdEdit className="w-4 h-4" />
            <span>Chỉnh sửa</span>
          </button>
          <button
            onClick={() => onModeChange("markdown")}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs
              ${
                mode === "markdown"
                  ? "bg-surface-card text-content-primary shadow-sm border border-surface-border"
                  : "bg-transparent text-content-muted hover:text-content-primary"
              }
            `}
          >
            <MdCode className="w-4 h-4" />
            <span>Mã Markdown</span>
          </button>
          <button
            onClick={() => onModeChange("preview")}
            className={`
              flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs
              ${
                mode === "preview"
                  ? "bg-surface-card text-content-primary shadow-sm border border-surface-border"
                  : "bg-transparent text-content-muted hover:text-content-primary"
              }
            `}
          >
            <MdPreview className="w-4 h-4" />
            <span>Xem trước</span>
          </button>
        </div>
      </div>

      {onSave && (
        <button
          onClick={onSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 bg-primary-green hover:bg-primary-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-primary-black font-semibold rounded-xl transition-all duration-200 text-xs shadow-md"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-primary-black"
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
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <IoIosSave className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default HeaderActionButton;
