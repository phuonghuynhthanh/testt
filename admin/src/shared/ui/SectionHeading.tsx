import React from "react";

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Render a card section header with a bottom divider, matching the design preview.
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-content-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default SectionHeading;
