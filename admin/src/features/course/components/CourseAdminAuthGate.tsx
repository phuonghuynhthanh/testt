import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { FiLock, FiLogOut } from "react-icons/fi";
import { toast } from "react-toastify";

import {
  deleteCourseAdminTokenCookie,
  getCourseAdminTokenCookie,
  setCourseAdminTokenCookie,
} from "../../../lib/cookies/handleCookie";
import {
  getFreshCourseAdminToken,
  loginCourseAdmin,
} from "../../../services/course/courseAuth";

interface CourseAdminAuthGateProps {
  children: (
    token: string,
    actions: { logout: () => void; email: string },
  ) => ReactNode;
}

// Require a dedicated course-admin login before rendering course features.
const CourseAdminAuthGate = ({ children }: CourseAdminAuthGateProps) => {
  const [courseAdminCookie, setCourseAdminCookie] = useState(() =>
    getCourseAdminTokenCookie(),
  );
  const [email, setEmail] = useState(courseAdminCookie?.email || "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refresh persisted Firebase ID token when the course gate restores from cookie.
  useEffect(() => {
    if (!courseAdminCookie?.token) return;
    let isMounted = true;

    getFreshCourseAdminToken()
      .then((response) => {
        if (!isMounted || !response?.token) return;
        const nextCookie = {
          token: response.token,
          email: courseAdminCookie.email,
        };
        setCourseAdminTokenCookie(nextCookie);
        setCourseAdminCookie(nextCookie);
      })
      .catch(() => {
        // Keep the existing cookie so the request layer can still retry with fallback token.
      });

    return () => {
      isMounted = false;
    };
  }, [courseAdminCookie?.email, courseAdminCookie?.token]);

  // Submit email/password to fetch and persist the course admin token.
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await loginCourseAdmin(email, password);
      const nextCookie = {
        token: response.token,
        email: email.trim(),
      };
      setCourseAdminTokenCookie(nextCookie);
      setCourseAdminCookie(nextCookie);
      setPassword("");
      toast.success("Course admin login successful.");
    } catch {
      toast.error("Unable to login course admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear only the course-admin token and return to the login popup.
  const handleLogout = () => {
    deleteCourseAdminTokenCookie();
    setCourseAdminCookie(null);
    setPassword("");
    toast.info("Course admin token cleared.");
  };

  if (courseAdminCookie?.token) {
    return (
      <>
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-white/15 bg-primary-black-light p-4 text-primary-white md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-primary-white/55">
              Course admin session
            </p>
            <p className="font-medium">{courseAdminCookie.email}</p>
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-primary-white/80 hover:border-red-400 hover:text-red-300"
            onClick={handleLogout}
          >
            <FiLogOut />
            Logout course
          </button>
        </div>
        {children(courseAdminCookie.token, {
          logout: handleLogout,
          email: courseAdminCookie.email,
        })}
      </>
    );
  }

  return (
    <div className="relative min-h-[70vh]">
      <div className="absolute inset-0 rounded-lg border border-white/10 bg-primary-black-light/50" />
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary-black/80 px-4 backdrop-blur-sm">
        <form
          className="w-full max-w-md rounded-lg border border-white/15 bg-primary-black-light p-6 shadow-2xl"
          onSubmit={handleLogin}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg border border-primary-green/25 bg-primary-green/10 p-3 text-primary-green">
              <FiLock className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary-white">
                Course Admin Login
              </h2>
              <p className="mt-1 text-sm text-primary-white/55">
                Use the Firebase course account to continue.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-primary-white">
                Email
              </span>
              <input
                type="email"
                className="rounded-md border border-gray-500 bg-primary-black-medium px-3 py-2 text-primary-white outline-none placeholder:text-primary-white/35 focus:border-primary-green"
                value={email}
                placeholder="course-admin@example.com"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-primary-white">
                Password
              </span>
              <input
                type="password"
                className="rounded-md border border-gray-500 bg-primary-black-medium px-3 py-2 text-primary-white outline-none placeholder:text-primary-white/35 focus:border-primary-green"
                value={password}
                placeholder="Enter course password"
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-md bg-primary-green px-4 py-2 font-semibold text-primary-black hover:bg-primary-green-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CourseAdminAuthGate;
