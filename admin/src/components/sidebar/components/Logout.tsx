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
    <div onClick={handleLogout}>
      <hr />
      <div className="grow transition-all duration-300 ease-in-out bg-transparent flex gap-2 hover:text-red-500 justify-start items-center h-10 hover:cursor-pointer hover:bg-gray-hover rounded-lg">
        <span className="font-semibold">Đăng xuất</span>
        <RiLogoutBoxRFill className="shrink-0 fill-current " size={18} />
      </div>
    </div>
  );
};

export default Logout;
