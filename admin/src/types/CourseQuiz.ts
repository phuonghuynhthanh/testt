export interface IQuizOption {
  id: string;
  text: string;
}

export interface IQuizQuestion {
  id: string;
  question: string;
  options: IQuizOption[];
  explain: string;
  answer: string;
}

export interface IQuizLesson {
  lesson_id: string;
  title: string;
  overview: string;
  type: "QUIZ_ASSIGNMENT";
  content: {
    time_limit: number;
    questions: IQuizQuestion[];
  };
}

export interface ICourseQuizPayload {
  course_id: string;
  data: IQuizLesson[];
}

export interface ICourseQuizListResponse {
  data?: IQuizLesson[];
}

export interface ICourseQuizSaveResponse {
  message?: string;
  data?: Array<Pick<IQuizLesson, "lesson_id" | "title">>;
}
