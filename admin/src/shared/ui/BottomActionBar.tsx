import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BottomActionHostContext } from "./BottomActionHostContext";

// Anchor page actions above the viewport bottom while leaving the sidebar accessible.
export const BottomActionBar = ({ children }: { children: ReactNode }) => {
  const host = useContext(BottomActionHostContext);
  if (!host) return null;
  return createPortal(
    <div className="pointer-events-auto mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card/95 p-4 shadow-2xl backdrop-blur-md">
      {children}
    </div>, host,
  );
};
