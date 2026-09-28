import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";

export const waitForUser = (): Promise<User | null> =>
  new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

export const getFreshToken = async () => {
  const user = await waitForUser();
  if (!user) return null;
  return await user.getIdToken();
};
