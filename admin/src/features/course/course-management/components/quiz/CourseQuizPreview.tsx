import { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import AssignmentMarkdownContent from "../../../../../shared/markdown-content/AssignmentMarkdownContent";
import type { IQuizLesson, IQuizQuestion } from "../../../../../types/CourseQuiz";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

interface CourseQuizPreviewProps {
  lesson: IQuizLesson;
}

interface QuizOptionPreviewButtonProps {
  index: number;
  content: string;
  isSelected: boolean;
  onClick: () => void;
}

// Render one option with the exact assignment option surface used by LMS.
const QuizOptionPreviewButton = ({
  index,
  content,
  isSelected,
  onClick,
}: QuizOptionPreviewButtonProps) => {
  const cardClass = isSelected
    ? "border-amber-500 bg-[#eceadd] shadow-[0_0_0_3px_rgba(251,191,36,0.2)]"
    : "border-stone-400 bg-[#eceadd] hover:border-stone-500 hover:shadow-md active:scale-[0.99]";
  const labelClass = isSelected
    ? "bg-amber-500 text-stone-900 font-black"
    : "bg-stone-300 text-stone-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border-2 transition-all duration-150 flex items-start gap-3 p-3.5 sm:p-4 min-h-[64px] cursor-pointer ${cardClass}`}
    >
      <span
        className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-black mt-0.5 transition-all duration-150 select-none ${labelClass}`}
      >
        {OPTION_LABELS[index] ?? index + 1}
      </span>

      <div className="flex-1 min-w-0 text-sm leading-relaxed text-stone-900">
        <AssignmentMarkdownContent content={content} />
      </div>
    </button>
  );
};

// Resolve the visible question while keeping the index inside the current lesson bounds.
function getCurrentQuestion(
  questions: IQuizQuestion[],
  currentIndex: number,
): IQuizQuestion | undefined {
  return questions[Math.min(currentIndex, Math.max(questions.length - 1, 0))];
}

// Render the quiz lesson preview with the same assignment player surface used in LMS.
const CourseQuizPreview = ({ lesson }: CourseQuizPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions = lesson.content.questions;
  const currentQuestion = getCurrentQuestion(questions, currentIndex);
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]).length,
    [answers, questions],
  );
  const questionProgressPercent = questions.length
    ? (answeredCount / questions.length) * 100
    : 0;

  // Reset transient preview choices when the admin switches quiz lessons.
  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
  }, [lesson.lesson_id]);

  // Clamp the selected question after deleting questions in edit mode.
  useEffect(() => {
    if (currentIndex < questions.length) return;
    setCurrentIndex(Math.max(questions.length - 1, 0));
  }, [currentIndex, questions.length]);

  if (!currentQuestion) {
    return (
      <div className="rounded-lg border border-white/10 bg-primary-black-medium p-4 text-sm text-primary-white/55">
        No questions to preview.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex gap-6 xl:gap-8 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="rounded-xl border border-stone-700 bg-[#1a1a18] overflow-hidden shadow-2xl">
            <div className="px-6 py-3 border-b border-stone-700 bg-[#141412] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.25em] text-stone-300">
                  Question {currentIndex + 1}
                  <span className="text-stone-600"> / {questions.length}</span>
                </span>
                <div className="flex items-center gap-1 ml-2">
                  {questions.map((question, index) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      title={`Question ${index + 1}`}
                      className={`transition-all duration-200 rounded-sm ${
                        index === currentIndex
                          ? "w-5 h-2 bg-amber-400"
                          : answers[question.id]
                            ? "w-2 h-2 bg-amber-700"
                            : "w-2 h-2 bg-stone-600 hover:bg-stone-500"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {answers[currentQuestion.id] && (
                <span className="text-[10px] uppercase tracking-widest text-amber-400 flex items-center gap-1">
                  <span>✓</span>
                  <span>Answered</span>
                </span>
              )}
            </div>

            <div className="p-6 lg:p-8 space-y-6">
              <div className="bg-[#eceadd] rounded-lg border-2 border-stone-400 p-5 lg:p-6 shadow-inner relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-stone-500" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-stone-500" />
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-black text-stone-400 leading-none shrink-0 select-none tabular-nums">
                    {String(currentIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <AssignmentMarkdownContent
                      content={currentQuestion.question}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {currentQuestion.options.map((option, optionIndex) => (
                  <QuizOptionPreviewButton
                    key={option.id}
                    index={optionIndex}
                    content={option.text}
                    isSelected={answers[currentQuestion.id] === option.id}
                    onClick={() =>
                      setAnswers((currentAnswers) => ({
                        ...currentAnswers,
                        [currentQuestion.id]: option.id,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-primary-white/80 hover:border-primary-green hover:text-primary-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiChevronLeft />
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((index) =>
                  Math.min(index + 1, questions.length - 1),
                )
              }
              disabled={currentIndex === questions.length - 1}
              className="inline-flex items-center gap-2 rounded-md bg-primary-green px-4 py-2 text-sm font-semibold text-primary-black hover:bg-primary-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <FiChevronRight />
            </button>
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 space-y-4 lg:block">
          <div className="rounded-xl border border-stone-700 bg-[#141412] p-4 shadow-xl">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
              Assignment
            </p>
            <h3 className="mt-2 text-lg font-bold text-stone-100">
              {lesson.title || "Untitled quiz"}
            </h3>
            {lesson.overview && (
              <p className="mt-2 text-sm leading-6 text-stone-400">
                {lesson.overview}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-stone-700 bg-[#141412] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Progress
              </span>
              <span className="text-[10px] font-bold text-amber-400">
                {Math.round(questionProgressPercent)}%
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-300">
              {answeredCount}/{questions.length} answered
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-stone-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${questionProgressPercent}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`h-9 rounded-md border text-xs font-bold transition-colors ${
                    index === currentIndex
                      ? "border-amber-400 bg-amber-400 text-stone-950"
                      : answers[question.id]
                        ? "border-amber-700 bg-amber-900/40 text-amber-200"
                        : "border-stone-700 bg-stone-900 text-stone-500 hover:border-stone-500"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CourseQuizPreview;
