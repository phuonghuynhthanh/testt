import React from "react";

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Render a consistent section heading divider for structured forms and setting panels.
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 mb-4 border-b border-surface-border">
      <div className="space-y-0.5">
        <h2 className="text-base sm:text-lg font-semibold text-content-primary">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-content-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default SectionHeading;
