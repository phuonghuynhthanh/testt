import { useState } from "react";
import { FiPlus } from "react-icons/fi";

import InputField from "../../../../../shared/input/InputField";
import TextareaField from "../../../../../shared/input/TextareaField";
import SelectField from "../../../../../shared/select/SelectField";
import type { CourseSelectOption } from "../../../../../types/Course";
import type { IQuizLesson } from "../../../../../types/CourseQuiz";
import CourseQuizQuestionCard from "./CourseQuizQuestionCard";
import CourseQuizPreview from "./CourseQuizPreview";

interface CourseQuizPanelProps {
  quizLessons: IQuizLesson[];
  activeQuizLessonId: string;
  activeQuizLesson: IQuizLesson | undefined;
  quizLessonOptions: CourseSelectOption[];
  assignmentLessonOptions: CourseSelectOption[];
  isLoading: boolean;
  isSaving: boolean;
  onChangeQuizLesson: (lessonId: string) => void;
  onAddQuizLesson: () => void;
  onChangeQuizLessonAssignment: (lessonId: string) => void;
  onDeleteQuizLesson: () => void;
  onSaveQuiz: () => void;
  onUpdateQuizLessonField: (
    field: "title" | "overview" | "time_limit",
    value: string,
  ) => void;
  onUpdateQuizQuestionField: (
    questionId: string,
    field: "question" | "explain" | "answer",
    value: string,
  ) => void;
  onUpdateQuizOptionField: (
    questionId: string,
    optionId: string,
    value: string,
  ) => void;
  onAddQuizQuestion: () => void;
  onDeleteQuizQuestion: (questionId: string) => void;
  onAddQuizOption: (questionId: string) => void;
  onDeleteQuizOption: (questionId: string, optionId: string) => void;
}

