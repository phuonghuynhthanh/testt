import React from "react";
import { SignOut } from "@phosphor-icons/react";
import { useLogout } from "../../../hook/useLogout";

// Render the sidebar sign-out button.
const Logout: React.FC = () => {
  const handleLogout = useLogout();

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
