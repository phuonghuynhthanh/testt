import React from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";
import { handleLogin } from "../../services/user/handleAuth.";
import { setAuthSession } from "../../lib/cookies/handleCookie";

interface LoginFormInputs {
  username: string;
  password: string;
}

// Render the standalone CMS administrator login form with dark theme aesthetics.
const Login: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Exchange administrator credentials for the backend-issued CMS session.
  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const res = await handleLogin(data.username, data.password);
      setAuthSession({
        accessToken: res.access_token,
        expiresAt: Date.now() + res.expires_in * 1000,
      });
      toast.success("Đăng nhập thành công");
      navigate(from, { replace: true });
    } catch {
      toast.error("Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-surface-base px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        <img
          src={assets.logoVnBrokersText}
          alt="Vietnam Business Brokers"
          className="h-20 w-auto mb-8 object-contain"
        />

        <div className="w-full bg-surface-card p-8 rounded-2xl shadow-2xl border border-surface-border">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-content-primary">
              Đăng nhập hệ thống
            </h1>
            <p className="text-sm text-content-muted mt-1.5">
              Hệ thống quản trị nội dung CMS Quant-VN
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-content-secondary mb-1.5"
              >
                Tên đăng nhập
              </label>
              <input
                type="text"
                id="username"
                {...register("username", { required: "Tên đăng nhập là bắt buộc" })}
                className={`w-full rounded-lg border ${
                  errors.username
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-surface-border focus:border-primary-green focus:ring-primary-green"
                } bg-surface-elevated px-3.5 py-2.5 text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-1 transition`}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                aria-invalid={!!errors.username}
              />
              {errors.username && (
                <span className="text-rose-400 text-xs mt-1.5 block">
                  {errors.username.message}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-content-secondary mb-1.5"
              >
                Mật khẩu
              </label>
              <input
                type="password"
                id="password"
                {...register("password", { required: "Mật khẩu là bắt buộc" })}
                className={`w-full rounded-lg border ${
                  errors.password
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-surface-border focus:border-primary-green focus:ring-primary-green"
                } bg-surface-elevated px-3.5 py-2.5 text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-1 transition`}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <span className="text-rose-400 text-xs mt-1.5 block">
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary-green text-primary-black font-semibold py-2.5 px-4 rounded-lg hover:bg-primary-green-dark focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 focus:ring-offset-surface-card disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {isSubmitting && (
                <svg
                  className="h-4 w-4 animate-spin text-primary-black"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              )}
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
