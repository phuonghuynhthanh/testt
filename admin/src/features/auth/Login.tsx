import React from "react";
import { useForm } from "react-hook-form";
import { assets } from "../../assets/assets";

import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { handleLogin } from "../../services/user/handleAuth.";
import type { IUserCookie } from "../../types/User";
import { setGoogleLoginCookies } from "../../lib/cookies/handleCookie";

interface LoginFormInputs {
  username: string;
  password: string;
}
const Login: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const res = await handleLogin(data.username, data.password);
      const userTokenCookies: IUserCookie = {
        token: res.token,
        roles: res.roles,
      };
      setGoogleLoginCookies(userTokenCookies);
      toast.success("Login successful");
      navigate(from, { replace: true });
    } catch {
      toast.error("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-primary-black px-4">
      <img
        src={assets.logoVnBrokersText}
        alt="Vietnam Business Brokers"
        className="h-24 w-auto mb-8"
      />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm bg-blue-50 p-8 rounded-xl shadow-lg border border-blue-100"
      >
        <h1 className="text-2xl font-semibold text-center text-gray-900 mb-6">
          Welcome back
        </h1>

        <div className="mb-5">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-800"
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            {...register("username", { required: "Username is required" })}
            className={`mt-1 block w-full rounded-lg border ${
              errors.username ? "border-red-500" : "border-gray-300"
            } bg-primary-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
            placeholder="Enter your username"
            autoComplete="username"
            aria-invalid={!!errors.username}
          />
          {errors.username && (
            <span className="text-red-600 text-sm mt-1 block">
              {errors.username.message}
            </span>
          )}
        </div>

        <div className="mb-5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-800"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            {...register("password", { required: "Password is required" })}
            className={`mt-1 block w-full rounded-lg border ${
              errors.password ? "border-red-500" : "border-gray-300"
            } bg-primary-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <span className="text-red-600 text-sm mt-1 block">
              {errors.password.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {isSubmitting && (
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          )}
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default Login;
