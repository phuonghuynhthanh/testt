import type { StudentStatus } from "../../../../data/courseData";

interface StatusBadgeProps {
  status?: StudentStatus | string | null;
}

const STATUS_CLASS_MAP: Record<string, string> = {
  ACTIVE: "border-primary-green/70 text-primary-green",
  COMPLETED: "border-primary-green/70 text-primary-green",
  PASSED: "border-primary-green/70 text-primary-green",
  FAILED: "border-red-400/70 text-red-300",
  SCHEDULED: "border-blue-300/70 text-blue-200",
  IN_PROGRESS: "border-yellow-300/70 text-yellow-200",
  SUBMITTED: "border-primary-green/70 text-primary-green",
  SUBMITED: "border-primary-green/70 text-primary-green",
  COMPLETED_LESSON: "border-primary-green/70 text-primary-green",
};

// Show a consistent status pill for student, lesson, and test states.
const StatusBadge = ({ status }: StatusBadgeProps) => {
  const displayStatus =
    typeof status === "string" && status.trim() ? status.trim() : "UNKNOWN";
  const normalizedStatus =
    displayStatus === "COMPLETED" ? "COMPLETED_LESSON" : displayStatus;
  const colorClass =
    STATUS_CLASS_MAP[normalizedStatus] ||
    "border-white/30 text-primary-white/70";

  return (
    <span
      className={`inline-flex w-fit rounded-none border bg-transparent px-3 py-1 text-xs font-bold uppercase tracking-[0.04em] ${colorClass}`}
    >
      {displayStatus.replace(/_/g, " ")}
    </span>
  );
};

export default StatusBadge;
