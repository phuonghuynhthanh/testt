import type { ReactNode } from "react";

// Render the editor action bar pinned under the top bar so it never covers the editing area.
export const BottomActionBar = ({ children }: { children: ReactNode }) => {
  return (
    <div className="sticky top-14 z-20 -mt-2 flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-base/90 px-4 py-2.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
};
