import { API_QUANT_SERVICES } from "../../config/config";
import type {
  CourseCertificate,
  CourseStudentDetailResponse,
  CourseStudentListResponse,
  CourseStudentSummaryResponse,
  CourseTrackListResponse,
  CourseUser,
  GetCourseCertificatesParams,
  GetCourseStudentsParams,
  GetCourseTracksParams,
  UpdateCourseUserSubscriptionPayload,
} from "../../data/courseData";
import axiosCourseClient from "../../lib/axios/axiosCourseClient";
import type { ICourseData, ICourseUpdatePayload } from "../../types/Course";
import { buildCourseAuthHeaders } from "../../utils/courseAuthUtils";

interface ICourseUsersResponse {
  data?: CourseUser[];
}

interface ICourseCertificatesResponse {
  data?: CourseCertificate[];
}

// Fetch all courses for course selector in admin.
export const getCourseList = async (token?: string): Promise<ICourseData[]> => {
  try {
    const response = await axiosCourseClient.get<ICourseData[]>(
      `${API_QUANT_SERVICES}/courses`,
      { headers: buildCourseAuthHeaders(token) },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course list");
  }
};

// Fetch one course detail by id for editing.
export const getCourseDetail = async (
  courseId: string,
  token?: string,
): Promise<ICourseData> => {
  try {
    const response = await axiosCourseClient.get<ICourseData>(
      `${API_QUANT_SERVICES}/course`,
      {
        params: { id: courseId },
        headers: buildCourseAuthHeaders(token),
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course detail");
  }
};

// Update one course with payload format required by backend.
export const updateCourse = async (
  payload: ICourseUpdatePayload,
  token?: string,
) => {
  try {
    const response = await axiosCourseClient.put(
      `${API_QUANT_SERVICES}/course`,
      payload,
      { headers: buildCourseAuthHeaders(token) },
    );
    return response.data;
  } catch {
    throw new Error("Unable to update course");
  }
};

// Fetch paginated students with optional keyword and status filtering.
export const getCourseStudents = async (
  params?: GetCourseStudentsParams,
  token?: string,
): Promise<CourseStudentListResponse> => {
  try {
    const requestParams = {
      ...params,
      keyword: params?.keyword?.trim() || undefined,
      status: params?.status === "ALL" ? undefined : params?.status,
    };
    const response = await axiosCourseClient.get<CourseStudentListResponse>(
      `${API_QUANT_SERVICES}/students`,
      { params: requestParams, headers: buildCourseAuthHeaders(token) },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course students");
  }
};

// Fetch one student detail only after the admin selects a student.
export const getCourseStudentDetail = async (
  studentId: string,
  token?: string,
): Promise<CourseStudentDetailResponse> => {
  try {
    const response = await axiosCourseClient.get<CourseStudentDetailResponse>(
      `${API_QUANT_SERVICES}/student`,
      {
        params: { student_id: studentId },
        headers: buildCourseAuthHeaders(token),
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course student detail");
  }
};

// Fetch aggregate numbers used by the student management dashboard.
export const getCourseStudentSummary = async (
  token?: string,
): Promise<CourseStudentSummaryResponse> => {
  try {
    const response = await axiosCourseClient.get<CourseStudentSummaryResponse>(
      `${API_QUANT_SERVICES}/students/summary`,
      { headers: buildCourseAuthHeaders(token) },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course student summary");
  }
};

// Fetch assignment action tracks with optional lesson and action filtering.
export const getCourseTracks = async (
  params?: GetCourseTracksParams,
  token?: string,
): Promise<CourseTrackListResponse> => {
  try {
    const requestParams = {
      ...params,
      lesson_id: params?.lesson_id?.trim() || undefined,
      lesson_ids: params?.lesson_ids?.filter(Boolean).join(",") || undefined,
      action: params?.action || undefined,
    };
    const response = await axiosCourseClient.get<CourseTrackListResponse>(
      `${API_QUANT_SERVICES}/course/tracks`,
      {
        params: requestParams,
        headers: buildCourseAuthHeaders(token),
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course tracks");
  }
};

// Fetch users that can receive a course subscription package.
export const getCourseUsers = async (token?: string): Promise<CourseUser[]> => {
  try {
    const response = await axiosCourseClient.get<CourseUser[] | ICourseUsersResponse>(
      `${API_QUANT_SERVICES}/course/admin/users`,
      { headers: buildCourseAuthHeaders(token) },
    );
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  } catch {
    throw new Error("Unable to get course users");
  }
};

// Update one user's subscription package through the course admin API.
export const updateCourseUserSubscription = async (
  payload: UpdateCourseUserSubscriptionPayload,
  token?: string,
) => {
  try {
    const response = await axiosCourseClient.put(
      `${API_QUANT_SERVICES}/course/admin/user`,
      payload,
      { headers: buildCourseAuthHeaders(token) },
    );
    return response.data;
  } catch {
    throw new Error("Unable to update course user subscription");
  }
};

// Fetch issued course certificates with optional certificate code filtering.
export const getCourseCertificates = async (
  params?: GetCourseCertificatesParams,
  token?: string,
): Promise<CourseCertificate[]> => {
  try {
    const requestParams = {
      certificate_code: params?.certificate_code?.trim() || undefined,
    };
    const response = await axiosCourseClient.get<
      CourseCertificate[] | ICourseCertificatesResponse
    >(`${API_QUANT_SERVICES}/certificates`, {
      params: requestParams,
      headers: buildCourseAuthHeaders(token),
    });
    return Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
  } catch {
    throw new Error("Unable to get course certificates");
  }
};
