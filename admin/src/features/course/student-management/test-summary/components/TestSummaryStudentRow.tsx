import type { ICourseTestSummaryStudent } from "../../../../../types/CourseTestSummary";
import {
  formatDateTime,
  formatScoreValue,
  getStudentLabel,
} from "../../../../../utils/testSummaryUtils";

interface TestSummaryStudentRowProps {
  student: ICourseTestSummaryStudent;
  timeValue?: string | null;
  scoreValue?: number | null;
  totalQuestions?: number | null;
}

// Render one row inside the scheduled or submitted student table.
const TestSummaryStudentRow = ({
  student,
  timeValue,
  scoreValue,
  totalQuestions,
}: TestSummaryStudentRowProps) => (
  <tr className="border-b border-white/10 last:border-b-0">
    <td className="px-4 py-3">
      <p className="font-medium text-primary-white">
        {getStudentLabel(student)}
      </p>
      <p className="mt-1 text-xs text-primary-white/45">
        {student.email || "--"}
      </p>
    </td>
    {scoreValue !== undefined && (
      <td className="px-4 py-3 text-primary-white/70">
        {formatScoreValue(scoreValue)}{totalQuestions ? ` / ${totalQuestions}` : ""}
      </td>
    )}
    <td className="px-4 py-3 text-primary-white/70">
      {formatDateTime(timeValue)}
    </td>
  </tr>
);

export default TestSummaryStudentRow;
