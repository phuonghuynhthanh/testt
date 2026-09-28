import type {
  IQuizLesson,
  IQuizOption,
  IQuizQuestion,
} from "../types/CourseQuiz";
import type { ICourseData } from "../types/Course";

// Build a stable client id for quiz draft items.
export const createQuizClientId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Deep clone the quiz list so React Query data is never mutated directly.
export const cloneCourseQuizLessons = (
  lessons: IQuizLesson[],
): IQuizLesson[] => structuredClone(lessons);

// Sort quiz lessons to match the lesson order from the course tree.
export const sortQuizLessonsByCourseOrder = (
  course: ICourseData | null,
  lessons: IQuizLesson[],
): IQuizLesson[] => {
  if (!course?.chapters?.length || !lessons.length) return cloneCourseQuizLessons(lessons);

  const orderMap = new Map<
    string,
    { chapterOrder: number; lessonOrder: number; sequence: number }
  >();
  let sequence = 0;

  // Build a stable lookup from lesson id to its course position.
  course.chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .forEach((chapter) => {
      chapter.lessons
        .slice()
        .sort((left, right) => left.order - right.order)
        .forEach((lesson) => {
          if (lesson.type !== "ASSIGNMENT") return;
          orderMap.set(lesson.id, {
            chapterOrder: chapter.order,
            lessonOrder: lesson.order,
            sequence: sequence += 1,
          });
        });
    });

  return [...lessons]
    .map((lesson, index) => ({
      lesson,
      index,
      order: orderMap.get(lesson.lesson_id) ?? null,
    }))
    .sort((left, right) => {
      if (left.order && right.order) {
        if (left.order.chapterOrder !== right.order.chapterOrder) {
          return left.order.chapterOrder - right.order.chapterOrder;
        }

        if (left.order.lessonOrder !== right.order.lessonOrder) {
          return left.order.lessonOrder - right.order.lessonOrder;
        }

        return left.order.sequence - right.order.sequence;
      }

      if (left.order) return -1;
      if (right.order) return 1;
      return left.index - right.index;
    })
    .map(({ lesson }) => lesson);
};

// Create a blank option for a draft quiz question.
export const createEmptyQuizOption = (index: number): IQuizOption => ({
  id: createQuizClientId(),
  text: `Option ${index}`,
});

// Create a blank quiz question with four empty options.
export const createEmptyQuizQuestion = (): IQuizQuestion => {
  const options = Array.from({ length: 4 }, (_, index) =>
    createEmptyQuizOption(index + 1),
  );

  return {
    id: createQuizClientId(),
    question: "New question",
    options,
    explain: "",
    answer: options[0]?.id || "",
  };
};

// Create a blank quiz lesson for editor drafts.
// `lessonId` must be the id of an ASSIGNMENT lesson from the course tree so the
// quiz stays linked instead of pointing at a random orphan id.
export const createEmptyQuizLesson = (
  lessonId: string,
  order = 1,
): IQuizLesson => ({
  lesson_id: lessonId,
  title: `Quiz Lesson ${order}`,
  overview: "",
  type: "QUIZ_ASSIGNMENT",
  content: {
    time_limit: 300,
    questions: [createEmptyQuizQuestion()],
  },
});
