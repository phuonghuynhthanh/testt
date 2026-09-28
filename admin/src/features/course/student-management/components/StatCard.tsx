import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
}

// Display one dashboard metric using the existing admin dark-card style.
const StatCard = ({ label, value, icon, helper }: StatCardProps) => (
  <div className="group rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 transition duration-200 hover:border-primary-green/45">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-white/45">
          {label}
        </p>
        <p className="mt-3 text-3xl font-semibold text-primary-white">
          {value}
        </p>
        {helper && (
          <p className="mt-2 text-sm text-primary-white/45">{helper}</p>
        )}
      </div>
      {icon && (
        <div className="text-lg text-primary-green opacity-70 transition group-hover:opacity-100">
          {icon}
        </div>
      )}
    </div>
  </div>
);

export default StatCard;
