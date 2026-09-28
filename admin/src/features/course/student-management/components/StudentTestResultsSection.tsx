import type { CourseStudentDetailResponse, CourseTrack } from "../../../../data/courseData";
import StatusBadge from "./StatusBadge";
import AssignmentTrackTimeline from "./AssignmentTrackTimeline";
import {
  formatDateTime,
  getTestDisplayStatus,
} from "../utils/studentManagementUtils";

interface StudentTestResultsSectionProps {
  student: CourseStudentDetailResponse;
  tracksByLessonId?: Record<string, CourseTrack[]>;
  isTracksLoading: boolean;
}

// Render the assignment result table and track timeline cells.
const StudentTestResultsSection = ({
  student,
  tracksByLessonId,
  isTracksLoading,
}: StudentTestResultsSectionProps) => (
  <section className="rounded-lg border border-white/15 bg-primary-black-light px-6 py-7">
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-xl font-semibold">Test Results</h2>
        <p className="mt-1 text-sm text-primary-white/50">
          Assignment attempts, score, schedule, and feedback.
        </p>
      </div>
      <span className="text-sm text-primary-white/55">
        Avg {student.test_summary.average_score} / 100
      </span>
    </div>

    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-gray-800 text-primary-white">
          <tr>
            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
              Test
            </th>
            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
              Status
            </th>
            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
              Score
            </th>
            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
              Attempts
            </th>
            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
              Activity
            </th>
            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
              Submitted
            </th>
            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/60">
              Feedback
            </th>
          </tr>
        </thead>
        <tbody>
          {student.test_results.map((test) => (
            <tr
              key={test.attempt_id}
              className="border-b border-white/10 transition hover:bg-primary-green/5"
            >
              <td className="px-4 py-5">
                <p className="font-medium text-primary-white">
                  {test.lesson_title}
                </p>
                <p className="mt-1 text-xs text-primary-white/45">
                  {test.chapter_title}
                </p>
              </td>
              <td className="px-4 py-5">
                <StatusBadge
                  status={getTestDisplayStatus(test.status, test.submitted_at)}
                />
              </td>
              <td className="px-4 py-5 text-primary-white">{test.score}/ 10</td>
              <td className="px-4 py-5 text-primary-white/70">
                {test.attempt_count}
              </td>
              <td className="px-4 py-5">
                <AssignmentTrackTimeline
                  tracks={tracksByLessonId?.[test.lesson_id]}
                  isLoading={isTracksLoading}
                />
              </td>
              <td className="px-4 py-5 text-primary-white/65">
                {formatDateTime(test.submitted_at)}
              </td>
              <td className="max-w-[260px] px-4 py-5 text-primary-white/60">
                {test.feedback || "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default StudentTestResultsSection;
