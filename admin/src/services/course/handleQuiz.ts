import { API_QUANT_SERVICES } from "../../config/config";
import axiosCourseClient from "../../lib/axios/axiosCourseClient";
import type {
  ICourseTestSummaryListResponse,
  ICourseTestSummaryResponse,
} from "../../types/CourseTestSummary";
import {
  type ICourseQuizListResponse,
  type ICourseQuizPayload,
  type ICourseQuizSaveResponse,
  type IQuizLesson,
} from "../../types/CourseQuiz";
import { buildCourseAuthHeaders } from "../../utils/courseAuthUtils";

// Fetch all quiz lessons for one course.
export const getCourseQuiz = async (
  token?: string,
): Promise<IQuizLesson[]> => {
  try {
    const response = await axiosCourseClient.get<
      IQuizLesson[] | ICourseQuizListResponse
    >(`${API_QUANT_SERVICES}/course/quiz`, {
      headers: buildCourseAuthHeaders(token),
    });

    return Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
  } catch {
    throw new Error("Unable to get course quiz");
  }
};

// Save the full quiz payload for one course.
export const updateCourseQuiz = async (
  payload: ICourseQuizPayload,
  token?: string,
): Promise<ICourseQuizSaveResponse> => {
  try {
    const response = await axiosCourseClient.post<ICourseQuizSaveResponse>(
      `${API_QUANT_SERVICES}/course/quiz`,
      payload,
      { headers: buildCourseAuthHeaders(token) },
    );
    return response.data;
  } catch {
    throw new Error("Unable to update course quiz");
  }
};

// Fetch the per-test scheduling and submission summary for the admin dashboard.
export const getCourseTestSummary = async (
  token?: string,
): Promise<ICourseTestSummaryResponse> => {
  try {
    const response = await axiosCourseClient.get<
      ICourseTestSummaryResponse | ICourseTestSummaryListResponse
    >(`${API_QUANT_SERVICES}/course/quiz/summary`, {
      headers: buildCourseAuthHeaders(token),
    });

    const payload = response.data;

    if ("data" in payload) {
      return (
        payload.data || {
          course_id: "",
          total_tests: 0,
          tests: [],
        }
      );
    }

    return payload as ICourseTestSummaryResponse;
  } catch {
    throw new Error("Unable to get course test summary");
  }
};
