import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";

interface StudentDetailHeaderProps {
  studentName?: string;
  isRefreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
}

// Render the hero header and page-level actions for student detail.
const StudentDetailHeader = ({
  studentName,
  isRefreshing,
  onBack,
  onRefresh,
}: StudentDetailHeaderProps) => (
  <div className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-7">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <button
          type="button"
          className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-primary-white/75 transition hover:border-primary-green hover:text-primary-green"
          onClick={onBack}
        >
          <FiArrowLeft />
          Back to students
        </button>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-green">
          Student Detail
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-primary-white md:text-4xl">
          {studentName || "Loading student..."}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-primary-white/55">
          Full progress workspace with chapter completion, lesson activity, and
          assignment results.
        </p>
      </div>
      <button
        type="button"
        className="inline-flex w-fit items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 transition hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <FiRefreshCw className={isRefreshing ? "animate-spin" : ""} />
        Refresh detail
      </button>
    </div>
  </div>
);

export default StudentDetailHeader;
