import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import Modal from "../Popup/Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Render a modal confirmation dialog to replace native browser window.confirm prompts.
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const confirmButtonClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500"
      : "bg-primary-green hover:bg-primary-green-dark text-primary-black font-semibold focus:ring-primary-green";

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-md p-6">
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            variant === "danger"
              ? "bg-rose-950/60 text-rose-400 border border-rose-800/40"
              : "bg-surface-elevated text-primary-green border border-surface-border"
          }`}
        >
          <FiAlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-base font-semibold text-content-primary">
            {title}
          </h3>
          <p className="text-sm text-content-muted leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-elevated border border-surface-border transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base disabled:opacity-50 flex items-center gap-2 ${confirmButtonClass}`}
        >
          {isLoading && (
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
