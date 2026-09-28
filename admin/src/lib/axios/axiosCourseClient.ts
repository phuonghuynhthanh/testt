import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { getFreshCourseAdminToken } from "../../services/course/courseAuth";
import { getCourseAdminTokenCookie } from "../cookies/handleCookie";

// Normalize a token string so the Authorization header stays consistent.
const normalizeToken = (token?: string) =>
  token?.trim().replace(/^Bearer\s+/i, "");

// Create a dedicated singleton axios client for course-admin requests.
const axiosCourseClient: AxiosInstance = axios.create({
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

// Attach the latest course token before each request.
axiosCourseClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.headers.hasAuthorization()) return config;

    const tokenFromCookie = normalizeToken(getCourseAdminTokenCookie()?.token);
    if (!tokenFromCookie) return config;

    config.headers.setAuthorization(`Bearer ${tokenFromCookie}`);
    return config;
  },
);

// Retry once after forcing a Firebase token refresh when the backend returns 401.
axiosCourseClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
      throw error;
    }

    originalRequest._retry = true;
    const refreshedToken = normalizeToken(
      (await getFreshCourseAdminToken(true))?.token,
    );

    if (!refreshedToken) {
      throw error;
    }

    originalRequest.headers.setAuthorization(`Bearer ${refreshedToken}`);
    return axiosCourseClient.request(originalRequest);
  },
);

export default axiosCourseClient;
