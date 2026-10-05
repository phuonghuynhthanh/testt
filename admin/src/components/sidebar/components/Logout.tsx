import React from "react";
import { SignOut } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearAuthSession } from "../../../lib/cookies/handleCookie";

const Logout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      clearAuthSession();
      toast.success("Đăng xuất thành công");
      navigate("/login");
    } catch {
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại sau.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="Đăng xuất"
      aria-label="Đăng xuất"
      className="btn btn-ghost w-full justify-start text-content-secondary hover:text-rose-400 hover:border-rose-900/40"
    >
      <SignOut size={16} weight="light" className="shrink-0" />
      <span>Đăng xuất</span>
    </button>
  );
};

export default Logout;
