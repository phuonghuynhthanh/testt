import React from "react";
import { Tray } from "@phosphor-icons/react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="empty py-14 px-4 text-center">
      <div className="ic inline-grid place-items-center w-11 h-11 rounded-lg border border-surface-border bg-surface-elevated text-content-muted text-xl mx-auto">
        {icon || <Tray size={22} weight="light" />}
      </div>
      <h3 className="mt-3.5 text-[15px] font-semibold text-content-primary">
        {title}
      </h3>
      {description && (
        <p className="mt-1 mb-4 mx-auto max-w-sm text-[13px] text-content-muted leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
