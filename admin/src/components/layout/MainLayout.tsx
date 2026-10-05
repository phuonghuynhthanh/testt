import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import useWindowDimensions from "../../hook/useWindowDimensions";
import Header from "../header/Header";
import Sidebar from "../sidebar";
import { BottomActionHostContext } from "../../shared/ui/BottomActionHostContext";

const MainLayout: React.FC = () => {
  const { width } = useWindowDimensions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [actionHost, setActionHost] = useState<HTMLDivElement | null>(null);
  const isMobile = width < 1024;

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-primary lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Mobile Backdrop Scrim */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(2,6,23,0.6)] backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop sticky / Mobile drawer) */}
      <div
        className={
          isMobile
            ? `fixed inset-y-0 left-0 z-50 w-[264px] transform transition-transform duration-200 ease-out ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : "sticky top-0 h-dvh z-40"
        }
      >
        <Sidebar onClose={isMobile ? closeSidebar : undefined} />
      </div>

      {/* Main Content Area */}
      <div className="min-w-0 flex flex-col flex-1 min-h-screen">
        <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        <main className="flex-1 w-full max-w-[1480px] mx-auto p-4 sm:p-6 lg:px-7 lg:py-6 lg:pb-12">
          <BottomActionHostContext.Provider value={actionHost}>
            <Outlet />
          </BottomActionHostContext.Provider>
        </main>

        <div
          ref={setActionHost}
          className="pointer-events-none sticky bottom-4 z-30 px-4 sm:px-6 lg:px-7 max-w-[1480px] w-full mx-auto overflow-y-auto"
        />
      </div>
    </div>
  );
};

export default MainLayout;
