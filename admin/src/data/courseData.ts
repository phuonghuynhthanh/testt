export type StudentStatus = "ACTIVE" | "COMPLETED";
export type SubscriptionPackage = "SILVER" | "GOLD" | "PLATINUM";

export interface CourseUser {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  phone?: string;
  subscription_package?: SubscriptionPackage | null;
  registration_date?: string | null;
  created_at?: string;
  last_login?: string;
}

export interface UpdateCourseUserSubscriptionPayload {
  user_id: string;
  subscription_package: SubscriptionPackage;
  registration_date: string;
}

export interface CourseCertificate {
  user_id: string;
  course_id?: string;
  name: string;
  created_at: string;
  certificate_code: string;
}

export interface GetCourseCertificatesParams {
  certificate_code?: string;
}

export type CourseTrackAction =
  | "SCHEDULED"
  | "STARTED"
  | "SUBMIT"
  | "SUBMITTED";

export interface CourseTrack {
  id: string;
  email?: string;
  lesson_id: string;
  action: CourseTrackAction;
  time: string;
  created_at?: string;
}

export interface GetCourseTracksParams {
  lesson_id?: string;
  lesson_ids?: string[];
  action?: CourseTrackAction;
  page?: number;
  limit?: number;
}

export interface CourseTrackListResponse {
  data: CourseTrack[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export type LessonProgressStatus =
  | "LOCKED"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NOT_SCHEDULED"
  | "SCHEDULED"
  | "SUBMITTED"
  | "PASSED"
  | "FAILED";

export interface GetCourseStudentsParams {
  course_id?: string;
  keyword?: string;
  status?: StudentStatus | "ALL";
  page?: number;
  limit?: number;
}

export interface CourseStudent {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: StudentStatus;
  enrolled_at: string;
  last_login?: string;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
  completed_tests: number;
  total_tests: number;
  average_score: number;
}

export interface LessonProgress {
  chapter_id: string;
  chapter_title: string;
  chapter_order: number;
  lesson_id: string;
  lesson_title: string;
  lesson_order: number;
  lesson_type: "CONTENT" | "ASSIGNMENT";
  status: LessonProgressStatus;
  unlocked_at?: string;
  started_at?: string;
  completed_at?: string;
  time_spent_seconds?: number;
}

export interface ChapterProgress {
  chapter_id: string;
  chapter_title: string;
  chapter_order: number;
  progress_percent: number;
  lessons: LessonProgress[];
}

export interface TestResult {
  attempt_id: string;
  student_id: string;
  lesson_id: string;
  lesson_title: string;
  chapter_id: string;
  chapter_title: string;
  status:
    | "NOT_SCHEDULED"
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "PASSED"
    | "FAILED";
  scheduled_at?: string;
  start_time?: string;
  end_time?: string;
  score: number;
  max_score: number;
  passed_score: number;
  attempt_count: number;
  submitted_at?: string;
  feedback?: string;
}

export interface CourseStudentListResponse {
  data: CourseStudent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface CourseStudentDetailResponse extends CourseStudent {
  course: {
    id: string;
    title: string;
  };
  progress_summary: {
    progress_percent: number;
    completed_lessons: number;
    total_lessons: number;
    completed_chapters: number;
    total_chapters: number;
    total_time_spent_seconds: number;
  };
  chapters: ChapterProgress[];
  test_summary: {
    completed_tests: number;
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
  };
  test_results: TestResult[];
}

export interface CourseStudentSummaryResponse {
  course_id: string;
  total_students: number;
  active_students: number;
  completed_students: number;
  average_progress_percent: number;
  average_score: number;
  total_lessons: number;
  total_tests: number;
  students_need_attention: number;
  top_students: Pick<
    CourseStudent,
    "id" | "full_name" | "email" | "progress_percent" | "average_score"
  >[];
  low_progress_students: Pick<
    CourseStudent,
    | "id"
    | "full_name"
    | "email"
    | "progress_percent"
    | "average_score"
    | "last_login"
  >[];
}
