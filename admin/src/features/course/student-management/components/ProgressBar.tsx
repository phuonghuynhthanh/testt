interface ProgressBarProps {
  value: number;
  label?: string;
}

// Render a compact progress meter for course and chapter completion.
const ProgressBar = ({ value, label }: ProgressBarProps) => {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-primary-white/60">
        <span>{label || "Progress"}</span>
        <span className="font-medium text-primary-white">
          {normalizedValue}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary-black-medium">
        <div
          className="h-full rounded-full bg-primary-green transition-all duration-500"
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
