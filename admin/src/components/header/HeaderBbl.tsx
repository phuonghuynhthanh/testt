import { HiMenuAlt3, HiX } from "react-icons/hi";
import { assets } from "../../assets/assets";

interface HeaderMblProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

// Render the mobile header with accessible hamburger toggle button and brand logo.
const HeaderMbl = ({ onToggleSidebar, isSidebarOpen }: HeaderMblProps) => {
  return (
    <div className="h-full w-full flex items-center justify-between bg-surface-base border-b border-surface-border px-4 relative">
      {/* Hamburger Menu Button - Left */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-content-primary hover:text-white hover:bg-surface-elevated transition-colors duration-200 z-10 focus:outline-none focus:ring-2 focus:ring-primary-green"
        title={isSidebarOpen ? "Đóng menu" : "Mở menu"}
        aria-label={isSidebarOpen ? "Đóng menu" : "Mở menu"}
      >
        {isSidebarOpen ? (
          <HiX className="text-2xl text-content-primary" />
        ) : (
          <HiMenuAlt3 className="text-2xl text-content-primary" />
        )}
        <span>{isSidebarOpen ? "Đóng menu" : "Mở menu"}</span>
      </button>

      {/* Logo - Center */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
        <img
          src={assets.logoVietQuant}
          alt="VietQuant"
          className="h-12 w-auto"
        />
      </div>

      {/* Spacer for balance */}
      <div className="w-10"></div>
    </div>
  );
};

export default HeaderMbl;
