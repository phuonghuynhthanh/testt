import React from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { CircleNotch } from "@phosphor-icons/react";
import { assets } from "../../assets/assets";
import { handleLogin } from "../../services/user/handleAuth.";
import { setAuthSession } from "../../lib/cookies/handleCookie";

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
    <div className="grid min-h-[100dvh] place-items-center px-4 py-12 bg-surface-base text-content-primary">
      <div className="view-in flex w-full max-w-md flex-col items-center">
        <img
          src={assets.logoVietQuant}
          alt="VietQuant"
          className="mb-8 h-16 w-auto object-contain"
        />

        <div className="bezel w-full">
          <div className="bezel-core p-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                Đăng nhập hệ thống
              </h1>
              <p className="mt-1.5 text-sm text-content-muted">
                Hệ thống quản trị nội dung CMS VietQuant
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="username"
                  className="label !text-sm"
                >
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  id="username"
                  {...register("username", { required: "Tên đăng nhập là bắt buộc" })}
                  className={`inp ${errors.username ? "err" : ""}`}
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                />
                {errors.username && (
                  <span className="text-rose-400 text-xs mt-1 block">
                    {errors.username.message}
                  </span>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="label !text-sm"
                >
                  Mật khẩu
                </label>
                <input
                  type="password"
                  id="password"
                  {...register("password", { required: "Mật khẩu là bắt buộc" })}
                  className={`inp ${errors.password ? "err" : ""}`}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <span className="text-rose-400 text-xs mt-1 block">
                    {errors.password.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary lg w-full"
              >
                {isSubmitting && <CircleNotch size={16} className="animate-spin" />}
                <span>{isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
