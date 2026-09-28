import React, { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IoCloseOutline } from "react-icons/io5";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-full bg-primary-black-medium bg-opacity-50"
      onClick={(event) => {
        onClose();
        event.stopPropagation();
      }}
    >
      <div className="relative w-[75vw] h-max max-h-[95dvh] overflow-hidden p-4 bg-primary-black rounded-3xl shadow border border-primary-blue-lighter">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 flex justify-center items-center"
        >
          <IoCloseOutline className="h-10 w-auto text-primary-blue-lighter" />
        </button>
        <div
          className="p-4 md:p-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body, // Portal to render modal outside of the main DOM structure
  );
};

export default Modal;
