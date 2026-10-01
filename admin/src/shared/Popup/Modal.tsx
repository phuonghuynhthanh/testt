import React, { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IoCloseOutline } from "react-icons/io5";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel: string;
}

// Render an accessible modal dialog portal with dark backdrop and refined surface boundaries.
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = "", ariaLabel }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // Capture the trigger before portal children can claim focus.
  if (isOpen && !previousFocusRef.current) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
  }

  // Move focus into the dialog and restore it when the dialog closes.
  useEffect(() => {
    if (isOpen) {
      const panel = panelRef.current;
      const firstControl = panel?.querySelector<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      );
      const preferredControl = panel?.querySelector<HTMLElement>("[data-autofocus]");
      (preferredControl ?? firstControl ?? panel)?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Close on Escape and keep keyboard focus inside the active dialog.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      ) ?? [],
    );
    if (!controls.length) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-h-[90vh] overflow-y-auto bg-surface-card bg-opacity-100 rounded-2xl shadow-2xl border border-surface-border text-content-primary ${className || "max-w-2xl p-6"}`}
        style={{ backgroundColor: "#1A1A1A" }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated/50 px-2 py-1.5 text-xs font-medium text-content-muted hover:bg-surface-elevated hover:text-content-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green"
          title="Đóng cửa sổ"
          aria-label="Đóng cửa sổ"
        >
          <IoCloseOutline className="w-5 h-5" />
          <span>Đóng</span>
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
