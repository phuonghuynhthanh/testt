import InputField from "../../../../../shared/input/InputField";
import TextareaField from "../../../../../shared/input/TextareaField";
import { FiCheckCircle, FiCircle } from "react-icons/fi";
import type { IQuizQuestion } from "../../../../../types/CourseQuiz";

interface CourseQuizQuestionCardProps {
  question: IQuizQuestion;
  questionIndex: number;
  onChangeQuestionField: (
    questionId: string,
    field: "question" | "explain" | "answer",
    value: string,
  ) => void;
  onChangeOptionText: (
    questionId: string,
    optionId: string,
    value: string,
  ) => void;
  onAddOption: (questionId: string) => void;
  onDeleteOption: (questionId: string, optionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
}

// Render one editable quiz question block.
const CourseQuizQuestionCard = ({
  question,
  questionIndex,
  onChangeQuestionField,
  onChangeOptionText,
  onAddOption,
  onDeleteOption,
  onDeleteQuestion,
}: CourseQuizQuestionCardProps) => {
  return (
    <div className="rounded-lg border border-white/10 bg-primary-black-medium p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-primary-white/45">
            Question {questionIndex + 1}
          </p>
          <h4 className="text-base font-semibold text-primary-white">
            {question.question || "Untitled question"}
          </h4>
        </div>
        <button
          type="button"
          className="w-fit rounded-md border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:border-red-400 hover:text-red-200"
          onClick={() => onDeleteQuestion(question.id)}
        >
          Delete Question
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <TextareaField
          label="Question"
          id={`quiz-question-${question.id}`}
          name={`quiz-question-${question.id}`}
          value={question.question}
          rows={3}
          handleChange={(event) =>
            onChangeQuestionField(question.id, "question", event.target.value)
          }
        />

        <div className="grid gap-4">
          <InputField
            label="Question ID"
            id={`quiz-question-id-${question.id}`}
            name={`quiz-question-id-${question.id}`}
            value={question.id}
            readOnly
          />
        </div>

        <TextareaField
          label="Explain"
          id={`quiz-explain-${question.id}`}
          name={`quiz-explain-${question.id}`}
          value={question.explain}
          rows={3}
          handleChange={(event) =>
            onChangeQuestionField(question.id, "explain", event.target.value)
          }
        />

        <div className="rounded-md border border-white/10 bg-primary-black-light p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold text-primary-white">
                Options
              </h5>
              <p className="mt-1 text-xs text-primary-white/45">
                Tick the correct option directly. This replaces the old answer dropdown.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-white/20 px-3 py-1 text-xs text-primary-white/80 hover:border-primary-green hover:text-primary-green"
              onClick={() => onAddOption(question.id)}
            >
              Add Option
            </button>
          </div>

          <div className="grid gap-3">
            {question.options.map((option, index) => {
              const isCorrect = question.answer === option.id;

              return (
                <div
                  key={option.id}
                  className={`grid gap-3 rounded-md border p-3 transition-colors md:grid-cols-[auto_1fr_auto] ${
                    isCorrect
                      ? "border-primary-green/50 bg-primary-green/10"
                      : "border-white/10 bg-primary-black-medium"
                  }`}
                >
                  <div className="flex items-end">
                    <button
                      type="button"
                      aria-pressed={isCorrect}
                      aria-label={`Mark option ${index + 1} as correct`}
                      className={`inline-flex h-[42px] items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
                        isCorrect
                          ? "border-primary-green bg-primary-green text-primary-black"
                          : "border-white/15 text-primary-white/70 hover:border-primary-green hover:text-primary-green"
                      }`}
                      onClick={() =>
                        onChangeQuestionField(question.id, "answer", option.id)
                      }
                    >
                      {isCorrect ? <FiCheckCircle /> : <FiCircle />}
                      Correct
                    </button>
                  </div>

                  <InputField
                    label={`Option ${index + 1}`}
                    id={`quiz-option-${question.id}-${option.id}`}
                    name={`quiz-option-${question.id}-${option.id}`}
                    value={option.text}
                    handleChange={(event) =>
                      onChangeOptionText(question.id, option.id, event.target.value)
                    }
                  />

                  <div className="flex items-end">
                    <button
                      type="button"
                      className="h-[42px] rounded-md border border-red-400/40 px-3 text-sm text-red-300 hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => onDeleteOption(question.id, option.id)}
                      disabled={question.options.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseQuizQuestionCard;
