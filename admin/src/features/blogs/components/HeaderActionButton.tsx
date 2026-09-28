import { IoClose } from "react-icons/io5";
import { MdPreview, MdEdit, MdCode } from "react-icons/md";
import { IoIosSave } from "react-icons/io";

export type BlogPreviewMode = "edit" | "markdown" | "preview";

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
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow"
        >
          <IoClose className="w-5 h-5" />
          <span>Close</span>
        </button>

        {/* Segmented Control Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-inner">
          <button
            onClick={() => onModeChange("edit")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm
              ${
                mode === "edit"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "bg-transparent text-gray-600 hover:text-gray-800"
              }
            `}
          >
            <MdEdit className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onModeChange("markdown")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm
              ${
                mode === "markdown"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "bg-transparent text-gray-600 hover:text-gray-800"
              }
            `}
          >
            <MdCode className="w-4 h-4" />
            <span>Markdown</span>
          </button>
          <button
            onClick={() => onModeChange("preview")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm
              ${
                mode === "preview"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "bg-transparent text-gray-600 hover:text-gray-800"
              }
            `}
          >
            <MdPreview className="w-4 h-4" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {onSave && (
        <button
          onClick={onSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:shadow-sm"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
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
              <span>Saving...</span>
            </>
          ) : (
            <>
              <IoIosSave className="w-5 h-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default HeaderActionButton;
