import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PreviewImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

// Render clickable markdown images with fullscreen preview modal.
const PreviewImage: React.FC<PreviewImageProps> = ({ src, alt, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Delay portal usage until component is mounted on client.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Lock body scroll while preview dialog is open.
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!src) return null;

  const previewOverlay =
    isMounted && isOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-8"
            onClick={() => setIsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={alt || "Image preview"}
          >
            <div
              className="relative flex max-h-full w-full max-w-6xl flex-col items-center"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mb-3 min-h-11 self-end rounded-full border border-white/15 bg-black/60 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white sm:mb-4"
              >
                Close
              </button>
              <img
                src={src}
                alt={alt || ""}
                className="max-h-[78vh] w-auto max-w-full object-contain shadow-2xl sm:max-h-[85vh]"
              />
              {alt && (
                <p className="mt-3 px-2 text-center text-xs text-white/70 sm:text-sm">
                  {alt}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <figure className="my-6 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative inline-block max-w-full cursor-zoom-in overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00be73]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={alt ? `Preview image: ${alt}` : "Preview image"}
        >
          <img
            src={src}
            alt={alt || ""}
            loading="lazy"
            className={`${
              className ||
              "max-w-full rounded-xl border border-white/10 shadow-xl"
            } block h-auto max-w-full transition duration-300 ease-out group-hover:scale-[1.02] group-hover:brightness-110 group-active:scale-[0.99]`}
          />
          <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/0 transition duration-300 group-hover:ring-white/15" />
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/80 opacity-0 transition duration-300 group-hover:opacity-100 sm:text-xs">
            Tap to preview
          </span>
        </button>
        {alt && (
          <figcaption className="mt-2 px-2 text-center text-xs italic tracking-wide text-white/40">
            {alt}
          </figcaption>
        )}
      </figure>
      {previewOverlay}
    </>
  );
};

export default PreviewImage;
