import React from "react";
import { NavLink } from "react-router-dom";
import {
  Article,
  PlusCircle,
  Binoculars,
  Eye,
  Tag,
  PaperPlaneTilt,
  LinkedinLogo,
  X,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Logout from "./components/Logout";
import { getBlogCounts } from "../../services/blog/handleBlog";

interface SidebarProps {
  onClose?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const contentItems: NavItem[] = [
    { to: "/blog", label: "Quản lý bài viết", icon: <Article size={18} weight="light" className="shrink-0" />, end: true },
    { to: "/blog/create-blog", label: "Tạo bài viết", icon: <PlusCircle size={18} weight="light" className="shrink-0" /> },
    { to: "/blog/research", label: "Tìm nguồn tham khảo", icon: <Binoculars size={18} weight="light" className="shrink-0" /> },
    { to: "/blog/preview", label: "Xem như công khai", icon: <Eye size={18} weight="light" className="shrink-0" /> },
    { to: "/categories", label: "Danh mục", icon: <Tag size={18} weight="light" className="shrink-0" /> },
  ];

  const distributionItems: NavItem[] = [
    { to: "/publications", label: "Xuất bản bài viết", icon: <PaperPlaneTilt size={18} weight="light" className="shrink-0" /> },
    { to: "/linkedin", label: "Quản lý LinkedIn", icon: <LinkedinLogo size={18} weight="light" className="shrink-0" /> },
  ];

  // Render one navigation link; the active state comes from aria-current via NavLink.
  // Unfiltered counts feed the pending badge; invalidated with every ["blogs"] mutation.
  const counts = useQuery({ queryKey: ["blogs", "counts", "sidebar"], queryFn: () => getBlogCounts(), staleTime: 30_000 });
  const pending = counts.data?.PENDING ?? 0;

  const renderNavLink = (item: NavItem) => (
    <NavLink key={item.to} to={item.to} end={item.end} onClick={() => onClose?.()}>
      {item.icon}
      <span className="flex-1 truncate">{item.label}</span>
      {item.to === "/blog" && pending > 0 && <span className="count mono">{pending}</span>}
    </NavLink>
  );

  return (
    <aside className="side flex h-full w-[232px] flex-col border-r border-surface-border bg-surface-base">
      <div className="brand shrink-0">
        <span className="brand-mark" aria-hidden="true">VQ</span>
        <div>
          <b>VietQuant</b>
          <small>Admin</small>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="ib ml-auto lg:hidden" aria-label="Đóng menu">
            <X size={18} weight="light" />
          </button>
        )}
      </div>

      <nav className="nav" aria-label="Điều hướng chính">
        <div className="nav-g">Nội dung</div>
        {contentItems.map(renderNavLink)}
        <div className="nav-g">Phân phối</div>
        {distributionItems.map(renderNavLink)}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-surface-border p-3">
        <div className="side-foot !border-0 !p-0">
          <span className="dot" aria-hidden="true" />
          <span>VietQuant CMS</span>
        </div>
        <Logout />
      </div>
    </aside>
  );
};

export default Sidebar;
