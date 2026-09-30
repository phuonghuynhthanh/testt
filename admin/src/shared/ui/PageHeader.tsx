import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

// Render the standard page header containing title, description, and primary action controls.
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-6 border-b border-surface-border ${className}`}
    >
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-content-primary">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-content-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
