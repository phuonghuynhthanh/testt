import type { CourseStudentDetailResponse } from "../../../../data/courseData";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";
import DetailMetric from "./DetailMetric";
import {
  formatDateTime,
  formatDuration,
} from "../utils/studentManagementUtils";

interface StudentOverviewSectionProps {
  student: CourseStudentDetailResponse;
}

// Render the summary and profile cards for a single student.
const StudentOverviewSection = ({ student }: StudentOverviewSectionProps) => (
  <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
    <div className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={student.status} />
            <span className="rounded-none border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-primary-white/55">
              {student.course.title}
            </span>
          </div>
          <h2 className="mt-5 text-2xl font-semibold">{student.full_name}</h2>
          <p className="mt-1 text-sm text-primary-white/55">{student.email}</p>
        </div>
        <div className="min-w-[280px]">
          <ProgressBar value={student.progress_percent} label="Overall progress" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailMetric
          label="Lessons"
          value={`${student.completed_lessons}/${student.total_lessons}`}
          helper="completed lessons"
        />
        <DetailMetric
          label="Tests"
          value={`${student.completed_tests}/${student.total_tests}`}
          helper={`${student.test_summary.passed_tests} passed`}
        />
        <DetailMetric
          label="Average"
          value={student.test_summary.average_score}
          helper={`highest ${student.test_summary.highest_score}`}
        />
        <DetailMetric
          label="Study Time"
          value={formatDuration(
            student.progress_summary.total_time_spent_seconds,
          )}
          helper="total active time"
        />
      </div>
    </div>

    <aside className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-green">
          Profile
        </p>
        <h3 className="mt-2 text-xl font-semibold">Student Info</h3>
        <p className="mt-1 text-sm text-primary-white/45">
          Enrollment and contact
        </p>
      </div>
      <div className="mt-6 grid gap-4 text-sm">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="text-primary-white/50">Phone</span>
          <span className="text-right">{student.phone || "--"}</span>
        </div>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <span className="text-primary-white/50">Enrolled</span>
          <span className="text-right">
            {formatDateTime(student.enrolled_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-primary-white/50">Last login</span>
          <span className="text-right">
            {formatDateTime(student.last_login)}
          </span>
        </div>
      </div>
    </aside>
  </section>
);

export default StudentOverviewSection;
