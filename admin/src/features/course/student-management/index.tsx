import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiArrowUpRight,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";

import type { CourseStudent, StudentStatus } from "../../../data/courseData";
import {
  getCourseStudents,
  getCourseStudentSummary,
} from "../../../services/course/handleCourse";
import CourseAdminAuthGate from "../components/CourseAdminAuthGate";
import ProgressBar from "./components/ProgressBar";
import StatCard from "./components/StatCard";
import StatusBadge from "./components/StatusBadge";

const STATUS_FILTERS: Array<StudentStatus | "ALL"> = [
  "ALL",
  "ACTIVE",
  "COMPLETED",
];
const PAGE_SIZE = 10;
type StudentSortKey =
  | "student"
  | "status"
  | "progress"
  | "averageScore"
  | "lastActive";
type SortDirection = "asc" | "desc";

interface SortState {
  key: StudentSortKey;
  direction: SortDirection;
}

interface SortableTableHeaderProps {
  label: string;
  sortKey: StudentSortKey;
  sortState: SortState;
  onSort: (sortKey: StudentSortKey) => void;
}

// Format ISO dates into a concise admin-friendly display.
const formatDateTime = (value?: string) => {
  if (!value) return "--";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

// Convert nullable strings into stable lowercase values for sorting.
const normalizeSortText = (value?: string | null) =>
  (value || "").trim().toLowerCase();

// Convert date strings into timestamps while pushing empty dates to the bottom.
const getSortDateValue = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsedTime = new Date(value).getTime();
  return Number.isNaN(parsedTime) ? Number.POSITIVE_INFINITY : parsedTime;
};

// Resolve the comparable value for one sortable student column.
const getStudentSortValue = (
  student: CourseStudent,
  sortKey: StudentSortKey,
) => {
  switch (sortKey) {
    case "student":
      return normalizeSortText(`${student.full_name} ${student.email}`);
    case "status":
      return normalizeSortText(student.status);
    case "progress":
      return student.progress_percent;
    case "averageScore":
      return student.average_score;
    case "lastActive":
      return getSortDateValue(student.last_login);
    default:
      return "";
  }
};

// Compare two student rows using the current table sort state.
const compareStudentsBySortState = (
  firstStudent: CourseStudent,
  secondStudent: CourseStudent,
  sortState: SortState,
) => {
  const firstValue = getStudentSortValue(firstStudent, sortState.key);
  const secondValue = getStudentSortValue(secondStudent, sortState.key);
  const sortMultiplier = sortState.direction === "asc" ? 1 : -1;

  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return (firstValue - secondValue) * sortMultiplier;
  }

  return String(firstValue).localeCompare(String(secondValue)) * sortMultiplier;
};

