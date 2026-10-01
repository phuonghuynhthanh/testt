import type { ReactNode } from "react";

// Anchor page actions above the viewport bottom while leaving the sidebar accessible.
export const BottomActionBar = ({ children }: { children: ReactNode }) => (
  <div className="fixed bottom-4 left-4 right-4 z-30 sm:left-6 sm:right-6 lg:left-[17rem] lg:right-8">
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card/95 p-4 shadow-2xl backdrop-blur-md">
      {children}
    </div>
  </div>
);
