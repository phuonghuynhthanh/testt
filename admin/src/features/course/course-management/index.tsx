import CourseAdminAuthGate from "../components/CourseAdminAuthGate";
import { useCourseManagement } from "../../../hook/useCourse";
import CourseContentPanel from "./components/CourseContentPanel";
import CourseCurriculumPanel from "./components/CourseCurriculumPanel";
import CourseDetailShell from "./components/CourseDetailShell";
import CourseListPanel from "./components/CourseListPanel";
import CourseManagementHeader from "./components/CourseManagementHeader";
import CourseOverviewPanel from "./components/CourseOverviewPanel";
import CourseQuizPanel from "./components/quiz/CourseQuizPanel";

interface CourseManagementContentProps {
  courseToken: string;
}

// Render the course-management screen with state supplied by the shared hook.
const CourseManagementContent = ({
  courseToken,
}: CourseManagementContentProps) => {
  const course = useCourseManagement(courseToken);
  const detailDraftCourse = course.isDetailReady ? course.draftCourse : null;

  return (
    <div className="flex flex-col gap-5 pb-10 text-primary-white">
      <CourseManagementHeader
        viewMode={course.viewMode}
        onBackToList={course.handleBackToList}
      />

      {!course.isDetailView && (
        <CourseListPanel
          courseList={course.courseList}
          isLoading={course.isCourseListLoading}
          onOpenCourseDetail={course.handleOpenCourseDetail}
        />
      )}

      {course.isDetailView && (
        <CourseDetailShell
          title={course.draftCourse?.title || "Loading course..."}
          detailPanel={course.detailPanel}
          chapterCount={course.detailChapterCount}
          lessonCount={course.detailLessonCount}
          assignmentCount={course.detailAssignmentCount}
          quizCount={course.detailQuizCount}
          isLoading={course.isLoading}
          hasDraftCourse={!!course.draftCourse}
          isSaving={course.isSaving}
          onChangePanel={course.setDetailPanel}
          onSaveCourse={course.handleSaveCourse}
        />
      )}

      {detailDraftCourse && course.detailPanel === "overview" && (
        <CourseOverviewPanel
          draftCourse={detailDraftCourse}
          toolsAndSkillsText={course.toolsAndSkillsText}
          forWhomText={course.forWhomText}
          onCourseFieldChange={course.handleCourseFieldChange}
          onChangeToolsAndSkillsText={course.setToolsAndSkillsText}
          onChangeForWhomText={course.setForWhomText}
        />
      )}

      {detailDraftCourse && course.detailPanel === "curriculum" && (
        <CourseCurriculumPanel
          chapters={detailDraftCourse.chapters || []}
          activeChapterId={course.activeChapterId}
          activeLessonId={course.activeLessonId}
          activeChapter={course.activeChapter}
          activeLesson={course.activeLesson}
          newLessonType={course.newLessonType}
          onChangeChapter={course.handleChangeChapter}
          onChangeLesson={course.setActiveLessonId}
          onAddChapter={course.handleAddChapter}
          onInsertChapterBefore={course.handleInsertChapterBefore}
          onDeleteActiveChapter={course.handleDeleteActiveChapter}
          onAddLesson={course.handleAddLesson}
          onInsertLessonBefore={course.handleInsertLessonBefore}
          onDeleteActiveLesson={course.handleDeleteActiveLesson}
          onChangeNewLessonType={course.setNewLessonType}
          onUpdateChapterField={course.handleUpdateActiveChapterField}
          onChangeActiveLessonType={course.handleChangeActiveLessonType}
          onUpdateActiveLessonField={course.handleUpdateActiveLessonField}
          onUpdateActiveLessonContentField={
            course.handleUpdateActiveLessonContentField
          }
          onUpdateActiveLessonOrder={course.handleUpdateActiveLessonOrder}
        />
      )}

      {detailDraftCourse && course.detailPanel === "content" && (
        <CourseContentPanel
          chapters={detailDraftCourse.chapters || []}
          activeChapterId={course.activeChapterId}
          activeLessonId={course.activeLessonId}
          activeChapter={course.activeChapter}
          activeLesson={course.activeLesson}
          activeLessonLabel={course.activeLessonLabel}
          isContentLesson={course.isContentLesson}
          editorMode={course.editorMode}
          lessonJsonText={course.lessonJsonText}
          markdownValue={course.markdownValue}
          onChangeChapter={course.handleChangeChapter}
          onChangeLesson={course.setActiveLessonId}
          onChangeLessonJsonText={course.handleChangeLessonJsonText}
          onChangeEditorMode={course.setEditorMode}
          onChangeLessonMarkdown={course.handleChangeLessonMarkdown}
          markdownEditorRef={course.lessonMarkdownEditorRef}
        />
      )}

      {course.detailPanel === "quiz" && (
        <CourseQuizPanel
          quizLessons={course.draftQuizLessons}
          activeQuizLessonId={course.activeQuizLessonId}
          activeQuizLesson={course.activeQuizLesson}
          quizLessonOptions={course.quizLessonOptions}
          assignmentLessonOptions={course.activeQuizAssignmentOptions}
          isLoading={course.isCourseQuizLoading}
          isSaving={course.isSavingQuiz}
          onChangeQuizLesson={course.handleChangeQuizLesson}
          onAddQuizLesson={course.handleAddQuizLesson}
          onChangeQuizLessonAssignment={course.handleChangeQuizLessonAssignment}
          onDeleteQuizLesson={course.handleDeleteQuizLesson}
          onSaveQuiz={course.handleSaveCourseQuiz}
          onUpdateQuizLessonField={course.handleUpdateQuizLessonField}
          onUpdateQuizQuestionField={course.handleUpdateQuizQuestionField}
          onUpdateQuizOptionField={course.handleUpdateQuizOptionField}
          onAddQuizQuestion={course.handleAddQuizQuestion}
          onDeleteQuizQuestion={course.handleDeleteQuizQuestion}
          onAddQuizOption={course.handleAddQuizOption}
          onDeleteQuizOption={course.handleDeleteQuizOption}
        />
      )}
    </div>
  );
};

// Wrap course management with the dedicated course-admin auth popup.
const CourseManagement = () => (
  <CourseAdminAuthGate>
    {(courseToken) => <CourseManagementContent courseToken={courseToken} />}
  </CourseAdminAuthGate>
);

export default CourseManagement;
