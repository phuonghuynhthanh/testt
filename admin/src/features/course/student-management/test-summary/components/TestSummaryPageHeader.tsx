import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";

interface TestSummaryPageHeaderProps {
  courseId?: string | null;
  onBack: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

// Render the top page header and action buttons for test summary.
const TestSummaryPageHeader = ({
  courseId,
  onBack,
  onRefresh,
  isRefreshing,
}: TestSummaryPageHeaderProps) => (
  <section className="rounded-lg border border-white/10 bg-primary-black-light px-6 py-7 md:px-7">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-green">
          Course Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-primary-white">
          Test Summary
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-primary-white/55">
          Overview of scheduled and submitted students for each test, with
          timestamps and student lists.
        </p>
        <p className="mt-3 text-xs text-primary-white/45">
          Course: {courseId || "--"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 hover:border-primary-green hover:text-primary-green"
          onClick={onBack}
        >
          <FiArrowLeft />
          Back to students
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 hover:border-primary-green hover:text-primary-green"
          onClick={onRefresh}
        >
          <FiRefreshCw className={isRefreshing ? "animate-spin" : ""} />
          Refresh data
        </button>
      </div>
    </div>
  </section>
);

export default TestSummaryPageHeader;
