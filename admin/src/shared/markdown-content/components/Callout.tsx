import React from "react";

interface CalloutProps {
  children: React.ReactNode;
}

// Render highlighted callout blocks used by course markdown markers.
const Callout: React.FC<CalloutProps> = ({ children }) => (
  <div className="my-5 flex gap-3 rounded-xl border border-white/25 bg-white/5 px-5 py-4">
    <span className="mt-0.5 shrink-0 text-lg leading-none text-white">💡</span>
    <div className="text-[16px] leading-7 text-white/80">{children}</div>
  </div>
);

export default Callout;
