import React, { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = "", ariaLabel }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  if (isOpen && !previousFocusRef.current) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
  }

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm transition-opacity"
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
        className={`pop-in relative w-full max-h-[90vh] overflow-y-auto bg-surface-card rounded-xl border border-surface-border text-content-primary shadow-2xl ${className || "max-w-2xl p-6"}`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="ib absolute top-3.5 right-3.5 text-content-muted hover:text-content-primary hover:bg-surface-elevated"
          title="Đóng cửa sổ"
          aria-label="Đóng cửa sổ"
        >
          <X size={18} weight="light" />
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
