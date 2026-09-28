export type CourseStatus = "DRAFT" | "PUBLISHED" | "PRIVATE" | string;

export type ChapterType = "NORMAL" | "TEST" | string;

export type LessonType =
  | "CONTENT"
  | "VIDEO"
  | "QUIZ"
  | "ASSIGNMENT"
  | "DOCUMENT"
  | string;

export type CourseEditorMode = "markdown" | "raw" | "preview";

export type CourseViewMode = "list" | "detail";

export type CourseDetailPanel = "overview" | "curriculum" | "content" | "quiz";

export interface CourseSelectOption {
  label: string;
  value: string;
}

export interface IContentVideo {
  url: string | null;
}

export interface ICourseLesson {
  id: string;
  title: string;
  order: number;
  type: LessonType;
  colab_link?: string;
  banner_url?: string | null;
  content: Record<string, unknown> | IContentVideo | null;
  [key: string]: unknown;
}

export interface ICourseChapter {
  id: string;
  title: string;
  order: number;
  overview: string;
  type: ChapterType;
  day_unlock: number | null;
  lessons: ICourseLesson[];
  [key: string]: unknown;
}

export interface ICourseData {
  id: string;
  lecturer_id?: string;
  title: string;
  description: string;
  objective: string;
  image?: string;
  published: CourseStatus;
  day_publish: number;
  tools_and_skills: string[];
  for_whom: string[];
  chapters: ICourseChapter[];
  [key: string]: unknown;
}

export interface ICourseUpdatePayload {
  id: string;
  data: Partial<ICourseData>;
}
