import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearAuthSession } from "../lib/cookies/handleCookie";
import { handleLogoutRequest } from "../services/user/handleAuth.";

// Notify the backend, then drop the local session and return to the login page.
export const useLogout = () => {
  const navigate = useNavigate();
  return async () => {
    try {
      await handleLogoutRequest();
    } catch {
      // A failed request must not keep the user signed in locally.
    }
    clearAuthSession();
    toast.success("Đăng xuất thành công");
    navigate("/login");
  };
};
