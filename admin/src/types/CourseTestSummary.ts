export interface ICourseTestSummaryStudent {
  student_id: string;
  full_name?: string;
  email?: string;
  scheduled_at?: string | null;
  submitted_at?: string | null;
  score?: number | null;
}

export interface ICourseTestSummaryLesson {
  lesson_id: string;
  lesson_title?: string;
  title?: string;
  lesson_order?: number;
  total_questions?: number;
  scheduled_count: number;
  submitted_count: number;
  scheduled_students: ICourseTestSummaryStudent[];
  submitted_students: ICourseTestSummaryStudent[];
}

export interface ICourseTestSummaryResponse {
  course_id: string;
  total_tests: number;
  tests: ICourseTestSummaryLesson[];
}

export interface ICourseTestSummaryListResponse {
  data?: ICourseTestSummaryResponse;
}
