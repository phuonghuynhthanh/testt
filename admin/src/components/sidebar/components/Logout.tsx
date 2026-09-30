import { RiLogoutBoxRFill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearAuthSession } from "../../../lib/cookies/handleCookie";

// Render the sidebar action that closes the current CMS session.
const Logout = () => {
  const navigate = useNavigate();

  // End the local CMS session and return to the public login screen.
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
    <div className="pt-3 border-t border-surface-border">
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-content-secondary hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-colors duration-200 group text-sm font-medium"
      >
        <span>Đăng xuất</span>
        <RiLogoutBoxRFill className="text-content-muted group-hover:text-rose-400 transition-colors" size={18} />
      </button>
    </div>
  );
};

export default Logout;
