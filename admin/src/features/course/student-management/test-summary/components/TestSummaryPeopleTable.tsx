import type { ICourseTestSummaryStudent } from "../../../../../types/CourseTestSummary";
import TestSummaryStudentRow from "./TestSummaryStudentRow";

interface TestSummaryPeopleTableProps {
  title: string;
  items: ICourseTestSummaryStudent[];
  variant: "scheduled" | "submitted";
  getTimeValue: (
    student: ICourseTestSummaryStudent,
  ) => string | null | undefined;
  totalQuestions?: number | null;
}

// Render one table for scheduled or submitted students.
const TestSummaryPeopleTable = ({
  title,
  items,
  variant,
  getTimeValue,
  totalQuestions,
}: TestSummaryPeopleTableProps) => (
  <div className="flex h-full min-h-0 flex-col rounded-lg border border-white/10 bg-primary-black-medium/60">
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <h4 className="text-sm font-semibold text-primary-white">{title}</h4>
      <span className="text-xs text-primary-white/50">{items.length} people</span>
    </div>
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-primary-black-medium text-primary-white">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/55">
              Student
            </th>
            {variant === "submitted" && (
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/55">
                Score
              </th>
            )}
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/55">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                className="px-4 py-5 text-sm text-primary-white/45"
                colSpan={variant === "submitted" ? 3 : 2}
              >
                No data available.
              </td>
            </tr>
          )}
          {items.map((student) => (
            <TestSummaryStudentRow
              key={`${title}-${student.student_id}-${getTimeValue(student) || ""}`}
              student={student}
              timeValue={getTimeValue(student)}
              scoreValue={variant === "submitted" ? student.score : undefined}
              totalQuestions={variant === "submitted" ? totalQuestions : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default TestSummaryPeopleTable;
