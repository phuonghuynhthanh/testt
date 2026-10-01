import React from "react";
import { NavLink } from "react-router-dom";
import { MdArticle, MdCategory } from "react-icons/md";
import { IoMdAddCircleOutline } from "react-icons/io";
import { FaLinkedin } from "react-icons/fa";
import { FiEye, FiSend } from "react-icons/fi";
import Logout from "./components/Logout";

interface SidebarProps {
  onClose?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

// Render navigation links with active indicators and grouped content sections.
const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  // Handle mobile drawer close on navigation.
  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const contentItems: NavItem[] = [
    { to: "/blog", label: "Quản lý bài viết", icon: <MdArticle className="text-lg shrink-0" />, end: true },
    { to: "/blog/create-blog", label: "Tạo bài viết", icon: <IoMdAddCircleOutline className="text-lg shrink-0" /> },
    { to: "/blog/preview", label: "Xem như công khai", icon: <FiEye className="text-lg shrink-0" /> },
    { to: "/categories", label: "Danh mục", icon: <MdCategory className="text-lg shrink-0" /> },
  ];

  const distributionItems: NavItem[] = [
    { to: "/publications", label: "Xuất bản bài viết", icon: <FiSend className="text-lg shrink-0" /> },
    { to: "/linkedin", label: "Quản lý LinkedIn", icon: <FaLinkedin className="text-lg shrink-0" /> },
  ];

  // Render a navigation link with consistent active styling and accessibility state.
  const renderNavLink = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={handleLinkClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? "bg-surface-elevated text-primary-green border border-primary-green/30 shadow-sm"
            : "text-content-secondary hover:text-content-primary hover:bg-surface-card border border-transparent"
        }`
      }
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </NavLink>
  );

  return (
    <aside className="h-full w-64 lg:w-60 bg-surface-card border-r border-surface-border flex flex-col p-4 shadow-xl">
      <div className="flex-1 space-y-6 overflow-y-auto">
        <div className="space-y-1.5">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-content-muted">
            Nội dung
          </p>
          <div className="space-y-1">
            {contentItems.map(renderNavLink)}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-content-muted">
            Phân phối
          </p>
          <div className="space-y-1">
            {distributionItems.map(renderNavLink)}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <Logout />
      </div>
    </aside>
  );
};

export default Sidebar;