// Render one clickable table header with current sort direction.
const SortableTableHeader = ({
  label,
  sortKey,
  sortState,
  onSort,
}: SortableTableHeaderProps) => {
  const isActive = sortState.key === sortKey;
  const SortIcon =
    isActive && sortState.direction === "desc" ? FiChevronDown : FiChevronUp;

  return (
    <th
      aria-sort={
        isActive
          ? sortState.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60"
    >
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-left uppercase tracking-[0.12em] transition hover:text-primary-green"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <SortIcon
          className={`text-sm transition ${
            isActive ? "text-primary-green" : "text-primary-white/25"
          }`}
        />
      </button>
    </th>
  );
};

// Render one table row for the student list.
const StudentRow = ({
  student,
  onSelect,
}: {
  student: CourseStudent;
  onSelect: (studentId: string) => void;
}) => (
  <tr
    className="group cursor-pointer border-b border-white/10 transition duration-200 hover:bg-primary-green/5"
    onClick={() => onSelect(student.id)}
  >
    <td className="px-4 py-5">
      <div>
        <p className="font-semibold text-primary-white">{student.full_name}</p>
        <p className="mt-1 text-xs text-primary-white/50">{student.email}</p>
      </div>
    </td>
    <td className="px-4 py-5">
      <StatusBadge status={student.status} />
    </td>
    <td className="min-w-52 px-4 py-5">
      <ProgressBar
        value={student.progress_percent}
        label={`${student.completed_lessons}/${student.total_lessons} lessons`}
      />
    </td>
    <td className="px-4 py-5 text-primary-white">
      {student.average_score || "--"}
    </td>
    <td className="px-4 py-5 text-primary-white/70">
      {formatDateTime(student.last_login)}
    </td>
    <td className="px-4 py-5">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-green opacity-70 transition group-hover:opacity-100">
        Detail
        <FiArrowUpRight />
      </span>
    </td>
  </tr>
);

// Render the student management dashboard and list workflow.
const StudentManagementContent = ({ courseToken }: { courseToken: string }) => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StudentStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState>({
    key: "student",
    direction: "asc",
  });

  const studentsQuery = useQuery({
    queryKey: ["course-students", courseToken, keyword, status, page],
    queryFn: () =>
      getCourseStudents(
        { keyword, status, page, limit: PAGE_SIZE },
        courseToken,
      ),
  });

  const summaryQuery = useQuery({
    queryKey: ["course-student-summary", courseToken],
    queryFn: () => getCourseStudentSummary(courseToken),
  });

  const students = studentsQuery.data?.data || [];
  const pagination = studentsQuery.data?.pagination;
  const summary = summaryQuery.data;

  // Sort the current student page by the selected table column.
  const sortedStudents = useMemo(
    () =>
      [...students].sort((firstStudent, secondStudent) =>
        compareStudentsBySortState(firstStudent, secondStudent, sortState),
      ),
    [students, sortState],
  );

  // Reset pagination when filter inputs change.
  useEffect(() => {
    setPage(1);
  }, [keyword, status]);

  const isLoading = studentsQuery.isLoading || summaryQuery.isLoading;
  const canGoPrevious = page > 1;
  const canGoNext = pagination ? page < pagination.total_pages : false;

  const attentionLabel = useMemo(() => {
    if (!summary) return "Need review";
    return `${summary.students_need_attention} need review`;
  }, [summary]);

  // Navigate to the dedicated student detail workspace.
  const handleOpenStudentDetail = (studentId: string) => {
    navigate(`/course/student-management/${studentId}`);
  };

  // Toggle sort direction when clicking the active column, otherwise sort ascending.
  const handleSortChange = (sortKey: StudentSortKey) => {
    setSortState((currentSortState) => {
      if (currentSortState.key !== sortKey) {
        return { key: sortKey, direction: "asc" };
      }

      return {
        key: sortKey,
        direction: currentSortState.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  // Render the student management dashboard content.
  return (
    <div className="flex flex-col gap-6 pb-10 text-primary-white">
      <div className="rounded-lg border border-white/10 bg-primary-black-light px-6 py-7 md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-green">
              Course Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-primary-white">
              Student Management
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-primary-white/55">
              Track learning progress, assignment status, and test performance
              for the current course.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 hover:border-primary-green hover:text-primary-green"
            onClick={() => {
              studentsQuery.refetch();
              summaryQuery.refetch();
            }}
          >
            <FiRefreshCw />
            Refresh data
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={summary?.total_students ?? "--"}
          helper={`${summary?.active_students ?? 0} active`}
        />
        <StatCard
          label="Average Progress"
          value={summary ? `${summary.average_progress_percent}%` : "--"}
          helper={`${summary?.total_lessons ?? 0} lessons`}
        />
        <StatCard
          label="Average Score"
          value={summary ? summary.average_score : "--"}
          helper={`${summary?.total_tests ?? 0} tests`}
        />
        <StatCard
          label="Attention"
          value={summary?.students_need_attention ?? "--"}
          helper={attentionLabel}
        />
      </div>

      <div>
        <section className="rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Students</h2>
              <p className="mt-1 text-sm text-primary-white/50">
                Search, filter, and open a dedicated detail page for progress
                review.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex min-w-64 items-center gap-2 rounded-md border border-white/20 bg-primary-black-medium px-3 py-3 text-primary-white focus-within:border-primary-green">
                <FiSearch className="shrink-0 text-primary-white/55" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-primary-white/35"
                  value={keyword}
                  placeholder="Search by name, email, phone"
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
              <select
                className="rounded-md border border-white/20 bg-primary-black-medium px-3 py-3 text-sm text-primary-white outline-none focus:border-primary-green"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StudentStatus | "ALL")
                }
              >
                {STATUS_FILTERS.map((item) => (
                  <option key={item} value={item}>
                    {item === "ALL" ? "All status" : item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[860px] table-auto text-left text-sm">
              <thead className="bg-primary-black-medium text-primary-white">
                <tr>
                  <SortableTableHeader
                    label="Student"
                    sortKey="student"
                    sortState={sortState}
                    onSort={handleSortChange}
                  />
                  <SortableTableHeader
                    label="Status"
                    sortKey="status"
                    sortState={sortState}
                    onSort={handleSortChange}
                  />
                  <SortableTableHeader
                    label="Progress"
                    sortKey="progress"
                    sortState={sortState}
                    onSort={handleSortChange}
                  />
                  <SortableTableHeader
                    label="Avg Score"
                    sortKey="averageScore"
                    sortState={sortState}
                    onSort={handleSortChange}
                  />
                  <SortableTableHeader
                    label="Last Active"
                    sortKey="lastActive"
                    sortState={sortState}
                    onSort={handleSortChange}
                  />
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onSelect={handleOpenStudentDetail}
                  />
                ))}
              </tbody>
            </table>
            {!isLoading && students.length === 0 && (
              <div className="p-8 text-center text-sm text-primary-white/55">
                No students matched the current filter.
              </div>
            )}
            {isLoading && (
              <div className="p-8 text-center text-sm text-primary-white/55">
                Loading students...
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-primary-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {pagination?.page ?? 1} / {pagination?.total_pages ?? 1} -{" "}
              {pagination?.total ?? 0} students
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-white/20 px-3 py-1.5 text-primary-white/80 hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canGoPrevious}
                onClick={() =>
                  setPage((currentPage) => Math.max(1, currentPage - 1))
                }
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-md border border-white/20 px-3 py-1.5 text-primary-white/80 hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canGoNext}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// Wrap student management with the dedicated course-admin auth popup.
const StudentManagement = () => (
  <CourseAdminAuthGate>
    {(courseToken) => <StudentManagementContent courseToken={courseToken} />}
  </CourseAdminAuthGate>
);

export default StudentManagement;
