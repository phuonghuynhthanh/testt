import Cookies from "universal-cookie";
import type { IUserCookie } from "../../types/User";

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
