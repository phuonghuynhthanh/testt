import type {
  CourseSelectOption,
  ICourseChapter,
  ICourseData,
  ICourseLesson,
  ICourseUpdatePayload,
  LessonType,
} from "../types/Course";

// Reuse the supported lesson types across editors.
export const LESSON_TYPE_OPTIONS: LessonType[] = [
  "CONTENT",
  "VIDEO",
  "QUIZ",
  "ASSIGNMENT",
  "DOCUMENT",
];

// Deep clone a course draft to prevent cache mutation.
export const cloneCourse = (course: ICourseData): ICourseData =>
  structuredClone(course);

// Normalize unknown list-like data into clean string arrays.
export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
};

// Convert multiline textarea content into array payload fields.
export const multilineToArray = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

// Read markdown text from a content lesson payload.
export const lessonContentToMarkdown = (
  lesson: ICourseLesson | null,
): string => {
  if (!lesson || !lesson.content) return "";

  const content = lesson.content as Record<string, unknown>;
  return typeof content.content === "string" ? content.content : "";
};

// Persist markdown text back into the lesson content object.
export const updateLessonMarkdown = (
  lesson: ICourseLesson,
  markdown: string,
): ICourseLesson => {
  const nextContent =
    lesson.content && typeof lesson.content === "object"
      ? { ...lesson.content }
      : {};

  return {
    ...lesson,
    content: {
      ...nextContent,
      content: markdown,
    },
  };
};

// Build a temporary client id for new draft rows.
export const createClientId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Recalculate chapter order values after structural edits.
export const reindexChapters = (
  chapters: ICourseChapter[],
): ICourseChapter[] =>
  chapters.map((chapter, index) => ({
    ...chapter,
    order: index + 1,
  }));

// Recalculate lesson order values after structural edits.
export const reindexLessons = (lessons: ICourseLesson[]): ICourseLesson[] =>
  lessons.map((lesson, index) => ({
    ...lesson,
    order: index + 1,
  }));

// Move one lesson to a new 1-based order and normalize the result.
export const reorderLessonByOrder = (
  lessons: ICourseLesson[],
  lessonId: string,
  nextOrder: number,
): ICourseLesson[] => {
  if (!lessons.length) return lessons;

  const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (currentIndex < 0) return lessons;

  const boundedOrder = Math.min(Math.max(Math.floor(nextOrder), 1), lessons.length);
  const nextIndex = boundedOrder - 1;
  if (currentIndex === nextIndex) return lessons;

  const nextLessons = [...lessons];
  const [selectedLesson] = nextLessons.splice(currentIndex, 1);
  nextLessons.splice(nextIndex, 0, selectedLesson);

  return reindexLessons(nextLessons);
};

// Create a draft chapter skeleton for admin editing.
export const createEmptyChapter = (order: number): ICourseChapter => ({
  id: createClientId(),
  title: "New Chapter",
  order,
  overview: "",
  type: "NORMAL",
  day_unlock: null,
  lessons: [],
});

// Provide the default content shape for each lesson type.
export const createDefaultLessonContentByType = (
  type: LessonType,
): Record<string, unknown> | null => {
  if (type === "CONTENT") return { content: "" };
  if (type === "VIDEO") return { url: "" };
  if (type === "QUIZ") return { questions: [], time_limit: 0 };

  if (type === "ASSIGNMENT") {
    return {
      status: "NOT_SCHEDULED",
      attempt_id: "",
      scheduled_at: "",
      start_time: "",
      end_time: "",
      score: 0,
    };
  }

  if (type === "DOCUMENT") return { document: [] };
  return {};
};

// Create a draft lesson skeleton for admin editing.
export const createEmptyLesson = (
  order: number,
  type: LessonType = "CONTENT",
): ICourseLesson => ({
  id: createClientId(),
  title: "New Lesson",
  order,
  type,
  colab_link: "",
  banner_url: type === "VIDEO" ? null : undefined,
  content: createDefaultLessonContentByType(type),
});

// Build the backend update payload while normalizing list fields.
export const buildCourseUpdatePayload = (
  course: ICourseData,
): ICourseUpdatePayload => ({
  id: course.id,
  data: {
    ...course,
    day_publish: Number(course.day_publish) || 0,
    tools_and_skills: normalizeStringArray(course.tools_and_skills),
    for_whom: normalizeStringArray(course.for_whom),
  },
});

// Count every lesson across the chapter tree.
export const countCourseLessons = (course: ICourseData): number =>
  (course.chapters || []).reduce(
    (total, chapter) => total + (chapter.lessons?.length || 0),
    0,
  );

// Count assignment lessons for quick admin stats.
export const countCourseAssignments = (course: ICourseData): number =>
  (course.chapters || []).reduce(
    (total, chapter) =>
      total +
      (chapter.lessons || []).filter((lesson) => lesson.type === "ASSIGNMENT")
        .length,
    0,
  );

// Collect ASSIGNMENT lessons across the tree as quiz-link select options.
export const getAssignmentLessonOptions = (
  course: ICourseData | null,
): CourseSelectOption[] => {
  if (!course?.chapters?.length) return [];

  const options: CourseSelectOption[] = [];

  course.chapters
    .slice()
    .sort((left, right) => left.order - right.order)
    .forEach((chapter) => {
      (chapter.lessons || [])
        .slice()
        .sort((left, right) => left.order - right.order)
        .forEach((lesson) => {
          if (lesson.type !== "ASSIGNMENT") return;

          options.push({
            label: `Ch.${chapter.order} · Lesson ${lesson.order}: ${
              lesson.title || "Untitled lesson"
            }`,
            value: lesson.id,
          });
        });
    });

  return options;
};

// Convert chapters into select options for shared form controls.
export const getChapterSelectOptions = (
  chapters: ICourseChapter[],
): CourseSelectOption[] =>
  chapters.map((chapter) => ({
    label: `Chapter ${chapter.order}: ${chapter.title}`,
    value: chapter.id,
  }));

// Convert lessons into select options for shared form controls.
export const getLessonSelectOptions = (
  lessons: ICourseLesson[],
): CourseSelectOption[] =>
  lessons.map((lesson) => ({
    label: `Lesson ${lesson.order}: ${lesson.title} [${lesson.type}]`,
    value: lesson.id,
  }));
