import { useMemo } from "react";

import type { CourseUser } from "../../../../../data/courseData";
import type { ICourseTestSummaryLesson } from "../../../../../types/CourseTestSummary";
import TestSummaryClassFilters from "./TestSummaryClassFilters";
import TestSummaryPeopleTable from "./TestSummaryPeopleTable";
import TestSummaryLearnerRow from "./TestSummaryLearnerRow";
import {
  getNotSubmittedLearners,
  getLessonTitle,
} from "../../../../../utils/testSummaryUtils";
import type { ClassFilterState, LessonTab } from "../testSummaryTypes";

interface TestSummaryLessonDetailProps {
  lesson: ICourseTestSummaryLesson;
  activeTab: LessonTab;
  onChangeTab: (tab: LessonTab) => void;
  classLearners: CourseUser[];
  classFilters: ClassFilterState;
  onChangeClassFilters: (nextValue: ClassFilterState) => void;
}

// Render the active quiz detail panel on the right side.
const TestSummaryLessonDetail = ({
  lesson,
  activeTab,
  onChangeTab,
  classLearners,
  classFilters,
  onChangeClassFilters,
}: TestSummaryLessonDetailProps) => {
  const scheduledItems = useMemo(
    () => lesson.scheduled_students ?? [],
    [lesson.scheduled_students],
  );
  const submittedItems = useMemo(
    () => lesson.submitted_students ?? [],
    [lesson.submitted_students],
  );
  const notSubmittedItems = useMemo(
    () => getNotSubmittedLearners(classLearners, scheduledItems, submittedItems),
    [classLearners, scheduledItems, submittedItems],
  );

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-white/15 bg-primary-black-light px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:px-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-green">
            Test {lesson.lesson_order ?? "--"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-primary-white">
            {getLessonTitle(lesson)}
          </h3>
          <p className="mt-1 text-sm text-primary-white/45">{lesson.lesson_id}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[260px] lg:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-primary-black-medium px-4 py-3">
            <p className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
              Questions
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary-white">
              {lesson.total_questions ?? "--"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-primary-black-medium px-4 py-3">
            <p className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
              Scheduled
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary-white">
              {lesson.scheduled_count}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-primary-black-medium px-4 py-3">
            <p className="text-xs uppercase tracking-[0.12em] text-primary-white/50">
              Submitted
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary-white">
              {lesson.submitted_count}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2 rounded-lg border border-white/10 bg-primary-black-medium/60 p-1">
        <button
          type="button"
          className={[
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition",
            activeTab === "scheduled"
              ? "bg-primary-green text-primary-black"
              : "text-primary-white/65 hover:text-primary-white",
          ].join(" ")}
          onClick={() => onChangeTab("scheduled")}
        >
          Scheduled ({scheduledItems.length})
        </button>
        <button
          type="button"
          className={[
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition",
            activeTab === "submitted"
              ? "bg-primary-green text-primary-black"
              : "text-primary-white/65 hover:text-primary-white",
          ].join(" ")}
          onClick={() => onChangeTab("submitted")}
        >
          Submitted ({submittedItems.length})
        </button>
        <button
          type="button"
          className={[
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition",
            activeTab === "not_submitted"
              ? "bg-primary-green text-primary-black"
              : "text-primary-white/65 hover:text-primary-white",
          ].join(" ")}
          onClick={() => onChangeTab("not_submitted")}
        >
          Not submitted ({notSubmittedItems.length})
        </button>
      </div>

      {activeTab === "not_submitted" && (
        <TestSummaryClassFilters
          value={classFilters}
          onChange={onChangeClassFilters}
        />
      )}

      <div className="mt-4 flex-1 min-h-0">
        {activeTab === "not_submitted" ? (
          <div className="flex h-full min-h-0 flex-col rounded-lg border border-white/10 bg-primary-black-medium/60">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h4 className="text-sm font-semibold text-primary-white">
                Not submitted students
              </h4>
              <span className="text-xs text-primary-white/50">
                {notSubmittedItems.length} people
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-primary-black-medium text-primary-white">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/55">
                      Student
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary-white/55">
                      Last Login
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {notSubmittedItems.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-5 text-sm text-primary-white/45"
                        colSpan={4}
                      >
                        No learners matched the selected class filter.
                      </td>
                    </tr>
                  )}
                  {notSubmittedItems.map((learner) => (
                    <TestSummaryLearnerRow
                      key={learner.id}
                      learner={learner}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <TestSummaryPeopleTable
            title={
              activeTab === "scheduled"
                ? "Scheduled students"
                : "Submitted students"
            }
            items={activeTab === "scheduled" ? scheduledItems : submittedItems}
            variant={activeTab === "scheduled" ? "scheduled" : "submitted"}
            getTimeValue={(student) =>
              activeTab === "scheduled"
                ? student.scheduled_at
                : student.submitted_at
            }
            totalQuestions={lesson.total_questions}
          />
        )}
      </div>
    </section>
  );
};

export default TestSummaryLessonDetail;
