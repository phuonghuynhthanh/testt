import { HiMenuAlt3, HiX } from "react-icons/hi";
import { assets } from "../../assets/assets";

interface HeaderMblProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const HeaderMbl = ({ onToggleSidebar, isSidebarOpen }: HeaderMblProps) => {
  return (
    <div className="h-full w-full flex items-center justify-between bg-primary-black px-4 relative">
      {/* Hamburger Menu Button - Left */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 z-10"
        aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
      >
        {isSidebarOpen ? (
          <HiX className="text-2xl text-gray-700" />
        ) : (
          <HiMenuAlt3 className="text-2xl text-gray-700" />
        )}
      </button>

      {/* Logo - Center */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
        <img
          src={assets.logoVnBrokersText}
          alt="Vietnam Business Brokers"
          className="h-12 w-auto"
        />
      </div>

      {/* Spacer for balance */}
      <div className="w-10"></div>
    </div>
  );
};

export default HeaderMbl;
