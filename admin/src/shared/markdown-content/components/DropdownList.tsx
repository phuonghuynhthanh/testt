import React, { useState } from "react";
import { nodeToText, parseListItem } from "../../../utils/courseMarkdownUtils";

interface DropdownListProps {
  items: React.ReactNode[];
}

// Render list-dropdown items as expandable FAQ-like rows.
const DropdownList: React.FC<DropdownListProps> = ({ items }) => {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set());

  // Toggle one dropdown row between collapsed and expanded states.
  const toggle = (index: number) => {
    setOpenIndexes((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <ul className="my-4 flex list-none flex-col gap-2 p-0">
      {items.map((item, index) => {
        const { title, description } = parseListItem(nodeToText(item));
        const isOpen = openIndexes.has(index);

        return (
          <li
            key={index}
            className="overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A]"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(index)}
              className={`flex min-h-[52px] w-full cursor-pointer select-none items-center justify-between px-4 py-3.5 text-left text-[15px] font-semibold transition-colors duration-150 ${
                isOpen
                  ? "text-[#00be73]"
                  : "text-white/90 hover:bg-white/5 active:bg-white/10"
              }`}
            >
              <span className="pr-3">{title}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-[#00be73]" : "text-white/30"
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[60vh]" : "max-h-0"}`}
            >
              {description && (
                <div className="max-h-[60vh] overflow-y-auto border-t border-white/5 px-4 pb-4 pt-3 text-[15px] leading-[1.75] text-white/60">
                  {description}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default DropdownList;
