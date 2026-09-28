import type { ICourseTestSummaryLesson } from "../../../../../types/CourseTestSummary";
import { getLessonTitle } from "../../../../../utils/testSummaryUtils";

interface TestSummaryLessonItemProps {
  lesson: ICourseTestSummaryLesson;
  isActive: boolean;
  onClick: (lessonId: string) => void;
}

// Render the quiz list item in the left column.
const TestSummaryLessonItem = ({
  lesson,
  isActive,
  onClick,
}: TestSummaryLessonItemProps) => (
  <button
    type="button"
    onClick={() => onClick(lesson.lesson_id)}
    className={[
      "w-full rounded-lg border px-4 py-4 text-left transition",
      isActive
        ? "border-primary-green/50 bg-primary-green/10"
        : "border-white/10 bg-primary-black-medium/60 hover:border-white/20 hover:bg-primary-black-medium",
    ].join(" ")}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary-white/45">
          Test {lesson.lesson_order ?? "--"}
        </p>
        <h3 className="mt-2 truncate text-base font-semibold text-primary-white">
          {getLessonTitle(lesson)}
        </h3>
        <p className="mt-1 truncate text-xs text-primary-white/45">
          {lesson.lesson_id}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {typeof lesson.total_questions === "number" && (
          <span className="rounded-full border border-primary-green/25 bg-primary-green/10 px-2.5 py-1 text-[11px] font-semibold text-primary-green">
            {lesson.total_questions} questions
          </span>
        )}
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-primary-white/70">
          {lesson.scheduled_count}/{lesson.submitted_count}
        </span>
      </div>
    </div>
  </button>
);

export default TestSummaryLessonItem;
