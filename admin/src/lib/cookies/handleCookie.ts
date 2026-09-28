import Cookies from "universal-cookie";
import type { ICourseAdminCookie, IUserCookie } from "../../types/User";

const cookies = new Cookies();

/**
 * Stores Google login data in cookies.
 */
export const setGoogleLoginCookies = (userData: IUserCookie): void => {
  cookies.set("userToken", userData, { path: "/", maxAge: 30 * 24 * 60 * 60 });
};

/**
 * Retrieves Google login data from cookies.
 */
export const getGoogleLoginCookies = (): IUserCookie | null => {
  const cookiesResult = cookies.get("userToken");
  return cookiesResult || null;
};

/**
 * Deletes Google login cookies.
 */
export const deleteGoogleLoginCookies = (): void => {
  cookies.remove("userToken", { path: "/" });
};

// Stores course admin token separately from the main admin session.
export const setCourseAdminTokenCookie = (
  courseAdminData: ICourseAdminCookie,
): void => {
  cookies.set("admin_course_token", courseAdminData, {
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
};

// Retrieves the course admin token used by course-related pages.
export const getCourseAdminTokenCookie = (): ICourseAdminCookie | null => {
  const cookiesResult = cookies.get("admin_course_token");
  return cookiesResult || null;
};

// Deletes the course admin token without affecting the main admin session.
export const deleteCourseAdminTokenCookie = (): void => {
  cookies.remove("admin_course_token", { path: "/" });
};
