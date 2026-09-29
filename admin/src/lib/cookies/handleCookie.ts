import Cookies from "universal-cookie";
import type { AuthSession } from "../../types/User";

const cookies = new Cookies();

/**
 * Stores the current CMS authentication session.
 */
export const setAuthSession = (session: AuthSession): void => {
  const maxAge = session.expiresAt
    ? Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000))
    : undefined;
  cookies.set("authSession", session, { path: "/", maxAge });
};

/**
 * Returns the current CMS session when it has not expired.
 */
export const getAuthSession = (): AuthSession | null => {
  const session = cookies.get("authSession") as AuthSession | undefined;
  if (!session || (session.expiresAt && session.expiresAt <= Date.now())) {
    if (session) clearAuthSession();
    return null;
  }
  return session;
};

/**
 * Clears the current CMS authentication session.
 */
export const clearAuthSession = (): void => {
  cookies.remove("authSession", { path: "/" });
};
