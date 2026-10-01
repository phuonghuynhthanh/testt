import React, { useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

interface RawApiResponseAccordionProps {
  data: unknown;
}

// Render collapsible developer accordion showing formatted raw backend JSON responses.
export const RawApiResponseAccordion: React.FC<RawApiResponseAccordionProps> = ({
  data,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3.5">
        <span className="text-xs font-medium text-content-secondary">Phản hồi thô của API</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Thu gọn phản hồi API" : "Mở phản hồi API"}
          aria-label={isOpen ? "Thu gọn phản hồi API" : "Mở phản hồi API"}
          className="inline-flex size-7 items-center justify-center rounded-md text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
        >
          {isOpen ? <FiChevronDown className="text-sm" /> : <FiChevronRight className="text-sm" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-surface-border p-4 bg-surface-elevated/50 overflow-x-auto">
          <pre className="text-[11px] font-mono text-content-secondary leading-relaxed max-h-64 overflow-y-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default RawApiResponseAccordion;