// Render the quiz editor for the selected course.
const CourseQuizPanel = ({
  quizLessons,
  activeQuizLessonId,
  activeQuizLesson,
  quizLessonOptions,
  assignmentLessonOptions,
  isLoading,
  isSaving,
  onChangeQuizLesson,
  onAddQuizLesson,
  onChangeQuizLessonAssignment,
  onDeleteQuizLesson,
  onSaveQuiz,
  onUpdateQuizLessonField,
  onUpdateQuizQuestionField,
  onUpdateQuizOptionField,
  onAddQuizQuestion,
  onDeleteQuizQuestion,
  onAddQuizOption,
  onDeleteQuizOption,
}: CourseQuizPanelProps) => {
  const [quizEditorMode, setQuizEditorMode] = useState<"edit" | "preview">(
    "edit",
  );

  return (
    <section className="rounded-lg border border-white/15 bg-primary-black-light p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-primary-white">Quiz Editor</h2>
        <p className="mt-1 text-sm text-primary-white/50">
          Edit quiz lessons as a full JSON payload. Save will overwrite the
          current quiz set for this course.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm text-primary-white/80 hover:border-primary-green hover:text-primary-green"
          onClick={onAddQuizLesson}
        >
          <FiPlus />
          Add Quiz Lesson
        </button>
        <button
          type="button"
          className="rounded-md border border-red-400/40 px-3 py-2 text-sm text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onDeleteQuizLesson}
          disabled={!activeQuizLesson}
        >
          Delete Quiz Lesson
        </button>
        <button
          type="button"
          className="rounded-md bg-primary-green px-4 py-2 font-semibold text-primary-black hover:bg-primary-green-dark disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSaveQuiz}
          disabled={!quizLessons.length || isSaving}
        >
          {isSaving ? "Saving..." : "Save Quiz"}
        </button>
      </div>
      </div>

      <div className="mt-4 flex w-fit rounded-md border border-white/10 bg-primary-black-medium p-1">
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm ${
            quizEditorMode === "edit"
              ? "bg-primary-green text-primary-black"
              : "text-primary-white/80"
          }`}
          onClick={() => setQuizEditorMode("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm ${
            quizEditorMode === "preview"
              ? "bg-primary-green text-primary-black"
              : "text-primary-white/80"
          }`}
          onClick={() => setQuizEditorMode("preview")}
        >
          Preview
        </button>
      </div>

      {isLoading && (
        <p className="mt-4 text-primary-white/70">Loading quiz...</p>
      )}

      {!isLoading && quizLessons.length === 0 && (
        <div className="mt-4 rounded-md border border-white/10 bg-primary-black-medium p-4 text-sm text-primary-white/55">
          No quiz lessons found for this course. Add one to start editing.
        </div>
      )}

      {!isLoading && quizLessons.length > 0 && (
        <div className="mt-4 grid gap-4">
          <SelectField
            label="Quiz Lesson"
            id="quiz-lesson-select"
            name="quiz-lesson-select"
            value={activeQuizLessonId}
            options={quizLessonOptions}
            onChange={(event) => onChangeQuizLesson(event.target.value)}
          />

          {activeQuizLesson && quizEditorMode === "edit" && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <SelectField
                  label="Linked ASSIGNMENT Lesson"
                  id={`quiz-assignment-${activeQuizLesson.lesson_id}`}
                  name={`quiz-assignment-${activeQuizLesson.lesson_id}`}
                  value={
                    assignmentLessonOptions.some(
                      (option) => option.value === activeQuizLesson.lesson_id,
                    )
                      ? activeQuizLesson.lesson_id
                      : ""
                  }
                  options={assignmentLessonOptions}
                  placeholder="Chọn lesson..."
                  onChange={(event) =>
                    onChangeQuizLessonAssignment(event.target.value)
                  }
                />
                {!assignmentLessonOptions.some(
                  (option) => option.value === activeQuizLesson.lesson_id,
                ) && (
                  <p className="text-sm text-red-300">
                    This quiz is not linked to an ASSIGNMENT lesson. Select one
                    before saving.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Lesson Title"
                  id={`quiz-title-${activeQuizLesson.lesson_id}`}
                  name={`quiz-title-${activeQuizLesson.lesson_id}`}
                  value={activeQuizLesson.title}
                  handleChange={(event) =>
                    onUpdateQuizLessonField("title", event.target.value)
                  }
                />
                <InputField
                  label="Time Limit"
                  id={`quiz-time-limit-${activeQuizLesson.lesson_id}`}
                  name={`quiz-time-limit-${activeQuizLesson.lesson_id}`}
                  value={String(activeQuizLesson.content.time_limit || 0)}
                  handleChange={(event) =>
                    onUpdateQuizLessonField("time_limit", event.target.value)
                  }
                />
              </div>

              <TextareaField
                label="Overview"
                id={`quiz-overview-${activeQuizLesson.lesson_id}`}
                name={`quiz-overview-${activeQuizLesson.lesson_id}`}
                value={activeQuizLesson.overview}
                rows={3}
                handleChange={(event) =>
                  onUpdateQuizLessonField("overview", event.target.value)
                }
              />

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-white">
                  Questions
                </h3>
                <button
                  type="button"
                  className="rounded-md border border-white/20 px-3 py-2 text-sm text-primary-white/80 hover:border-primary-green hover:text-primary-green"
                  onClick={onAddQuizQuestion}
                >
                  Add Question
                </button>
              </div>

              <div className="grid gap-4">
                {activeQuizLesson.content.questions.map((question, index) => (
                  <CourseQuizQuestionCard
                    key={question.id}
                    question={question}
                    questionIndex={index}
                    onChangeQuestionField={onUpdateQuizQuestionField}
                    onChangeOptionText={onUpdateQuizOptionField}
                    onAddOption={onAddQuizOption}
                    onDeleteOption={onDeleteQuizOption}
                    onDeleteQuestion={onDeleteQuizQuestion}
                  />
                ))}
              </div>
            </div>
          )}

          {activeQuizLesson && quizEditorMode === "preview" && (
            <CourseQuizPreview lesson={activeQuizLesson} />
          )}
        </div>
      )}
    </section>
  );
};

export default CourseQuizPanel;
