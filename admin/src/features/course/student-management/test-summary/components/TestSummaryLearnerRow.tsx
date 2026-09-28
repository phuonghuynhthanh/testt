import type { CourseUser } from "../../../../../data/courseData";
import {
  formatDateTime,
  getLearnerLabel,
} from "../../../../../utils/testSummaryUtils";

interface TestSummaryLearnerRowProps {
  learner: CourseUser;
}

// Render one row for the class-wide not-submitted learner table.
const TestSummaryLearnerRow = ({ learner }: TestSummaryLearnerRowProps) => (
  <tr className="border-b border-white/10 last:border-b-0">
    <td className="px-4 py-3">
      <p className="font-medium text-primary-white">{getLearnerLabel(learner)}</p>
      <p className="mt-1 text-xs text-primary-white/45">
        {learner.email || learner.id}
      </p>
    </td>
    <td className="px-4 py-3 text-primary-white/70">
      {formatDateTime(learner.last_login)}
    </td>
  </tr>
);

export default TestSummaryLearnerRow;
