import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { List, CaretRight, SignOut } from "@phosphor-icons/react";
import { getAdminProfile } from "../../services/user/handleAuth.";
import { useLogout } from "../../hook/useLogout";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

interface CrumbItem {
  label: string;
  to?: string;
}

const getBreadcrumbs = (pathname: string): CrumbItem[] => {
  if (pathname === "/blog/create-blog") {
    return [{ label: "Quản lý bài viết", to: "/blog" }, { label: "Tạo bài viết" }];
  }
  if (pathname.startsWith("/blog/default/")) {
    return [{ label: "Quản lý bài viết", to: "/blog" }, { label: "Cập nhật bài viết" }];
  }
  if (pathname.startsWith("/blog/detail/")) {
    return [{ label: "Quản lý bài viết", to: "/blog" }, { label: "Chi tiết bài viết" }];
  }
  if (pathname === "/blog/research") {
    return [{ label: "Nội dung", to: "/blog" }, { label: "Tìm nguồn tham khảo" }];
  }
  if (pathname === "/blog/preview") {
    return [{ label: "Quản lý bài viết", to: "/blog" }, { label: "Xem như công khai" }];
  }
  if (pathname === "/blog") {
    return [{ label: "Nội dung" }, { label: "Quản lý bài viết" }];
  }
  if (pathname === "/categories") {
    return [{ label: "Nội dung", to: "/blog" }, { label: "Danh mục" }];
  }
  if (pathname.startsWith("/publications/")) {
    return [{ label: "Xuất bản", to: "/publications" }, { label: "Cấu hình xuất bản" }];
  }
  if (pathname === "/publications") {
    return [{ label: "Phân phối" }, { label: "Xuất bản bài viết" }];
  }
  if (pathname === "/linkedin/new") {
    return [{ label: "Quản lý LinkedIn", to: "/linkedin" }, { label: "Tạo bài đăng" }];
  }
  if (pathname.startsWith("/linkedin/posts/")) {
    return [{ label: "Quản lý LinkedIn", to: "/linkedin" }, { label: "Chi tiết bài đăng" }];
  }
  if (pathname === "/linkedin") {
    return [{ label: "Phân phối" }, { label: "Quản lý LinkedIn" }];
  }
  return [{ label: "Hệ thống" }, { label: "VietQuant Admin" }];
};

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const profile = useQuery({ queryKey: ["admin-profile"], queryFn: getAdminProfile, staleTime: 5 * 60_000 });
  const displayName = profile.data?.name || profile.data?.username || "Quản trị viên";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "AD";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const crumbs = getBreadcrumbs(location.pathname);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = useLogout();

  return (
    <header className="top justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="ib lg:hidden"
          aria-label="Mở menu"
        >
          <List size={20} weight="light" />
        </button>

        <nav aria-label="Breadcrumb" className="crumb">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <CaretRight size={12} weight="light" aria-hidden="true" />}
              {i === crumbs.length - 1 ? (
                <b className="truncate">{c.label}</b>
              ) : c.to ? (
                <Link to={c.to} className="hover:text-content-primary transition-colors truncate">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="top-r">
                <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="avatar"
            aria-label="Menu tài khoản"
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="pop-in absolute right-0 top-10 z-50 w-52 rounded-lg border border-surface-border bg-surface-card p-1.5 shadow-2xl shadow-black/50">
              <div className="px-3 py-2 border-b border-surface-border mb-1">
                <p className="text-xs font-semibold text-content-primary truncate">{displayName}</p>
                <p className="text-[11px] text-content-muted truncate">{profile.data?.email ?? ""}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs font-medium text-content-secondary hover:bg-rose-950/20 hover:text-rose-400 transition-colors"
              >
                <SignOut size={14} weight="light" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
