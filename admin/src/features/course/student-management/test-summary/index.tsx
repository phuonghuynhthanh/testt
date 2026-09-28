import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { PATH } from "../../../../app/store";
import { getCourseUsers } from "../../../../services/course/handleCourse";
import { getCourseTestSummary } from "../../../../services/course/handleQuiz";
import CourseAdminAuthGate from "../../components/CourseAdminAuthGate";
import type {
  ClassFilterState,
  LessonTab,
} from "./testSummaryTypes";
import {
  filterClassLearners,
} from "../../../../utils/testSummaryUtils";
import TestSummaryPageHeader from "./components/TestSummaryPageHeader";
import TestSummaryStats from "./components/TestSummaryStats";
import TestSummaryLessonItem from "./components/TestSummaryLessonItem";
import TestSummaryLessonDetail from "./components/TestSummaryLessonDetail";

// Render the dedicated test summary workspace.
interface TestSummaryContentProps {
  courseToken: string;
}

// Render the dedicated test summary workspace.
const TestSummaryContent = ({ courseToken }: TestSummaryContentProps) => {
  const navigate = useNavigate();
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [activeTab, setActiveTab] = useState<LessonTab>("scheduled");
  const [classFilters, setClassFilters] = useState<ClassFilterState>({
    package: "ALL",
    registrationFrom: "",
    registrationTo: "",
  });

  const summaryQuery = useQuery({
    queryKey: ["course-test-summary", courseToken],
    queryFn: () => getCourseTestSummary(courseToken),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery({
    queryKey: ["course-users", courseToken],
    queryFn: () => getCourseUsers(courseToken),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const summary = summaryQuery.data;
  const lessonsSource = summary?.tests;
  const usersSource = usersQuery.data;
  const lessons = useMemo(() => lessonsSource ?? [], [lessonsSource]);
  const learners = useMemo(() => usersSource ?? [], [usersSource]);
  const isLoading = summaryQuery.isLoading || usersQuery.isLoading;

  // Aggregate the totals used by the top summary cards.
  const totals = useMemo(() => {
    return lessons.reduce(
      (accumulator, lesson) => ({
        questions: accumulator.questions + (lesson.total_questions || 0),
        scheduled: accumulator.scheduled + (lesson.scheduled_count || 0),
        submitted: accumulator.submitted + (lesson.submitted_count || 0),
      }),
      { questions: 0, scheduled: 0, submitted: 0 },
    );
  }, [lessons]);

  // Filter enrolled learners into the current class range.
  const classLearners = useMemo(
    () => filterClassLearners(learners, classFilters),
    [classFilters, learners],
  );

  // Keep the selected lesson in sync with the fetched data.
  useEffect(() => {
    if (!lessons.length) {
      setSelectedLessonId("");
      setActiveTab("scheduled");
      return;
    }

    if (
      !selectedLessonId ||
      !lessons.some((lesson) => lesson.lesson_id === selectedLessonId)
    ) {
      setSelectedLessonId(lessons[0].lesson_id);
      setActiveTab("scheduled");
    }
  }, [lessons, selectedLessonId]);

  const selectedLesson = useMemo(
    () =>
      lessons.find((lesson) => lesson.lesson_id === selectedLessonId) ||
      lessons[0] ||
      null,
    [lessons, selectedLessonId],
  );

  // Return to the main student management page.
  const handleBack = () => {
    navigate(PATH.STUDENT_MANAGEMENT);
  };

  // Refresh both summary sources together.
  const handleRefresh = () => {
    summaryQuery.refetch();
    usersQuery.refetch();
  };

  return (
    <div className="flex flex-col gap-6 pb-10 text-primary-white">
      <TestSummaryPageHeader
        courseId={summary?.course_id}
        onBack={handleBack}
        onRefresh={handleRefresh}
        isRefreshing={summaryQuery.isFetching || usersQuery.isFetching}
      />

      <TestSummaryStats
        totalTests={summary?.total_tests ?? "--"}
        totalQuestions={totals.questions}
        scheduledTotal={totals.scheduled}
        submittedTotal={totals.submitted}
      />

      <section className="grid min-h-[70vh] gap-5 lg:grid-cols-[1fr_2fr] lg:items-stretch">
        {isLoading && (
          <>
            <div className="h-full rounded-lg border border-white/15 bg-primary-black-light p-6 text-center text-sm text-primary-white/55">
              Loading test summary...
            </div>
            <div className="h-full rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
              Loading test summary...
            </div>
          </>
        )}

        {!isLoading && !summary && (
          <div className="h-full rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55 lg:col-span-2">
            Test summary is not available.
          </div>
        )}

        {!isLoading && summary && (
          <>
            <aside className="flex h-full min-h-0 flex-col rounded-lg border border-white/15 bg-primary-black-light px-4 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-primary-white">
                  Quiz list
                </h2>
                <p className="mt-1 text-sm text-primary-white/45">
                  Select a quiz to view the scheduled and submitted students.
                </p>
              </div>

              <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto pr-1">
                {lessons.map((lesson) => (
                  <TestSummaryLessonItem
                    key={lesson.lesson_id}
                    lesson={lesson}
                    isActive={selectedLesson?.lesson_id === lesson.lesson_id}
                    onClick={setSelectedLessonId}
                  />
                ))}
              </div>
            </aside>

            <div className="min-w-0 h-full">
              {selectedLesson ? (
                <TestSummaryLessonDetail
                  lesson={selectedLesson}
                  activeTab={activeTab}
                  onChangeTab={setActiveTab}
                  classLearners={classLearners}
                  classFilters={classFilters}
                  onChangeClassFilters={setClassFilters}
                />
              ) : (
                <div className="rounded-lg border border-white/15 bg-primary-black-light p-8 text-center text-sm text-primary-white/55">
                  No quiz selected.
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

// Wrap test summary with the dedicated course-admin auth popup.
const TestSummary = () => (
  <CourseAdminAuthGate>
    {(courseToken) => <TestSummaryContent courseToken={courseToken} />}
  </CourseAdminAuthGate>
);

export default TestSummary;
