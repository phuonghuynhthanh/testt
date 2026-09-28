import { RiLogoutBoxRFill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteGoogleLoginCookies } from "../../../lib/cookies/handleCookie";

const Logout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      deleteGoogleLoginCookies();
      toast.success("Logout successful");
      navigate("/login");
    } catch {
      toast.error("Something went wrong. Please try again later.");
    }
  };
  return (
    <div onClick={handleLogout}>
      <hr />
      <div className="grow transition-all duration-300 ease-in-out bg-transparent flex gap-2 hover:text-red-500 justify-start items-center h-10 hover:cursor-pointer hover:bg-gray-hover rounded-lg">
        <span className="font-semibold">Logout</span>
        <RiLogoutBoxRFill className="shrink-0 fill-current " size={18} />
      </div>
    </div>
  );
};

export default Logout;
