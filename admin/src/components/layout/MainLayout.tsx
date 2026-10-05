import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import useWindowDimensions from "../../hook/useWindowDimensions";
import HeaderMbl from "../header/HeaderBbl";
import Header from "../header/Header";
import Sidebar from "../sidebar";
import { BottomActionHostContext } from "../../shared/ui/BottomActionHostContext";

// Render the primary administrative layout shell with responsive sidebar and header.
const MainLayout: React.FC = () => {
  const { width } = useWindowDimensions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [actionHost, setActionHost] = useState<HTMLDivElement | null>(null);
  const isMobile = width < 1024;

  // Toggle mobile sidebar drawer visibility.
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Close mobile sidebar drawer upon backdrop click or route change.
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-base text-content-primary flex flex-col">
      <header className="h-16 w-full shrink-0 z-30">
        {isMobile ? (
          <HeaderMbl
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
        ) : (
          <Header />
        )}
      </header>

      <div className="flex-1 min-h-0 w-full relative flex">
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        <div
          className={`
            ${
              isMobile
                ? `fixed top-16 left-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                  }`
                : "relative shrink-0 h-full"
            }
          `}
        >
          <Sidebar onClose={isMobile ? closeSidebar : undefined} />
        </div>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-base">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 [scrollbar-gutter:stable]">
            <div className="mx-auto w-full max-w-7xl">
              <BottomActionHostContext.Provider value={actionHost}><Outlet /></BottomActionHostContext.Provider>
            </div>
          </div>
          <div ref={setActionHost} className="pointer-events-none absolute inset-x-0 bottom-4 z-30 px-4 sm:px-6 lg:px-8 [scrollbar-gutter:stable] overflow-y-auto" />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
