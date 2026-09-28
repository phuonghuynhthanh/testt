import React from "react";
import { nodeToText } from "../../../utils/courseMarkdownUtils";

interface StepListProps {
  items: React.ReactNode[];
}

// Render step-list items with numbered badges.
const StepList: React.FC<StepListProps> = ({ items }) => (
  <ol className="counter-reset-steps my-4 list-none space-y-3 p-0">
    {items.map((item, index) => {
      const text = nodeToText(item);
      return (
        <li
          key={index}
          className="flex items-start gap-3 text-base leading-[1.8] text-white/75 sm:text-[17px]"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-primary-green/20 bg-primary-green/10 text-sm font-semibold text-primary-green">
            {index + 1}
          </span>
          <span className="flex-1 pt-0.5">{text}</span>
        </li>
      );
    })}
  </ol>
);

export default StepList;
