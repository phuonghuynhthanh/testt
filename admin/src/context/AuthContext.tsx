// import {
//   createUserWithEmailAndPassword,
//   GoogleAuthProvider,
//   onAuthStateChanged,
//   onIdTokenChanged,
//   signInWithEmailAndPassword,
//   signInWithPopup,
//   signOut,
//   type User,
//   type UserCredential,
// } from "firebase/auth";
// import { createContext, useContext, useEffect, useRef, useState } from "react";
// import { toast } from "react-toastify";
// import { FirebaseError } from "firebase/app";
// import { auth } from "../config/firebaseConfig";
// import type { IUserCookie } from "../types/User";
// import {
//   deleteGoogleLoginCookies,
//   setGoogleLoginCookies,
// } from "../lib/cookies/handleCookie";

// interface AuthContextType {
//   signInWithGoogle: () => Promise<UserCredential>;
//   signInAuth: (email: string, password: string) => Promise<UserCredential>;
//   signUpAuth: (email: string, password: string) => Promise<UserCredential>;
//   logOut: () => Promise<void>;
//   user: User | null;
// }

// const AuthContext = createContext<AuthContextType | null>(null);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context)
//     throw new Error("useAuth must be used within an AuthContextProvider");
//   return context;
// };

// interface AuthContextProviderProps {
//   children: React.ReactNode;
// }

// export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
//   const [loading, setLoading] = useState<boolean>(true);
//   const [user, setUser] = useState<User | null>(null);
//   const initialized = useRef(false);
//   useEffect(() => {
//     const handleUser = async (u: User | null) => {
//       if (u) {
//         try {
//           const token = await u.getIdToken();
//           const userTokenCookies: IUserCookie = { token: token, roles: [] };
//           setGoogleLoginCookies(userTokenCookies);
//         } catch {
//           // nếu getIdToken lỗi thì vẫn setUser
//         }
//         setUser(u);
//       } else {
//         setUser(null);
//         deleteGoogleLoginCookies();
//       }

//       // chỉ tắt loading ở lần callback đầu tiên
//       if (!initialized.current) {
//         initialized.current = true;
//         setLoading(false);
//       }
//     };

//     const unsubscribeAuth = onAuthStateChanged(auth, handleUser);
//     const unsubscribeToken = onIdTokenChanged(auth, handleUser);

//     return () => {
//       unsubscribeAuth();
//       unsubscribeToken();
//     };
//   }, []);

//   const signInWithGoogle = async () => {
//     return signInWithPopup(auth, new GoogleAuthProvider());
//   };

//   const signInAuth = async (email: string, password: string) => {
//     try {
//       return await signInWithEmailAndPassword(auth, email, password);
//     } catch (error) {
//       handleFirebaseError(error);
//       throw error;
//     }
//   };

//   const signUpAuth = async (email: string, password: string) => {
//     try {
//       return await createUserWithEmailAndPassword(auth, email, password);
//     } catch (error) {
//       handleFirebaseError(error);
//       throw error;
//     }
//   };

//   const logOut = async () => {
//     localStorage.clear();
//     sessionStorage.clear();
//     deleteGoogleLoginCookies();
//     await signOut(auth);
//   };

//   const handleFirebaseError = (error: unknown) => {
//     if (error instanceof FirebaseError) {
//       switch (error.code) {
//         case "auth/email-already-in-use":
//           toast.error("This email is already in use.");
//           break;
//         case "auth/weak-password":
//           toast.error("Password is too weak, please choose a stronger one.");
//           break;
//         case "auth/invalid-email":
//           toast.error("Invalid email, please check again.");
//           break;
//         case "auth/user-not-found":
//           toast.error("No user found with this email.");
//           break;
//         case "auth/wrong-password":
//           toast.error("Incorrect password, please try again.");
//           break;
//         case "auth/too-many-requests":
//           toast.error(
//             "Too many failed login attempts, please try again later."
//           );
//           break;
//         case "auth/operation-not-allowed":
//           toast.error("This account has been disabled.");
//           break;
//         case "auth/missing-password":
//           toast.error("Please enter a password.");
//           break;
//         default:
//           toast.error("Login failed, please try again.");
//       }
//     } else {
//       toast.error("An unexpected error occurred. Please try again.");
//     }
//   };

//   return (
//     <AuthContext.Provider
//       value={{ logOut, signInWithGoogle, signInAuth, signUpAuth, user }}
//     >
//       {loading ? null : children}
//     </AuthContext.Provider>
//   );
// };
