import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// Render the fixed full-width action bar used by the editor pages, as in the design preview.
export const BottomActionBar = ({ children }: { children: ReactNode }) => {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-border bg-surface-base/85 backdrop-blur-xl lg:left-[232px]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {children}
      </div>
    </div>,
    document.body,
  );
};
