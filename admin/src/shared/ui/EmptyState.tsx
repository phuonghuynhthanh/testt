import React from "react";
import { FiInbox } from "react-icons/fi";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Render a placeholder state when a table or collection has no content to display.
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-surface-border bg-surface-card/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-content-muted mb-4 text-xl">
        {icon || <FiInbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-content-primary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-content-muted max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};

export default EmptyState;
