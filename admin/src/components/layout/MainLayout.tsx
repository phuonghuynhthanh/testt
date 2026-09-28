import { useState } from "react";
import { Outlet } from "react-router-dom";
import useWindowDimensions from "../../hook/useWindowDimensions";
import HeaderMbl from "../header/HeaderBbl";
import Header from "../header/Header";
import Sidebar from "../sidebar";

const MainLayout = () => {
  const { width } = useWindowDimensions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = width < 1024;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="h-screen max-w-screen overflow-hidden bg-gray-th1">
      {" "}
      {/* Prevent body overflow */}
      <div className="w-full h-[85px]">
        {isMobile ? (
          <HeaderMbl
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        ) : (
          <Header />
        )}
      </div>
      <div className="h-[calc(100vh-85px)] w-full relative flex">
        {/* Mobile Overlay */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed top-[85px] left-0 right-0 bottom-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <div
          className={`
          ${
            isMobile
              ? `fixed top-[85px] left-0 h-[calc(100vh-85px)] z-50 transform transition-transform duration-300 ease-in-out ${
                  isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : "relative"
          }
        `}
        >
          <Sidebar onClose={isMobile ? closeSidebar : undefined} />
        </div>

        {/* Main Content */}
        <div
          className={`
          flex-grow overflow-y-auto bg-primary-black border border-primary-white/60
          ${isMobile ? "ml-0 p-4" : "ml-6 p-10"}
        `}
        >
          <div className="h-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
