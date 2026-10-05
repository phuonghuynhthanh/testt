import React from "react";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

// Render the standard page title block with optional description and actions.
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
}) => {
  return (
    <div className="page-h">
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
