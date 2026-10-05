import React from "react";
import { Warning, CircleNotch } from "@phosphor-icons/react";
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

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="!max-w-[420px] !p-5" ariaLabel={title}>
      <div className="flex items-start gap-3.5">
        <div
          className={`grid place-items-center w-9 h-9 rounded-md shrink-0 ${
            variant === "danger"
              ? "bg-rose-950/40 text-rose-400 border border-rose-800/40"
              : "bg-surface-elevated text-primary-green border border-surface-border"
          }`}
        >
          <Warning size={20} weight="light" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-content-primary">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[#CBD5E1] leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
        <button
          type="button"
          data-autofocus
          onClick={onCancel}
          disabled={isLoading}
          className="btn btn-ghost"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`btn ${variant === "danger" ? "btn-solid-danger" : "btn-primary"}`}
        >
          {isLoading && <CircleNotch size={14} className="animate-spin" />}
          <span>{confirmLabel}</span>
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
