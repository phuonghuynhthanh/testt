import { FiArrowLeft } from "react-icons/fi";

import type { CourseViewMode } from "../../../../types/Course";

interface CourseManagementHeaderProps {
  viewMode: CourseViewMode;
  onBackToList: () => void;
}

// Render the top-level course admin header and list back action.
const CourseManagementHeader = ({
  viewMode,
  onBackToList,
}: CourseManagementHeaderProps) => (
  <div className="rounded-lg border border-white/15 bg-primary-black-light p-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-green">
          Course Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Course Management</h1>
        <p className="mt-1 max-w-2xl text-sm text-primary-white/55">
          Manage the course from a clean list first, then open a focused detail
          workspace for editing.
        </p>
      </div>
      {viewMode === "detail" && (
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 hover:border-primary-green hover:text-primary-green"
          onClick={onBackToList}
        >
          <FiArrowLeft />
          Back to list
        </button>
      )}
    </div>
  </div>
);

export default CourseManagementHeader;
