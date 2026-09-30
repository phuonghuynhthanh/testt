import React, { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IoCloseOutline } from "react-icons/io5";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

// Render an accessible modal dialog portal with dark backdrop and refined surface boundaries.
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = "" }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(event) => {
        onClose();
        event.stopPropagation();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-h-[90vh] overflow-y-auto bg-surface-card bg-opacity-100 rounded-2xl shadow-2xl border border-surface-border text-content-primary ${className || "max-w-2xl p-6"}`}
        style={{ backgroundColor: "#1A1A1A" }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-content-muted hover:text-content-primary bg-surface-elevated/50 hover:bg-surface-elevated rounded-lg p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green"
          aria-label="Đóng cửa sổ"
        >
          <IoCloseOutline className="w-5 h-5" />
        </button>

        <div className="w-full">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
