import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";

import { auth } from "../../config/firebaseConfig";
import {
  getCourseAdminTokenCookie,
  setCourseAdminTokenCookie,
} from "../../lib/cookies/handleCookie";

interface ICourseAdminLoginResponse {
  token: string;
}

// Wait for Firebase to restore the persisted user before reading its token.
const waitForFirebaseUser = (): Promise<User | null> =>
  new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

// Refresh the current course-admin token and persist it back to the course cookie.
export const getFreshCourseAdminToken = async (
  forceRefresh = false,
): Promise<ICourseAdminLoginResponse | null> => {
  const firebaseUser = auth.currentUser || (await waitForFirebaseUser());
  if (!firebaseUser) return null;

  const freshToken = await firebaseUser.getIdToken(forceRefresh);
  const cookieEmail =
    getCourseAdminTokenCookie()?.email || firebaseUser.email || "";
  setCourseAdminTokenCookie({ token: freshToken, email: cookieEmail });
  return { token: freshToken };
};

// Sign in the course-admin Firebase account and return its ID token.
export const loginCourseAdmin = async (
  email: string,
  password: string,
): Promise<ICourseAdminLoginResponse> => {
  const trimmedEmail = email.trim();

  if (!trimmedEmail || !password) {
    throw new Error("Email and password are required");
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      trimmedEmail,
      password,
    );
    const token = await userCredential.user.getIdToken();
    return { token };
  } catch {
    throw new Error("Unable to login course admin");
  }
};
