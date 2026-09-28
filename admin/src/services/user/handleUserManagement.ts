import { API_QUANT_SERVICES } from "../../config/config";
import type {
  CourseUserPerformanceResponse,
  CourseUserProfile,
} from "../../data/userManagementData";
import axiosCourseClient from "../../lib/axios/axiosCourseClient";
import { buildCourseAuthHeaders } from "../../utils/courseAuthUtils";

// Fetch one admin-visible user profile with the user's strategies attached.
export const getCourseUserProfile = async (
  userId: string,
  token?: string,
): Promise<CourseUserProfile> => {
  try {
    const response = await axiosCourseClient.get<CourseUserProfile>(
      `${API_QUANT_SERVICES}/admin/user`,
      {
        params: { user_id: userId },
        headers: buildCourseAuthHeaders(token),
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course user profile");
  }
};

// Fetch one bot performance detail together with its strategy source code.
export const getCourseUserPerformance = async (
  userId: string,
  botId: string,
  market: string = "VN_STOCK",
  token?: string,
): Promise<CourseUserPerformanceResponse> => {
  try {
    const response = await axiosCourseClient.get<CourseUserPerformanceResponse>(
      `${API_QUANT_SERVICES}/admin/user/performance`,
      {
        params: {
          user_id: userId,
          bot_id: botId,
          market,
        },
        headers: buildCourseAuthHeaders(token),
      },
    );
    return response.data;
  } catch {
    throw new Error("Unable to get course user performance");
  }
};
