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
        title="Đăng xuất"
        aria-label="Đăng xuất"
        className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-content-secondary hover:border-rose-900/30 hover:bg-rose-950/20 hover:text-rose-400 transition-colors duration-200 group"
      >
        <RiLogoutBoxRFill className="text-content-muted group-hover:text-rose-400 transition-colors" size={18} />
        <span>Đăng xuất</span>
      </button>
    </div>
  );
};

export default Logout;
